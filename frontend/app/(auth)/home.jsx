import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { authAPI } from "../../api/auth";
import { useLanguage } from "../../context/LanguageContext";

export default function HomeScreen() {
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState("");
  useEffect(() => {
    authAPI.getUser().then(user => { if (user?.firstName) setFirstName(String(user.firstName).trim()); }).catch(() => {});
  }, []);
  return (
    <View style={s.container}>
      <Text style={s.title}>{firstName ? `${t("authHome.title")} ${firstName}` : t("authHome.title")}</Text>
      <Text style={s.sub}>{t("authHome.subtitle")}</Text>
      <TouchableOpacity style={s.btn} onPress={async () => { try { await authAPI.logout(); } catch {} router.replace("/(auth)/login"); }}>
        <Text style={s.btnText}>{t("authHome.logout")}</Text>
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#fff', alignItems:'center', justifyContent:'center', paddingHorizontal:32 },
  title: { fontSize:28, fontWeight:'700', color:'#15803d', marginBottom:12 },
  sub: { fontSize:16, color:'#4b5563', textAlign:'center', marginBottom:32 },
  btn: { backgroundColor:'#22c55e', borderRadius:99, paddingVertical:16, paddingHorizontal:32 },
  btnText: { color:'#fff', fontWeight:'700' },
});
