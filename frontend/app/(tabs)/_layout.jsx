import { Stack } from "expo-router";
import { AppDrawer } from "../../components/AppDrawer";
export default function TabsLayout() {
  return (
    <AppDrawer>
      <Stack screenOptions={{ headerShown: false }} />
    </AppDrawer>
  );
}
