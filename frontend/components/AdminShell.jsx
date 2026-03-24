import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, Modal, ScrollView, StyleSheet,
  Text, TouchableOpacity, useWindowDimensions, View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Logo } from "./Logo";
import { authAPI } from "../api/auth";
import { LANGUAGE_OPTIONS, useLanguage } from "../context/LanguageContext";

const COLORS = {
  green: "#22c55e", greenDark: "#16a34a", greenSoft: "#e8f8ed",
  text: "#111827", muted: "#6b7280", border: "#edf1f0",
  surface: "#ffffff", background: "#f7f9f8", activeBg: "#e9f7ef",
};

function getInitials(value) {
  const parts = String(value || "").trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "A";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function formatDate(locale) {
  const today = new Date();
  try {
    return today.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return today.toDateString(); }
}

export function AdminShell({ activeKey, title, subtitle, loading = false, onRefresh, children }) {
  const { t, language, setLanguage } = useLanguage();
  const [adminName, setAdminName] = useState("");
  const { width } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    async function loadAdmin() {
      const admin = await authAPI.getAdmin();
      if (!mounted) return;
      setAdminName(admin?.fullName || admin?.email || "Admin");
    }
    loadAdmin();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isOpen ? 1 : 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [isOpen, progress]);

  const navItems = useMemo(() => [
    { key: "dashboard",    label: t("admin.navDashboard"),  icon: "view-dashboard-outline",  route: "/(admin)/dashboard" },
    { key: "utilisateurs", label: t("admin.navUsers"),      icon: "account-group-outline",   route: "/(admin)/utilisateurs" },
    { key: "irrigations",  label: t("admin.navIrrigations"),icon: "water-outline",           route: "/(admin)/irrigations" },
  ], [t]);

  async function handleSignOut() {
    await authAPI.logout();
    router.replace("/(auth)/login");
  }

  const drawerOpenWidth = Math.min(260, Math.round(width * 0.72));
  const drawerWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [0, drawerOpenWidth] });
  const detailsOpacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });
  const detailsTranslate = progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });

  const currentLang = LANGUAGE_OPTIONS.find(o => o.code === language) || LANGUAGE_OPTIONS[0];

  return (
  <View style={styles.root}>
    {/* Drawer */}
    <Animated.View
      style={[
        styles.drawer,
        { width: drawerWidth },
        isOpen ? styles.drawerOpen : styles.drawerClosed,
      ]}
    >
      <Animated.View
        pointerEvents={isOpen ? "auto" : "none"}
        style={[
          styles.drawerContent,
          {
            opacity: detailsOpacity,
            transform: [{ translateX: detailsTranslate }],
          },
        ]}
      >
        {/* 🔹 Sidebar content (كما هو بدون تغيير) */}
        <View style={styles.brandRow}>
          <Logo size="xs" withWordmark={false} compact />
          <View>
            <Text style={styles.brandText}>SmartIrrig</Text>
            <Text style={styles.brandRole}>Admin</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {navItems.map((item) => {
            const active = item.key === activeKey;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.menuItem, active && styles.menuItemActive]}
                onPress={() => {
                  router.push(item.route);
                  setIsOpen(false);
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={22}
                  color={active ? COLORS.greenDark : COLORS.muted}
                />
                <Text
                  style={[
                    styles.menuLabel,
                    active && styles.menuLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer (language + logout + admin) */}
        <View style={styles.sidebarFooter}>
          <Text style={styles.sectionTitle}>
            {t("drawer.languageTitle")}
          </Text>

          <TouchableOpacity
            style={styles.langSelector}
            onPress={() => setLangOpen((v) => !v)}
          >
            <View style={styles.langRow}>
              <View style={styles.langBadge}>
                <Text style={styles.langBadgeText}>
                  {currentLang.short}
                </Text>
              </View>
              <Text style={styles.langLabel}>
                {currentLang.label}
              </Text>
            </View>
            <Ionicons
              name={langOpen ? "chevron-up" : "chevron-down"}
              size={14}
              color={COLORS.muted}
            />
          </TouchableOpacity>

          {langOpen && (
            <View style={styles.langDropdown}>
              {LANGUAGE_OPTIONS.map((option) => {
                const isSelected = option.code === language;
                return (
                  <TouchableOpacity
                    key={option.code}
                    onPress={() => {
                      setLanguage(option.code);
                      setLangOpen(false);
                    }}
                    style={[
                      styles.langOption,
                      isSelected && styles.langOptionActive,
                    ]}
                  >
                    <View style={styles.langRow}>
                      <View
                        style={[
                          styles.langBadge,
                          isSelected && styles.langBadgeActiveColor,
                        ]}
                      >
                        <Text
                          style={[
                            styles.langBadgeText,
                            isSelected && {
                              color: COLORS.greenDark,
                            },
                          ]}
                        >
                          {option.short}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.langLabel,
                          isSelected && {
                            color: COLORS.greenDark,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={COLORS.greenDark}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={styles.signOut}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={16} color="#fff" />
            <Text style={styles.signOutText}>
              {t("drawer.signOut")}
            </Text>
          </TouchableOpacity>

          <View style={styles.adminRow}>
            <View style={styles.adminAvatar}>
              <Text style={styles.adminAvatarText}>
                {getInitials(adminName)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminName} numberOfLines={1}>
                {adminName || "Admin"}
              </Text>
              <Text style={styles.adminRole}>
                {t("admin.manager")}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Animated.View>

    {/* Main Content */}
    <View style={styles.content}>
      
      {/* ✅ HEADER (ثابت) */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {subtitle || formatDate(language)}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {onRefresh && (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              <Ionicons
                name="refresh"
                size={20}
                color={COLORS.muted}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setIsOpen((prev) => !prev)}
          >
            <Ionicons
              name={isOpen ? "close" : "menu"}
              size={22}
              color={COLORS.greenDark}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ✅ LOADING */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.green} />
        </View>
      ) : (
        /* ✅ SCROLL فقط للمحتوى */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      )}
    </View>
  </View>
);}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: COLORS.background },
  drawer: { backgroundColor: COLORS.surface, overflow: "hidden" },
  drawerOpen: { borderRightWidth: 1, borderRightColor: COLORS.border },
  drawerClosed: { borderRightWidth: 0 },
  drawerContent: { flex: 1, paddingHorizontal: 14, paddingBottom: 16, paddingTop: 20, justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  brandText: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  brandRole: { fontSize: 11, color: COLORS.muted },
  menu: { gap: 6 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 14 },
  menuItemActive: { backgroundColor: COLORS.activeBg },
  menuLabel: { fontSize: 13, color: COLORS.muted, fontWeight: "600" },
  menuLabelActive: { color: COLORS.greenDark },
  sidebarFooter: { marginTop: 14, gap: 10 },
  sectionTitle: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, color: COLORS.muted, fontWeight: "700" },
  langSelector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: "#f8fafc" },
  langDropdown: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, overflow: "hidden", backgroundColor: "#f8fafc" },
  langOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  langOptionActive: { backgroundColor: COLORS.greenSoft },
  langRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  langBadge: { width: 28, height: 28, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  langBadgeActiveColor: { backgroundColor: COLORS.greenSoft },
  langBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.muted },
  langLabel: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  signOut: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.greenDark, paddingVertical: 10, borderRadius: 12 },
  signOutText: { fontSize: 13, color: "#fff", fontWeight: "700" },
  adminRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  adminAvatar: { width: 28, height: 28, borderRadius: 10, backgroundColor: COLORS.greenSoft, alignItems: "center", justifyContent: "center" },
  adminAvatarText: { fontSize: 11, fontWeight: "700", color: COLORS.greenDark },
  adminName: { fontSize: 12, fontWeight: "700", color: COLORS.text },
  adminRole: { fontSize: 10, color: COLORS.muted },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  refreshButton: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  menuButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.greenSoft },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingBottom: 32 },
});
