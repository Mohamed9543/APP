import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { authAPI } from "../api/auth";
import { LANGUAGE_OPTIONS, useLanguage } from "../context/LanguageContext";

const COLORS = {
  green: "#3ecf6e",
  greenDark: "#27ae60",
  greenLight: "#e8f8ed",
  text: "#0f172a",
  muted: "#64748b",
  card: "#ffffff",
  border: "#dceee3",
  rail: "#f8fafc",
};

const DrawerContext = createContext(null);

export function useDrawer() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error("useDrawer must be used within AppDrawer");
  }
  return context;
}

function getTopPadding() {
  if (Platform.OS === "ios") {
    return 54;
  }
  const statusBar = StatusBar.currentHeight || 0;
  return statusBar + 16;
}

function getInitials(value) {
  const parts = String(value || "")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (parts.length === 0) {
    return "U";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppDrawer({ children }) {
  const { language, setLanguage, isRTL, t } = useLanguage();
  const { width } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "user",
  });
  const progress = useRef(new Animated.Value(0)).current;

  const drawerClosedWidth = 0;
  const drawerOpenWidth = Math.min(300, Math.round(width * 0.68));

  const drawerWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [drawerClosedWidth, drawerOpenWidth],
  });

  const detailsOpacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });

  const detailsTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isOpen ? 1 : 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [isOpen, progress]);

  const currentLanguage = useMemo(() => {
    return (
      LANGUAGE_OPTIONS.find((option) => option.code === language) ||
      LANGUAGE_OPTIONS[0]
    );
  }, [language]);

  const loadProfile = async () => {
    const admin = await authAPI.getAdmin();
    if (admin?.email) {
      setProfile({
        name: admin.fullName || admin.email,
        email: admin.email,
        role: "admin",
      });
      return;
    }

    const user = await authAPI.getUser();
    if (user?.email) {
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      setProfile({
        name: fullName || user.email,
        email: user.email,
        role: "user",
      });
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  async function handleSelectLanguage(nextLanguage) {
    await setLanguage(nextLanguage);
  }

  async function handleSignOut() {
    await authAPI.logout();
    router.replace("/(auth)/login");
  }

  const toggleDrawer = () => {
    setIsOpen((prev) => !prev);
  };

  const openDrawer = () => {
    setIsOpen(true);
  };

  const closeDrawer = () => {
    setIsOpen(false);
  };

  const layoutDirection = isRTL ? "row-reverse" : "row";
  const topPadding = getTopPadding();

  return (
    <DrawerContext.Provider
      value={{ isOpen, toggleDrawer, openDrawer, closeDrawer }}
    >
      <View style={[styles.root, { flexDirection: layoutDirection }]}>
        <Animated.View
          style={[
            styles.drawer,
            { width: drawerWidth, paddingTop: topPadding },
            isRTL ? styles.drawerRtl : styles.drawerLtr,
            isOpen ? (isRTL ? styles.drawerBorderRtl : styles.drawerBorderLtr) : null,
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
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
              </View>
              <Text style={styles.profileName}>
                {profile.name || t("drawer.guest")}
              </Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {profile.role === "admin"
                    ? t("drawer.roleAdmin")
                    : t("drawer.roleUser")}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("drawer.languageTitle")}</Text>
              <Text style={styles.sectionSubtitle}>{currentLanguage.label}</Text>
              <View style={styles.languageList}>
                {LANGUAGE_OPTIONS.map((option) => {
                  const isSelected = option.code === language;
                  return (
                    <TouchableOpacity
                      key={option.code}
                      activeOpacity={0.85}
                      onPress={() => handleSelectLanguage(option.code)}
                      style={[
                        styles.langItem,
                        isSelected && styles.langItemSelected,
                      ]}
                    >
                      <View style={styles.langTextRow}>
                        <View
                          style={[
                            styles.langBadge,
                            isSelected && styles.langBadgeSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.langCode,
                              isSelected && styles.langCodeSelected,
                            ]}
                          >
                            {option.short}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.langLabel,
                            isSelected && styles.langLabelSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
                      {isSelected ? (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color={COLORS.greenDark}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.signOutButton}
                activeOpacity={0.9}
                onPress={handleSignOut}
              >
                <Ionicons name="log-out-outline" size={18} color="#fff" />
                <Text style={styles.signOutText}>{t("drawer.signOut")}</Text>
              </TouchableOpacity>

              <View style={styles.brandRow}>
                <Text style={styles.brandText}>
                  <Text style={{ color: COLORS.green }}>Smart</Text>
                  <Text style={{ color: COLORS.greenDark }}>Irrig</Text>
                </Text>
                <Text style={styles.brandSub}>{t("drawer.tagline")}</Text>
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        <View style={styles.content}>
          <View style={styles.contentBody}>{children}</View>
        </View>
      </View>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },
  drawer: {
    backgroundColor: COLORS.card,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  drawerLtr: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  drawerRtl: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  drawerBorderLtr: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  drawerBorderRtl: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  profileCard: {
    backgroundColor: COLORS.greenLight,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 18,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.greenDark,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  profileEmail: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.greenDark,
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: COLORS.muted,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
    marginTop: 4,
  },
  languageList: {
    marginTop: 10,
    gap: 8,
  },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#f8fafc",
  },
  langItemSelected: {
    backgroundColor: COLORS.greenLight,
    borderColor: COLORS.greenLight,
  },
  langTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  langBadgeSelected: {
    backgroundColor: "#fff",
  },
  langCode: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },
  langCodeSelected: {
    color: COLORS.greenDark,
  },
  langLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  langLabelSelected: {
    color: COLORS.greenDark,
  },
  footer: {
    marginTop: 18,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.greenDark,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  signOutText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
  },
  brandRow: {
    alignItems: "flex-start",
  },
  brandText: {
    fontSize: 18,
    fontWeight: "800",
  },
  brandSub: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentBody: {
    flex: 1,
  },
});
