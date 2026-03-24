import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, TextInput, ScrollView, Alert, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { API_BASE_URL, apiFetch } from '../../config/api';
import BottomBar from '../../components/BottomBar';
import { BrandHeader } from '../../components/BrandHeader';
import { useLanguage } from '../../context/LanguageContext';

const OW_KEY = "2cb8eb8d3fefa584e0f6f1f7fb50303f";

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function calcET0(tmax, tmin, humidity, windSpeed, latitude, date) {
  try {
    const tmean = (tmax + tmin) / 2;
    const P = 101.3 * Math.pow((293 - 0.0065 * 0) / 293, 5.26);
    const gamma = 0.000665 * P;
    const es_tx = 0.6108 * Math.exp((17.27 * tmax) / (tmax + 237.3));
    const es_tn = 0.6108 * Math.exp((17.27 * tmin) / (tmin + 237.3));
    const es = (es_tx + es_tn) / 2;
    const ea = es * (humidity / 100);
    const delta = (4098 * es) / Math.pow(tmean + 237.3, 2);
    const phi = latitude * Math.PI / 180;
    const J = getDayOfYear(date);
    const dr = 1 + 0.033 * Math.cos((2 * Math.PI / 365) * J);
    const decl = 0.409 * Math.sin((2 * Math.PI / 365) * J - 1.39);
    const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(decl))));
    const Ra = (24 * 60 / Math.PI) * 0.0820 * dr * (ws * Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.sin(ws));
    const m = date.getMonth() + 1;
    const Rs = ((m >= 5 && m <= 8) ? 28 : (m >= 3 && m <= 10) ? 22 : 15) * 0.75;
    const Rns = 0.77 * Rs;
    const Tk = 273.16;
    const Rnl = 4.903e-9 * (Math.pow(tmax+Tk,4)+Math.pow(tmin+Tk,4))/2 * (0.34 - 0.14 * Math.sqrt(Math.max(0,ea))) * (1.35 * Rs / Math.max(Ra,0.1) - 0.35);
    const Rn = Rns - Rnl;
    const denom = delta + gamma * (1 + 0.34 * windSpeed);
    const et0 = (0.408 * delta * Rn) / denom + (gamma * (900 / (tmean+273)) * windSpeed * (es-ea)) / denom;
    return Math.max(0, parseFloat(et0.toFixed(2)));
  } catch { return 0; }
}

function buildDay(tMin, tMax, tCur, hum, wind, gust, rain, desc, et0, location, type) {
  return {
    temp_min: Math.round(tMin), temp_max: Math.round(tMax), temp_current: Math.round(tCur),
    humidity: Math.round(hum), humidity_min: Math.max(Math.round(hum)-10,0), humidity_max: Math.min(Math.round(hum)+10,100),
    wind: parseFloat(wind).toFixed(1), wind_gust: parseFloat(gust).toFixed(1),
    rain: parseFloat(rain).toFixed(1), et0: parseFloat(et0).toFixed(2),
    description: desc || "—", location, type,
  };
}

export default function CalendarScreen() {
  const { t } = useLanguage();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [dayMap, setDayMap] = useState({});
  const [histDates, setHistDates] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("Tunis");
  const [inputCity, setInputCity] = useState("Tunis");

  useEffect(() => { fetchAll(city); }, [city]);

  const fetchAll = useCallback(async (cityName) => {
    try {
      setLoading(true);
      const enc = encodeURIComponent(cityName.trim());
      const map = {};
      const hset = new Set();

      const [rc, rf] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${enc}&appid=${OW_KEY}&units=metric&lang=fr`),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${enc}&appid=${OW_KEY}&units=metric&lang=fr`),
      ]);

      if (!rc.ok) { Alert.alert(t('common.error'), "Ville non trouvée"); return; }

      const cur = await rc.json();
      const fore = rf.ok ? await rf.json() : { list: [] };
      const lat = cur.coord?.lat || 36.8;
      const loc = { city: cur.name, country: cur.sys?.country || "" };

      const tMin = cur.main.temp_min, tMax = cur.main.temp_max, tCur = cur.main.temp;
      const hum = cur.main.humidity, wind = cur.wind?.speed || 0, gust = cur.wind?.gust || wind;
      const rain = cur.rain?.['1h'] || cur.rain?.['3h'] || 0;
      const et0 = calcET0(tMax, tMin, hum, wind, lat, new Date());
      map[today] = buildDay(tMin, tMax, tCur, hum, wind, gust, rain, cur.weather?.[0]?.description, et0, loc, 'current');

      if (fore.list?.length) {
        const grp = {};
        fore.list.forEach(item => {
          const d = new Date(item.dt * 1000).toISOString().split("T")[0];
          if (d > today) (grp[d] = grp[d] || []).push(item);
        });
        Object.entries(grp).forEach(([d, items]) => {
          const tMn = Math.min(...items.map(i => i.main.temp_min));
          const tMx = Math.max(...items.map(i => i.main.temp_max));
          const tMe = items.reduce((a,i) => a+i.main.temp,0)/items.length;
          const hu = items.reduce((a,i) => a+i.main.humidity,0)/items.length;
          const wi = items.reduce((a,i) => a+(i.wind?.speed||0),0)/items.length;
          const gu = Math.max(...items.map(i => i.wind?.gust||i.wind?.speed||0));
          const ra = items.reduce((a,i) => a+(i.rain?.['3h']||0),0);
          const mid = items.find(i => new Date(i.dt*1000).getHours()===12) || items[Math.floor(items.length/2)];
          const e0 = calcET0(tMx, tMn, hu, wi, lat, new Date(d+'T12:00:00'));
          map[d] = buildDay(tMn, tMx, tMe, hu, wi, gu, ra, mid?.weather?.[0]?.description, e0, loc, 'forecast');
        });
      }

      try {
        const rh = await apiFetch(`${API_BASE_URL}/weather/history?city=${enc}&days=30`);
        const jh = await rh.json();
        if (jh.success && jh.data?.length) {
          jh.data.forEach(entry => {
            const d = new Date(entry.date).toISOString().split("T")[0];
            if (d >= today || map[d]) return;
            const tMn = entry.temperature?.min ?? entry.temperature?.current ?? 0;
            const tMx = entry.temperature?.max ?? entry.temperature?.current ?? 0;
            const tCr = entry.temperature?.current ?? 0;
            const hu = entry.humidity?.current ?? 0;
            const wi = entry.wind?.speed ?? 0;
            const gu = entry.wind?.gust ?? wi;
            const ra = entry.precipitation?.rain ?? 0;
            const e0 = entry.et0 && entry.et0 > 0.1 ? entry.et0 : calcET0(tMx, tMn, hu, wi, lat, new Date(d));
            map[d] = buildDay(tMn, tMx, tCr, hu, wi, gu, ra, entry.description, e0, entry.location || loc, 'history');
            hset.add(d);
          });
        }
      } catch {}

      setDayMap(map); setHistDates(hset);
      apiFetch(`${API_BASE_URL}/weather/current?city=${enc}`).catch(()=>{});
    } catch (err) { Alert.alert(t('common.error'), err.message);
    } finally { setLoading(false); }
  }, []);

  const searchCity = () => { if (inputCity.trim()) setCity(inputCity.trim()); };

  const formatDate = d => new Date(d).toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  const getIcon = (desc = "") => {
    const d = desc.toLowerCase();
    if (d.includes("pluie")||d.includes("rain")) return "rainy";
    if (d.includes("orage")||d.includes("thunder")) return "thunderstorm";
    if (d.includes("nuage")||d.includes("cloud")||d.includes("couvert")) return "cloudy";
    if (d.includes("dégagé")||d.includes("clear")) return "sunny";
    return "partly-sunny";
  };

  const marked = {};
  histDates.forEach(d => { marked[d] = { marked:true, dotColor:"#4CAF50" }; });
  marked[today] = { ...(marked[today]||{}), marked:true, dotColor:"#4CAF50", today:true };
  marked[selectedDate] = { ...(marked[selectedDate]||{}), selected:true, selectedColor:"#4CAF50" };

  const BADGE = {
    history:  { label: t('calendar.historical'), bg:"#f8fafc", border:"#e2e8f0", text:"#64748b" },
    forecast: { label: t('calendar.forecast'),   bg:"#eff6ff", border:"#bfdbfe", text:"#2563eb" },
  };

  const dw = dayMap[selectedDate] || null;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#f3f4f6' }}>
      {/* ── Header avec drawer ── */}
      <BrandHeader title={t('calendar.title')} />
      <ScrollView contentContainerStyle={{ paddingBottom:80 }} showsVerticalScrollIndicator={false}>

        {/* Search */}
        <View style={s.searchRow}>
          <TextInput style={s.searchInput} placeholder={t('calendar.searchPlaceholder') || 'Entrer une ville...'} value={inputCity} onChangeText={setInputCity} onSubmitEditing={searchCity} returnKeyType="search" />
          <TouchableOpacity style={s.searchBtn} onPress={searchCity}>
            <Ionicons name="search" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {dw && (
          <View style={s.locationRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={s.locationText}>{dw.location?.city || city} — {dw.location?.country || "TN"}</Text>
          </View>
        )}

        <Calendar
          current={selectedDate}
          onDayPress={day => setSelectedDate(day.dateString)}
          markedDates={marked}
          theme={{ todayTextColor:"#4CAF50", arrowColor:"#4CAF50", selectedDayBackgroundColor:"#4CAF50", selectedDayTextColor:"white", monthTextColor:"#333", textMonthFontWeight:"bold" }}
          style={{ marginHorizontal:8, marginBottom:8 }}
        />

        <View style={s.legendRow}>
          <View style={s.legendDot} />
          <Text style={s.legendText}>Données enregistrées</Text>
        </View>

        {loading ? (
          <View style={{ marginTop:32, alignItems:'center' }}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={{ marginTop:8, color:'#6b7280' }}>{t('common.loading') || 'Chargement...'}</Text>
          </View>
        ) : dw ? (
          <View style={s.card}>
            {dw.type && BADGE[dw.type] && (
              <View style={[s.badge, { backgroundColor: BADGE[dw.type].bg, borderColor: BADGE[dw.type].border }]}>
                <Text style={[s.badgeText, { color: BADGE[dw.type].text }]}>{BADGE[dw.type].label}</Text>
              </View>
            )}
            <View style={s.cardHeader}>
              <Ionicons name={getIcon(dw.description)} size={28} color="#f4b400" />
              <View style={{ marginLeft:12, flex:1 }}>
                <Text style={s.cardTitle}>{t('calendar.weatherFor') || 'Météo du'} {formatDate(selectedDate)}</Text>
                <Text style={s.cardDesc}>{dw.description}</Text>
              </View>
            </View>

            <View style={s.gridRow}>
              <View style={s.gridCell}>
                <MaterialCommunityIcons name="thermometer" size={28} color="#ff5252" />
                <Text style={s.gridVal}>{dw.temp_min}°/{dw.temp_max}°C</Text>
                <Text style={s.gridLabel}>Min / Max</Text>
                <Text style={s.gridSub}>Actuel: {dw.temp_current}°C</Text>
              </View>
              <View style={s.gridCell}>
                <Ionicons name="water" size={28} color="#03a9f4" />
                <Text style={s.gridVal}>{dw.humidity}%</Text>
                <Text style={s.gridLabel}>Humidité</Text>
                <Text style={s.gridSub}>{dw.humidity_min}–{dw.humidity_max}%</Text>
              </View>
            </View>

            <View style={s.gridRow}>
              <View style={s.gridCell}>
                <FontAwesome5 name="wind" size={24} color="#555" />
                <Text style={s.gridVal}>{dw.wind} m/s</Text>
                <Text style={s.gridLabel}>Vent</Text>
                <Text style={s.gridSub}>Rafales: {dw.wind_gust} m/s</Text>
              </View>
              <View style={s.gridCell}>
                <Ionicons name="rainy" size={28} color="#2196f3" />
                <Text style={s.gridVal}>{dw.rain} mm</Text>
                <Text style={s.gridLabel}>Pluie</Text>
                <Text style={s.gridSub}>24h</Text>
              </View>
            </View>

          </View>
        ) : (
          <View style={s.noDataCard}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={s.noDataText}>
              {selectedDate < today ? t('calendar.noData') : t('calendar.noData')}
            </Text>
            {selectedDate >= today && (
              <TouchableOpacity style={s.retryBtn} onPress={() => fetchAll(city)}>
                <Text style={s.retryBtnText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ══ SECTION HISTORIQUE ══ */}
        {Object.keys(dayMap).filter(d => d < today).length > 0 && (
          <View style={{ marginHorizontal:16, marginTop:20, marginBottom:8 }}>
            <View style={s.histSectionHeader}>
              <Ionicons name="time-outline" size={18} color="#64748b" />
              <Text style={s.histSectionTitle}>{t('calendar.historical')}</Text>
              <View style={s.histBadge}>
                <Text style={s.histBadgeText}>
                  {Object.keys(dayMap).filter(d => d < today).length} {t('common.period')}
                </Text>
              </View>
            </View>

            {Object.keys(dayMap)
              .filter(d => d < today)
              .sort((a, b) => b.localeCompare(a))
              .map(d => {
                const hw = dayMap[d];
                return (
                  <TouchableOpacity
                    key={d}
                    style={[s.histCard, selectedDate === d && s.histCardActive]}
                    onPress={() => setSelectedDate(d)}
                    activeOpacity={0.8}
                  >
                    <View style={s.histCardLeft}>
                      <Ionicons
                        name={getIcon(hw.description)}
                        size={22}
                        color={selectedDate === d ? '#16a34a' : '#f4b400'}
                      />
                      <View style={{ marginLeft:10 }}>
                        <Text style={[s.histDate, selectedDate === d && { color:'#16a34a' }]}>
                          {new Date(d).toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' })}
                        </Text>
                        <Text style={s.histDesc} numberOfLines={1}>{hw.description}</Text>
                      </View>
                    </View>
                    <View style={s.histCardRight}>
                      <Text style={s.histTemp}>{hw.temp_min}°/{hw.temp_max}°</Text>
                      <View style={s.histStats}>
                        <Ionicons name="water-outline" size={11} color="#9ca3af" />
                        <Text style={s.histStatText}>{hw.humidity}%</Text>
                        <Ionicons name="leaf-outline" size={11} color="#9ca3af" style={{ marginLeft:6 }} />
                        <Text style={s.histStatText}>{hw.et0}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            }
          </View>
        )}
      </ScrollView>
      <BottomBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#f3f4f6' },
  pageTitle: { fontSize:22, fontWeight:'700', textAlign:'center', marginVertical:16, color:'#1f2937' },
  searchRow: { flexDirection:'row', marginHorizontal:16, marginBottom:12 },
  searchInput: { flex:1, backgroundColor:'#fff', paddingHorizontal:14, paddingVertical:10, borderTopLeftRadius:10, borderBottomLeftRadius:10, borderWidth:1, borderColor:'#e5e7eb', fontSize:14 },
  searchBtn: { backgroundColor:'#22c55e', paddingHorizontal:14, paddingVertical:10, borderTopRightRadius:10, borderBottomRightRadius:10 },
  locationRow: { flexDirection:'row', alignItems:'center', marginHorizontal:16, marginBottom:8 },
  locationText: { marginLeft:4, color:'#4b5563', fontSize:13 },
  legendRow: { flexDirection:'row', alignItems:'center', justifyContent:'center', marginBottom:12 },
  legendDot: { width:8, height:8, borderRadius:4, backgroundColor:'#22c55e', marginRight:6 },
  legendText: { fontSize:12, color:'#9ca3af' },
  card: { backgroundColor:'#fff', marginHorizontal:16, marginTop:4, padding:20, borderRadius:16, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:8, elevation:3 },
  badge: { alignSelf:'flex-start', borderWidth:1, borderRadius:99, paddingHorizontal:12, paddingVertical:4, marginBottom:12 },
  badgeText: { fontSize:12, fontWeight:'700' },
  cardHeader: { flexDirection:'row', alignItems:'center', marginBottom:16, paddingBottom:12, borderBottomWidth:1, borderBottomColor:'#f3f4f6' },
  cardTitle: { fontWeight:'700', color:'#1f2937', fontSize:14 },
  cardDesc: { color:'#6b7280', fontSize:13, textTransform:'capitalize', marginTop:2 },
  gridRow: { flexDirection:'row', justifyContent:'space-between', marginBottom:12 },
  gridCell: { backgroundColor:'#f9fafb', width:'48%', padding:14, borderRadius:12, borderWidth:1, borderColor:'#f3f4f6', alignItems:'center' },
  gridVal: { fontWeight:'700', fontSize:18, color:'#1f2937', marginTop:6 },
  gridLabel: { fontSize:12, color:'#6b7280', marginTop:2 },
  gridSub: { fontSize:11, color:'#9ca3af', marginTop:2 },
  noDataCard: { backgroundColor:'#fff', marginHorizontal:16, marginTop:8, padding:32, borderRadius:16, alignItems:'center' },
  noDataText: { marginTop:12, color:'#6b7280', fontSize:15, textAlign:'center' },
  retryBtn: { marginTop:16, backgroundColor:'#22c55e', paddingVertical:12, paddingHorizontal:24, borderRadius:99 },
  retryBtnText: { color:'#fff', fontWeight:'700' },
  // ── Historique section ──
  histSectionHeader: { flexDirection:'row', alignItems:'center', gap:8, marginBottom:12 },
  histSectionTitle:  { fontSize:15, fontWeight:'700', color:'#374151', flex:1 },
  histBadge:         { backgroundColor:'#e2e8f0', paddingHorizontal:8, paddingVertical:3, borderRadius:20 },
  histBadgeText:     { fontSize:11, fontWeight:'700', color:'#64748b' },
  histCard:          { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:8, borderWidth:1, borderColor:'#f1f5f9', shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.04, shadowRadius:3, elevation:1 },
  histCardActive:    { borderColor:'#bbf7d0', backgroundColor:'#f0fdf4' },
  histCardLeft:      { flexDirection:'row', alignItems:'center', flex:1 },
  histCardRight:     { alignItems:'flex-end' },
  histDate:          { fontSize:13, fontWeight:'700', color:'#1f2937' },
  histDesc:          { fontSize:11, color:'#9ca3af', marginTop:2, textTransform:'capitalize' },
  histTemp:          { fontSize:14, fontWeight:'700', color:'#1f2937' },
  histStats:         { flexDirection:'row', alignItems:'center', marginTop:3 },
  histStatText:      { fontSize:11, color:'#9ca3af', marginLeft:2 },
});