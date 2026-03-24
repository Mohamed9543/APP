import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { router } from "expo-router";

export function BackButton() {
  return (
    <TouchableOpacity onPress={() => router.back()} style={s.btn} activeOpacity={0.7}>
      <Text style={s.text}>{"<"}</Text>
    </TouchableOpacity>
  );
}
const s = StyleSheet.create({
  btn: { width:40, height:40, borderRadius:20, backgroundColor:'#f3f4f6', alignItems:'center', justifyContent:'center', marginBottom:32 },
  text: { color:'#4b5563', fontSize:20, lineHeight:24 },
});
