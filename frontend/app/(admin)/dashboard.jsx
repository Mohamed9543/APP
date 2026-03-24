import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AdminShell } from "../../components/AdminShell";
import { API_ENDPOINTS, apiFetch } from "../../config/api";
import { useLanguage } from "../../context/LanguageContext";

const COLORS = {
  green: "#22c55e",
  greenDark: "#16a34a",
  greenSoft: "#e8f8ed",
  blue: "#3b82f6",
  orange: "#f59e0b",
  text: "#111827",
  muted: "#6b7280",
  border: "#edf1f0",
  surface: "#ffffff",
};

// Locale map pour toLocaleDateString
const LOCALE_MAP = {
  fr: "fr-FR",
  en: "en-GB",
  ar: "ar-TN",
  tr: "tr-TR",
};

function formatNumber(value) {
  if (value == null) return "0";
  const num = Number(value);
  if (Number.isNaN(num)) return "0";
  return num.toLocaleString();
}

function formatDateShort(value, language) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    const locale = LOCALE_MAP[language] || "fr-FR";
    return date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date.toDateString();
  }
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AdminDashboard() {
  const { t, language, isRTL } = useLanguage();
  const [cultures, setCultures] = useState([]);
  const [irrigations, setIrrigations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Styles dynamiques selon la langue (RTL + arabe)
  const dynStyles = useMemo(() => ({
    // textTransform:"uppercase" et letterSpacing cassent le rendu arabe
    statLabel: isRTL
      ? { fontSize: 11, color: COLORS.muted, textAlign: "right" }
      : { fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.6 },
    legendRow: { marginTop: 8, alignItems: isRTL ? "flex-start" : "flex-end" },
    panelSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2, textAlign: isRTL ? "right" : "left" },
    panelTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text, textAlign: isRTL ? "right" : "left" },
    listRow: { flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" },
    statHeader: { flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-start", justifyContent: "space-between" },
  }), [isRTL]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [culturesRes, irrigationsRes] = await Promise.all([
        apiFetch(API_ENDPOINTS.cultures.base),
        apiFetch(API_ENDPOINTS.irrigations.base),
      ]);

      const culturesJson = await culturesRes.json();
      const irrigationsJson = await irrigationsRes.json();

      if (culturesRes.ok && culturesJson.success) {
        setCultures(culturesJson.data || []);
      }
      if (irrigationsRes.ok && irrigationsJson.success) {
        setIrrigations(irrigationsJson.data || []);
      }
    } catch (error) {
      Alert.alert(t("common.error"), error?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalCultures = cultures.length;
  const totalIrrigations = irrigations.length;
  const totalVolumeLiters = irrigations.reduce(
    (sum, item) => sum + (Number(item.volume) || 0),
    0,
  );
  const totalVolumeM3 = totalVolumeLiters / 1000;

  const todayStats = useMemo(() => {
    const today = new Date();
    const todays = irrigations.filter((item) => {
      const date = new Date(item.date);
      return !Number.isNaN(date.getTime()) && isSameDay(date, today);
    });
    return {
      count: todays.length,
      volume: todays.reduce((sum, item) => sum + (Number(item.volume) || 0), 0),
      list: todays.slice(0, 3),
    };
  }, [irrigations]);

  const recentIrrigations = irrigations.slice(0, 4);

  const chartSeries = useMemo(() => {
    const days = 14;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1));

    const map = new Map();
    irrigations.forEach((item) => {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + (Number(item.volume) || 0));
    });

    return Array.from({ length: days }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      return {
        label: String(date.getDate()).padStart(2, "0"),
        value: map.get(key) || 0,
      };
    });
  }, [irrigations]);

  const maxChartValue = Math.max(1, ...chartSeries.map((item) => item.value));

  return (
    <AdminShell
      activeKey="dashboard"
      title={t("admin.navDashboard")}
      onRefresh={loadDashboard}
      loading={loading}
    >
      {/* ── Cartes stats ── */}
      <View style={styles.statRow}>
        {[
          {
            label: t("admin.cardCultures"),
            value: formatNumber(totalCultures),
            bg: "#e9f7ef",
            icon: <MaterialCommunityIcons name="sprout" size={20} color={COLORS.greenDark} />,
          },
          {
            label: t("admin.cardIrrigations"),
            value: formatNumber(totalIrrigations),
            bg: "#eaf2ff",
            icon: <Ionicons name="water-outline" size={20} color={COLORS.blue} />,
          },
          {
            label: t("admin.cardVolumeTotal"),
            value: `${totalVolumeM3.toFixed(2)} m³`,
            bg: "#fff3e0",
            icon: <Ionicons name="stats-chart" size={20} color={COLORS.orange} />,
          },
        ].map((card, i) => (
          <View key={i} style={styles.statCard}>
            <View style={dynStyles.statHeader}>
              <Text style={dynStyles.statLabel}>{card.label}</Text>
              <View style={[styles.iconBadge, { backgroundColor: card.bg }]}>
                {card.icon}
              </View>
            </View>
            <Text style={styles.statValue}>{card.value}</Text>
          </View>
        ))}
      </View>

      {/* ── Irrigations récentes ── */}
      <View style={styles.panel}>
        <Text style={dynStyles.panelTitle}>{t("admin.recentIrrigations")}</Text>
        <Text style={dynStyles.panelSubtitle}>
          {todayStats.count} {t("admin.irrigationsCount")} •{" "}
          {Math.round(todayStats.volume)} L
        </Text>

        {todayStats.count === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{t("admin.noIrrigationsToday")}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {todayStats.list.map((item) => (
              <View key={item._id} style={dynStyles.listRow}>
                <View>
                  <Text style={styles.listTitle}>{item.nom}</Text>
                  <Text style={styles.listSub}>
                    {formatDateShort(item.date, language)}
                  </Text>
                </View>
                <Text style={styles.listValue}>
                  {Math.round(item.volume)} L
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Graphique volume ── */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={dynStyles.panelTitle}>{t("admin.chartVolumeTitle")}</Text>
          <Text style={dynStyles.panelSubtitle}>
            14 {t("admin.lastDays")} (L)
          </Text>
        </View>

        <View style={styles.chart}>
          {chartSeries.map((item, index) => {
            const height = 12 + (item.value / maxChartValue) * 64;
            return (
              <View key={`${item.label}-${index}`} style={styles.chartItem}>
                <View style={[styles.chartBar, { height }]} />
                {index % 3 === 0 ? (
                  <Text style={styles.chartLabel}>{item.label}</Text>
                ) : (
                  <Text style={styles.chartLabelMuted}> </Text>
                )}
              </View>
            );
          })}
        </View>

        {recentIrrigations.length > 0 && (
          <View style={dynStyles.legendRow}>
            <Text style={styles.legendText}>
              {t("admin.recentIrrigations")} • {recentIrrigations.length}
            </Text>
          </View>
        )}
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  panelHeader: {
    marginBottom: 10,
  },
  emptyWrap: {
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  list: {
    marginTop: 10,
    gap: 12,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  listSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  listValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.greenDark,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 4,
  },
  chartItem: {
    alignItems: "center",
    flex: 1,
  },
  chartBar: {
    width: 8,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },
  chartLabel: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 6,
  },
  chartLabelMuted: {
    fontSize: 10,
    color: "transparent",
    marginTop: 6,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.muted,
  },
});