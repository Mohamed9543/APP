// app/(admin)/utilisateurs.jsx — CRUD complet
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
  ActivityIndicator, Switch,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { AdminShell } from "../../components/AdminShell";
import { API_BASE_URL, API_ENDPOINTS, apiFetch } from "../../config/api";
import { useLanguage } from "../../context/LanguageContext";

const C = {
  green: "#22c55e", greenDark: "#16a34a", greenSoft: "#e8f8ed",
  red: "#ef4444",   redSoft: "#fee2e2",
  blue: "#3b82f6",  blueSoft: "#eff6ff",
  text: "#111827",  muted: "#6b7280",
  border: "#edf1f0",surface: "#ffffff", bg: "#f7f9f8",
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
function uid(u) { return String(u?._id || u?.id || ""); }
function initials(fn, ln) {
  return (((fn||"")[0]||"").toUpperCase()+((ln||"")[0]||"").toUpperCase()) || "?";
}
function fmtDate(v, language) {
  if (!v) return "—";
  try {
    const locale = language === "ar" ? "ar-TN" : language === "tr" ? "tr-TR" : language === "en" ? "en-GB" : "fr-FR";
    return new Date(v).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  }
  catch { return "—"; }
}

async function getTokens() {
  const [a, u] = await Promise.all([
    AsyncStorage.getItem("adminToken"),
    AsyncStorage.getItem("userToken"),
  ]);
  return [a, u].filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// API CALLS
// ─────────────────────────────────────────────────────────────────────────────
async function apiCall(method, path, body) {
  const tokens = await getTokens();
  const url = `${API_BASE_URL}${path}`;
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  let lastErr = "No token available";

  for (const token of tokens) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { ...opts.headers, Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch {}
      console.log(`[API] ${method} ${path} → ${res.status}`);
      if (res.ok || data?.success) return data;
      lastErr = data?.message || data?.error || `HTTP ${res.status}`;
      if (res.status !== 401 && res.status !== 403) {
        throw new Error(lastErr);
      }
    } catch (e) {
      lastErr = e.message;
      if (!e.message.includes("401") && !e.message.includes("403")) throw e;
    }
  }

  if (method === "DELETE") {
    const id = path.split("/").pop();
    const fallback = `${API_BASE_URL}/users/${id}`;
    console.log(`[API] DELETE fallback: ${fallback}`);
    const res2 = await fetch(fallback, { method: "DELETE", headers: { "Content-Type": "application/json" } });
    const d2 = await res2.json().catch(() => ({}));
    if (res2.ok || d2?.success) return d2;
    throw new Error(d2?.message || d2?.error || `Suppression echouee (${res2.status})`);
  }

  throw new Error(lastErr || "Acces refuse — reconnectez-vous.");
}

const adminAPI = {
  listUsers:    ()        => apiCall("GET",   "/admin/users"),
  createUser:   (body)    => apiCall("POST",  "/admin/users", body),
  updateUser:   (id, body)=> apiCall("PUT",   `/admin/users/${id}`, body),
  toggleStatus: (id)      => apiCall("PATCH", `/admin/users/${id}/status`),
  deleteUser:   (id)      => apiCall("DELETE",`/admin/users/${id}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL FORM (Créer / Modifier)
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_FORM = { firstName:"", lastName:"", address:"", email:"", password:"", isActive:true };

function UserFormModal({ visible, user, onClose, onSave }) {
  const { t } = useLanguage();
  const isEdit = !!user;
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (visible) {
      setErr("");
      setShowPwd(false);
      setForm(user ? {
        firstName: user.firstName || "",
        lastName:  user.lastName  || "",
        address:   user.address   || "",
        email:     user.email     || "",
        password:  "",
        isActive:  user.isActive !== false,
      } : EMPTY_FORM);
    }
  }, [visible, user]);

  const set = k => v => { setForm(p => ({ ...p, [k]: v })); setErr(""); };

  const handleSave = async () => {
    setErr("");
    const { firstName, lastName, address, email, password, isActive } = form;
    if (!firstName.trim()) { setErr(t("admin.userErrFirstName")); return; }
    if (!lastName.trim())  { setErr(t("admin.userErrLastName")); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErr(t("admin.userErrEmail")); return;
    }
    if (!isEdit && password.length < 8) { setErr(t("admin.userErrPassword")); return; }
    if (isEdit && password && password.length < 8) { setErr(t("admin.userErrPassword")); return; }

    setSaving(true);
    try {
      const body = {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        address:   address.trim() || "—",
        email:     email.trim().toLowerCase(),
        isActive,
        ...(password ? { password } : {}),
      };
      const result = isEdit
        ? await adminAPI.updateUser(uid(user), body)
        : await adminAPI.createUser(body);
      onSave(result.user || result, isEdit);
      onClose();
    } catch (e) {
      setErr(e.message || t("admin.userErrServer"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { maxHeight: "90%" }]}>
          <View style={s.handle} />

          {/* Header */}
          <View style={[s.sheetHeader, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <View style={[s.iconBtn, { backgroundColor: isEdit ? C.blueSoft : C.greenSoft }]}>
              <Ionicons name={isEdit ? "pencil" : "person-add-outline"} size={20} color={isEdit ? C.blue : C.greenDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetName}>{isEdit ? t("admin.userEdit") : t("admin.userCreate")}</Text>
              {isEdit && <Text style={s.sheetEmail}>{user?.email}</Text>}
            </View>
            <TouchableOpacity style={s.iconBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={C.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
            {err !== "" && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle" size={16} color={C.red} />
                <Text style={s.errText}>{err}</Text>
              </View>
            )}

            {/* Nom / Prénom */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{t("admin.userFieldLastName")} <Text style={{ color: C.red }}>*</Text></Text>
                <FormInput
                  placeholder="Ben Ali"
                  value={form.lastName}
                  onChangeText={set("lastName")}
                  icon="person-outline"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{t("admin.userFieldFirstName")} <Text style={{ color: C.red }}>*</Text></Text>
                <FormInput
                  placeholder="Mohamed"
                  value={form.firstName}
                  onChangeText={set("firstName")}
                  icon="person-outline"
                />
              </View>
            </View>

            {/* Adresse */}
            <View>
              <Text style={s.fieldLabel}>{t("admin.userFieldAddress")}</Text>
              <FormInput
                placeholder="Tunis, Tunisie"
                value={form.address}
                onChangeText={set("address")}
                icon="location-outline"
              />
            </View>

            {/* Email */}
            <View>
              <Text style={s.fieldLabel}>{t("admin.userFieldEmail")} <Text style={{ color: C.red }}>*</Text></Text>
              <FormInput
                placeholder="user@email.com"
                value={form.email}
                onChangeText={set("email")}
                icon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isEdit}
                style={isEdit && { opacity: 0.6 }}
              />
              {isEdit && <Text style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{t("admin.userEmailReadonly")}</Text>}
            </View>

            {/* Mot de passe */}
            <View>
              <Text style={s.fieldLabel}>
                {t("admin.userFieldPassword")}{" "}
                {isEdit
                  ? <Text style={{ color: C.muted, fontWeight: "400" }}>({t("admin.userPasswordOptional")})</Text>
                  : <Text style={{ color: C.red }}>*</Text>
                }
              </Text>
              <View style={s.pwdRow}>
                <Ionicons name="lock-closed-outline" size={17} color="#9ca3af" style={{ marginHorizontal: 12 }} />
                <TextInput
                  placeholder={isEdit ? t("admin.userPasswordNew") : t("admin.userPasswordMin")}
                  value={form.password}
                  onChangeText={set("password")}
                  secureTextEntry={!showPwd}
                  style={s.pwdInput}
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  importantForAutofill="no"
                />
                <TouchableOpacity
                  onPress={() => setShowPwd(p => !p)}
                  activeOpacity={0.7}
                  style={{ paddingHorizontal: 12, paddingVertical: 4 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={17} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Statut actif */}
            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{t("admin.userAccountActive")}</Text>
                <Text style={{ fontSize: 12, color: C.muted }}>
                  {form.isActive ? t("admin.userAccountActiveDesc") : t("admin.userAccountInactiveDesc")}
                </Text>
              </View>
              <Switch
                value={form.isActive}
                onValueChange={v => set("isActive")(v)}
                trackColor={{ false: "#e5e7eb", true: C.greenSoft }}
                thumbColor={form.isActive ? C.greenDark : "#9ca3af"}
              />
            </View>

            {/* Bouton */}
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: isEdit ? C.blue : C.greenDark }, saving && { opacity: 0.65 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name={isEdit ? "checkmark-done" : "person-add-outline"} size={18} color="#fff" />
                    <Text style={s.saveBtnText}>{isEdit ? t("admin.userSaveEdit") : t("admin.userSaveCreate")}</Text>
                  </>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DETAIL UTILISATEUR
// ─────────────────────────────────────────────────────────────────────────────
function UserDetailModal({ user, visible, onClose, onEdit, onDelete, onToggle, allCultures, toggling }) {
  const { t, language } = useLanguage();
  const [tab, setTab] = useState("info");
  useEffect(() => { if (visible) setTab("info"); }, [visible]);
  if (!user) return null;

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const isActive = user.isActive !== false;
  const id = uid(user);
  const userCultures = allCultures.filter(c => String(c.userId?._id || c.userId) === id);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { maxHeight: "88%" }]}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.sheetHeader}>
            <View style={s.sheetAvatar}>
              <Text style={s.sheetAvatarText}>{initials(user.firstName, user.lastName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetName}>{fullName || "—"}</Text>
              <Text style={s.sheetEmail}>{user.email}</Text>
            </View>
            {/* Modifier */}
            <TouchableOpacity
              style={[s.iconBtn, { backgroundColor: C.blueSoft }]}
              onPress={() => { onClose(); setTimeout(() => onEdit(user), 150); }}
              activeOpacity={0.75}
              hitSlop={{ top:6, bottom:6, left:6, right:6 }}
            >
              <Ionicons name="pencil" size={17} color={C.blue} />
            </TouchableOpacity>
            {/* Supprimer */}
            <TouchableOpacity
              style={[s.iconBtn, { backgroundColor: C.redSoft, marginHorizontal: 6 }]}
              onPress={() => { onClose(); setTimeout(() => onDelete(user), 300); }}
              activeOpacity={0.75}
              hitSlop={{ top:6, bottom:6, left:6, right:6 }}
            >
              <Ionicons name="trash-outline" size={17} color={C.red} />
            </TouchableOpacity>
            {/* Fermer */}
            <TouchableOpacity style={s.iconBtn} onPress={onClose} hitSlop={{ top:6, bottom:6, left:6, right:6 }}>
              <Ionicons name="close" size={22} color={C.muted} />
            </TouchableOpacity>
          </View>

          {/* Onglets */}
          <View style={s.tabs}>
            {[
              { key: "info",     icon: "person-outline", label: t("admin.userTabProfile") },
              { key: "cultures", icon: "leaf-outline",   label: `${t("admin.userTabCultures")} (${userCultures.length})` },
            ].map(tb => (
              <TouchableOpacity
                key={tb.key}
                style={[s.tab, tab === tb.key && s.tabActive]}
                onPress={() => setTab(tb.key)}
              >
                <Ionicons name={tb.icon} size={14} color={tab === tb.key ? C.greenDark : C.muted} />
                <Text style={[s.tabText, tab === tb.key && s.tabTextActive]}>{tb.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, gap: 10 }} showsVerticalScrollIndicator={false}>
            {tab === "info" && (
              <>
                {[
                  { icon: "person-outline",   label: t("admin.userFullName"), value: fullName },
                  { icon: "mail-outline",     label: t("admin.userFieldEmail"),   value: user.email },
                  { icon: "location-outline", label: t("admin.userAddress"),   value: user.address },
                  { icon: "calendar-outline", label: t("admin.userRegistered"), value: fmtDate(user.createdAt, language) },
                ].map((row, i) => (
                  <View key={i} style={s.infoRow}>
                    <View style={s.infoIcon}><Ionicons name={row.icon} size={15} color={C.greenDark} /></View>
                    <Text style={s.infoLabel}>{row.label}</Text>
                    <Text style={s.infoValue} numberOfLines={2}>{row.value || "—"}</Text>
                  </View>
                ))}

                {/* Toggle statut */}
                <View style={[s.infoRow, { paddingVertical: 14 }]}>
                  <View style={[s.infoIcon, { backgroundColor: isActive ? C.greenSoft : C.redSoft }]}>
                    <Ionicons name={isActive ? "checkmark-circle" : "close-circle"} size={15}
                      color={isActive ? C.greenDark : C.red} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoLabel}>{t("admin.userAccountStatus")}</Text>
                    <Text style={{ fontSize: 11, color: isActive ? C.greenDark : C.red, fontWeight: "600" }}>
                      {isActive ? t("admin.userStatusActive") : t("admin.userStatusInactive")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[s.toggleBtn, { backgroundColor: isActive ? C.redSoft : C.greenSoft }, toggling && { opacity: 0.5 }]}
                    onPress={() => !toggling && onToggle(user)}
                    disabled={toggling}
                    activeOpacity={0.8}
                  >
                    {toggling
                      ? <ActivityIndicator size="small" color={C.muted} />
                      : <Text style={{ fontSize: 12, fontWeight: "700", color: isActive ? C.red : C.greenDark }}>
                          {isActive ? t("admin.userDeactivate") : t("admin.userActivate")}
                        </Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}

            {tab === "cultures" && (
              userCultures.length === 0 ? (
                <View style={s.empty}>
                  <MaterialCommunityIcons name="sprout-outline" size={52} color="#d1d5db" />
                  <Text style={s.emptyText}>{t("admin.userNoCultures")}</Text>
                  <Text style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>
                    {t("admin.userNoCulturesDesc")}
                  </Text>
                </View>
              ) : (
                userCultures.map(c => (
                  <View key={c._id} style={s.cultureCard}>
                    <View style={s.cultureLeft}>
                      <View style={s.cultureIcon}>
                        <MaterialCommunityIcons name="sprout" size={18} color={C.greenDark} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cultureName}>{c.nom}</Text>
                        <Text style={s.cultureSub}>{c.variete} · {c.parcelle}</Text>
                        <Text style={s.cultureSub}>{c.surface} m²{c.nombreArbres ? ` · ${c.nombreArbres} ${t("cultures.details.trees")}` : ""}</Text>
                        {c.kcActuel != null && (
                          <Text style={{ fontSize: 11, color: C.greenDark, fontWeight: "600", marginTop: 3 }}>
                            Kc {c.kcActuel.toFixed(2)} · {c.stadeActuel || ""}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={[s.cultureSub, { textAlign: "right", flexShrink: 0 }]}>{fmtDate(c.datePlantation, language)}</Text>
                  </View>
                ))
              )
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANTS RÉUTILISABLES
// ─────────────────────────────────────────────────────────────────────────────
function FormInput({ isPassword=false, showPassword=false, onTogglePassword, icon, style, ...props }) {
  return (
    <View style={[s.inputRow, style]}>
      {icon && (
        <Ionicons name={icon} size={17} color="#9ca3af" style={{ marginHorizontal: 12, flexShrink: 0 }} />
      )}
      <TextInput
        style={[s.inputText, !icon && { paddingLeft: 14 }]}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {isPassword && (
        <TouchableOpacity
          onPress={onTogglePassword}
          activeOpacity={0.7}
          style={{ paddingHorizontal: 12 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={17} color="#9ca3af" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast notification
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ message, type = "success", visible }) {
  if (!visible) return null;
  const bg   = type === "success" ? "#16a34a" : type === "error" ? "#ef4444" : "#f59e0b";
  const icon = type === "success" ? "checkmark-circle" : type === "error" ? "close-circle" : "information-circle";
  return (
    <View style={{
      position: "absolute", top: 16, right: 16, zIndex: 9999,
      backgroundColor: bg,
      borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 10,
      flexDirection: "row", alignItems: "center", gap: 8,
      maxWidth: 280,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2, shadowRadius: 8, elevation: 10,
    }}>
      <Ionicons name={icon} size={16} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600", flexShrink: 1 }}>
        {message}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de confirmation
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmModal({ visible, title, message, onConfirm, onCancel, danger = true }) {
  const { t } = useLanguage();
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{
        position: "absolute", top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        alignItems: "center", justifyContent: "center",
        paddingHorizontal: 24,
      }}>
        <View style={{
          backgroundColor: "#fff", borderRadius: 20, padding: 28,
          width: "100%", maxWidth: 400,
          shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2, shadowRadius: 24, elevation: 12,
        }}>
          <View style={{
            width: 52, height: 52, borderRadius: 26,
            backgroundColor: danger ? "#fef2f2" : "#eff6ff",
            alignItems: "center", justifyContent: "center",
            alignSelf: "center", marginBottom: 16,
          }}>
            <Ionicons
              name={danger ? "trash-outline" : "help-circle-outline"}
              size={26} color={danger ? "#ef4444" : "#3b82f6"}
            />
          </View>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 8 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
            {message}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              style={{
                flex: 1, paddingVertical: 13, borderRadius: 12,
                borderWidth: 1, borderColor: "#e5e7eb",
                alignItems: "center", backgroundColor: "#f9fafb",
              }}
              onPress={onCancel} activeOpacity={0.8}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>{t("admin.userCancelBtn")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1, paddingVertical: 13, borderRadius: 12,
                alignItems: "center",
                backgroundColor: danger ? "#ef4444" : "#3b82f6",
              }}
              onPress={onConfirm} activeOpacity={0.85}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                {danger ? t("admin.userDeleteBtn") : t("common.confirm")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminUtilisateursPage() {
  const { t, language } = useLanguage();
  const [users,      setUsers]      = useState([]);
  const [cultures,   setCultures]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [search,     setSearch]     = useState("");

  // Modals
  const [detailUser, setDetailUser] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editUser,   setEditUser]   = useState(null);
  const [showForm,   setShowForm]   = useState(false);

  // Confirm modal + Toast
  const [confirm,    setConfirm]    = useState({ visible: false, user: null });
  const [toast,      setToast]      = useState({ visible: false, message: "", type: "success" });
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message, type });
    toastTimer.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  }, []);

  // ── Chargement ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResult, culturesRes] = await Promise.all([
        adminAPI.listUsers(),
        apiCall("GET", "/cultures"),
      ]);
      setUsers(usersResult?.users || []);
      const jc = culturesRes;
      if (jc?.success) setCultures(jc.data || []);
    } catch (e) {
      showToast(e?.message || t("admin.userLoadError"), "error");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  // ── Créer / Modifier ────────────────────────────────────────────────────────
  const openCreate = () => { setEditUser(null); setShowForm(true); };
  const openEdit   = (user) => { setEditUser(user); setShowForm(true); };

  const handleSaved = useCallback((savedUser, isEdit) => {
    if (!savedUser) return;
    const normalize = u => ({ ...u, id: u.id || u._id, _id: u._id || u.id });
    if (isEdit) {
      setUsers(prev => prev.map(u => uid(u) === uid(savedUser) ? { ...u, ...normalize(savedUser) } : u));
      if (detailUser && uid(detailUser) === uid(savedUser)) {
        setDetailUser(u => ({ ...u, ...normalize(savedUser) }));
      }
    } else {
      setUsers(prev => [normalize(savedUser), ...prev]);
    }
    showToast(isEdit ? t("admin.userUpdatedSuccess") : t("admin.userCreatedSuccess"), "success");
  }, [detailUser, t]);

  // ── Toggle statut ───────────────────────────────────────────────────────────
  const handleToggle = useCallback(async (user) => {
    const id = uid(user);
    setTogglingId(id);
    try {
      const res = await adminAPI.toggleStatus(id);
      const newStatus = res?.isActive ?? !user.isActive;
      setUsers(prev => prev.map(u => uid(u) === id ? { ...u, isActive: newStatus } : u));
      if (detailUser && uid(detailUser) === id) {
        setDetailUser(u => ({ ...u, isActive: newStatus }));
      }
    } catch (e) {
      showToast(e?.message || t("admin.userStatusError"), "error");
    } finally {
      setTogglingId(null);
    }
  }, [detailUser, t]);

  // ── Suppression ─────────────────────────────────────────────────────────────
  const handleDelete = useCallback((user) => {
    setConfirm({ visible: true, user });
  }, []);

  const doConfirmedDelete = useCallback(async () => {
    const user = confirm.user;
    if (!user) return;
    const name = `${user.firstName||""} ${user.lastName||""}`.trim() || user.email;
    const id   = uid(user);
    setConfirm({ visible: false, user: null });
    setDeletingId(id);
    try {
      await adminAPI.deleteUser(id);
      setUsers(prev => prev.filter(u => uid(u) !== id));
      if (detailUser && uid(detailUser) === id) {
        setShowDetail(false);
        setDetailUser(null);
      }
      showToast(`${name} ${t("admin.userDeletedSuccess")}`, "success");
    } catch (e) {
      showToast(e?.message || t("admin.userDeleteError"), "error");
    } finally {
      setDeletingId(null);
    }
  }, [confirm.user, detailUser, showToast, t]);

  // ── Filtrage ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => {
      const name = `${u.firstName||""} ${u.lastName||""}`.trim();
      return `${name} ${u.email||""}`.toLowerCase().includes(q);
    });
  }, [users, search]);

  const activeCount   = users.filter(u => u.isActive !== false).length;
  const inactiveCount = users.length - activeCount;

  return (
    <AdminShell activeKey="utilisateurs" title={t("admin.usersTitle")} onRefresh={load} loading={loading}>

      {/* ── Stats ── */}
      <View style={s.statRow}>
        {[
          { label: t("admin.userTotal"),    value: users.length,  bg: C.greenSoft, icon: "people-outline",          color: C.greenDark },
          { label: t("admin.userActive"),   value: activeCount,   bg: "#ecfeff",   icon: "checkmark-circle-outline", color: "#0ea5e9"   },
          { label: t("admin.userInactive"), value: inactiveCount, bg: C.redSoft,   icon: "person-remove-outline",    color: C.red       },
        ].map((stat, i) => (
          <View key={i} style={s.statCard}>
            <View style={s.statHeader}>
              <Text style={s.statLabel}>{stat.label}</Text>
              <View style={[s.iconBadge, { backgroundColor: stat.bg }]}>
                <Ionicons name={stat.icon} size={18} color={stat.color} />
              </View>
            </View>
            <Text style={s.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>

      {/* ── Tableau ── */}
      <View style={s.panel}>
        {/* Barre recherche + bouton créer */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <View style={[s.searchBox, { flex: 1 }]}>
            <Ionicons name="search" size={15} color={C.muted} />
            <TextInput
              placeholder={t("admin.userSearch")}
              placeholderTextColor={C.muted}
              value={search}
              onChangeText={setSearch}
              style={s.searchInput}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top:6, bottom:6, left:6, right:6 }}>
                <Ionicons name="close-circle" size={15} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={s.createBtn} onPress={openCreate} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.createBtnText}>{t("admin.userNew")}</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.count}>{filtered.length} {t("admin.userCount")}</Text>

        {/* En-têtes tableau */}
        <View style={s.thead}>
          <Text style={[s.th, { flex: 2.2 }]}>{t("admin.colName")}</Text>
          <Text style={[s.th, { flex: 2 }]}>{t("admin.colEmail")}</Text>
          <Text style={[s.th, { flex: 0.9 }]}>{t("admin.colStatus")}</Text>
          <Text style={[s.th, { flex: 1, textAlign: "right" }]}>{t("admin.colActions")}</Text>
        </View>

        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={42} color="#d1d5db" />
            <Text style={s.emptyText}>{t("admin.userNone")}</Text>
          </View>
        ) : (
          filtered.map(user => {
            const id       = uid(user);
            const fullName = `${user.firstName||""} ${user.lastName||""}`.trim();
            const isActive = user.isActive !== false;
            const isDeleting = deletingId === id;
            const isToggling = togglingId === id;
            const nbCult = cultures.filter(c => String(c.userId?._id || c.userId) === id).length;

            return (
              <View key={id} style={s.row}>
                {/* Nom — cliquable pour voir le détail */}
                <TouchableOpacity
                  style={[s.nameCell, { flex: 2.2 }]}
                  onPress={() => { setDetailUser(user); setShowDetail(true); }}
                  activeOpacity={0.7}
                >
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials(user.firstName, user.lastName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowName} numberOfLines={1}>{fullName || "—"}</Text>
                    <Text style={s.rowSub}>{fmtDate(user.createdAt, language)}</Text>
                    {nbCult > 0 && (
                      <Text style={s.cultBadge}>
                        🌿 {nbCult} {t("admin.userTabCultures").toLowerCase()}{nbCult > 1 ? "s" : ""}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Email */}
                <Text style={[s.rowEmail, { flex: 2 }]} numberOfLines={1}>{user.email}</Text>

                {/* Statut */}
                <View style={{ flex: 0.9 }}>
                  <View style={[s.badge, isActive ? s.badgeOn : s.badgeOff]}>
                    <Text style={[s.badgeText, { color: isActive ? C.greenDark : C.red }]}>
                      {isActive ? t("admin.userActive_label") : t("admin.userInactive_label")}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={[s.actionsCell, { flex: 1 }]}>
                  {/* Voir */}
                  <TouchableOpacity style={s.btnEye} activeOpacity={0.7}
                    onPress={() => { setDetailUser(user); setShowDetail(true); }}
                    hitSlop={{ top:5, bottom:5, left:5, right:5 }}>
                    <Ionicons name="eye-outline" size={15} color={C.greenDark} />
                  </TouchableOpacity>

                  {/* Modifier */}
                  <TouchableOpacity style={s.btnEdit} activeOpacity={0.7}
                    onPress={() => openEdit(user)}
                    hitSlop={{ top:5, bottom:5, left:5, right:5 }}>
                    <Ionicons name="pencil" size={14} color={C.blue} />
                  </TouchableOpacity>

                  {/* Supprimer */}
                  <TouchableOpacity
                    style={[s.btnDel, isDeleting && { opacity: 0.4 }]}
                    activeOpacity={0.7}
                    onPress={() => handleDelete(user)}
                    disabled={isDeleting}
                    hitSlop={{ top:5, bottom:5, left:5, right:5 }}>
                    {isDeleting
                      ? <ActivityIndicator size="small" color={C.red} style={{ width:15, height:15 }} />
                      : <Ionicons name="trash-outline" size={15} color={C.red} />
                    }
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ── Modal détail ── */}
      <UserDetailModal
        user={detailUser}
        visible={showDetail}
        onClose={() => { setShowDetail(false); setDetailUser(null); }}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggle={handleToggle}
        allCultures={cultures}
        toggling={togglingId === uid(detailUser)}
      />

      {/* ── Modal créer/modifier ── */}
      <UserFormModal
        visible={showForm}
        user={editUser}
        onClose={() => setShowForm(false)}
        onSave={handleSaved}
      />

      {/* ── Modal confirmation suppression ── */}
      <ConfirmModal
        visible={confirm.visible}
        title={t("admin.userDeleteTitle")}
        message={`${t("admin.userDeleteConfirm")}\n\n${t("admin.userDeleteIrreversible")}`}
        onConfirm={doConfirmedDelete}
        onCancel={() => setConfirm({ visible: false, user: null })}
        danger
      />

      {/* ── Toast notification ── */}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </AdminShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  statRow:    { flexDirection:"row", gap:10, marginBottom:14 },
  statCard:   { flex:1, backgroundColor:C.surface, borderRadius:14, padding:12, borderWidth:1, borderColor:C.border },
  statHeader: { flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start" },
  statLabel:  { fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, flexShrink:1 },
  statValue:  { marginTop:6, fontSize:24, fontWeight:"700", color:C.text },
  iconBadge:  { width:32, height:32, borderRadius:10, alignItems:"center", justifyContent:"center", flexShrink:0 },
  panel:      { backgroundColor:C.surface, borderRadius:16, padding:14, borderWidth:1, borderColor:C.border },
  searchBox:  { flexDirection:"row", alignItems:"center", backgroundColor:"#f8fafc", borderRadius:12, borderWidth:1, borderColor:C.border, paddingHorizontal:12, height:42, gap:8 },
  searchInput:{ flex:1, fontSize:13, color:C.text },
  createBtn:  { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:C.greenDark, paddingHorizontal:14, height:42, borderRadius:12 },
  createBtnText:{ color:"#fff", fontSize:13, fontWeight:"700" },
  count:      { fontSize:12, color:C.muted, marginBottom:8 },
  thead:      { flexDirection:"row", paddingVertical:8, borderBottomWidth:1, borderBottomColor:C.border },
  th:         { fontSize:10, textTransform:"uppercase", letterSpacing:0.5, color:C.muted, fontWeight:"700" },
  row:        { flexDirection:"row", alignItems:"center", paddingVertical:11, borderBottomWidth:1, borderBottomColor:C.border },
  nameCell:   { flexDirection:"row", alignItems:"center", gap:8 },
  avatar:     { width:36, height:36, borderRadius:12, backgroundColor:C.greenSoft, alignItems:"center", justifyContent:"center", flexShrink:0 },
  avatarText: { fontSize:13, fontWeight:"700", color:C.greenDark },
  rowName:    { fontSize:13, fontWeight:"700", color:C.text },
  rowSub:     { fontSize:11, color:C.muted, marginTop:2 },
  rowEmail:   { fontSize:11, color:C.muted },
  cultBadge:  { fontSize:10, color:C.greenDark, fontWeight:"600", marginTop:3 },
  actionsCell:{ flexDirection:"row", gap:6, justifyContent:"flex-end", alignItems:"center" },
  btnEye:     { width:30, height:30, borderRadius:9, backgroundColor:C.greenSoft, alignItems:"center", justifyContent:"center" },
  btnEdit:    { width:30, height:30, borderRadius:9, backgroundColor:C.blueSoft, alignItems:"center", justifyContent:"center" },
  btnDel:     { width:30, height:30, borderRadius:9, backgroundColor:C.redSoft, alignItems:"center", justifyContent:"center" },
  badge:      { paddingHorizontal:8, paddingVertical:3, borderRadius:8, alignSelf:"flex-start" },
  badgeOn:    { backgroundColor:C.greenSoft },
  badgeOff:   { backgroundColor:C.redSoft },
  badgeText:  { fontSize:11, fontWeight:"700" },
  empty:      { alignItems:"center", paddingVertical:32, gap:8 },
  emptyText:  { fontSize:14, color:C.muted, fontWeight:"600" },
  // Modal partagé
  overlay:        { flex:1, backgroundColor:"rgba(0,0,0,0.45)", justifyContent:"flex-end" },
  sheet:          { backgroundColor:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24 },
  handle:         { width:40, height:4, backgroundColor:"#e2e8f0", borderRadius:2, alignSelf:"center", marginTop:12, marginBottom:4 },
  sheetHeader:    { flexDirection:"row", alignItems:"center", gap:10, paddingHorizontal:20, paddingVertical:14, borderBottomWidth:1, borderBottomColor:C.border },
  sheetAvatar:    { width:46, height:46, borderRadius:14, backgroundColor:C.greenSoft, alignItems:"center", justifyContent:"center" },
  sheetAvatarText:{ fontSize:17, fontWeight:"700", color:C.greenDark },
  sheetName:      { fontSize:15, fontWeight:"700", color:C.text },
  sheetEmail:     { fontSize:12, color:C.muted, marginTop:1 },
  iconBtn:        { width:36, height:36, borderRadius:11, backgroundColor:"#f1f5f9", alignItems:"center", justifyContent:"center" },
  tabs:           { flexDirection:"row", borderBottomWidth:1, borderBottomColor:C.border },
  tab:            { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, paddingVertical:13, borderBottomWidth:2, borderBottomColor:"transparent" },
  tabActive:      { borderBottomColor:C.greenDark },
  tabText:        { fontSize:13, fontWeight:"600", color:C.muted },
  tabTextActive:  { color:C.greenDark },
  infoRow:        { flexDirection:"row", alignItems:"center", gap:10, backgroundColor:"#f8fafc", borderRadius:12, padding:12 },
  infoIcon:       { width:32, height:32, borderRadius:10, backgroundColor:C.greenSoft, alignItems:"center", justifyContent:"center", flexShrink:0 },
  infoLabel:      { flex:1, fontSize:13, color:C.muted, fontWeight:"600" },
  infoValue:      { fontSize:13, fontWeight:"700", color:C.text, textAlign:"right", flexShrink:1, maxWidth:"50%" },
  toggleBtn:      { paddingHorizontal:12, paddingVertical:7, borderRadius:10 },
  cultureCard:    { flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start", backgroundColor:"#f8fafc", borderRadius:14, padding:14, borderWidth:1, borderColor:C.border },
  cultureLeft:    { flexDirection:"row", alignItems:"flex-start", gap:10, flex:1 },
  cultureIcon:    { width:34, height:34, borderRadius:10, backgroundColor:C.greenSoft, alignItems:"center", justifyContent:"center", flexShrink:0 },
  cultureName:    { fontSize:14, fontWeight:"700", color:C.text },
  cultureSub:     { fontSize:11, color:C.muted, marginTop:2 },
  // Form
  fieldLabel: { fontSize:13, color:C.text, fontWeight:"600", marginBottom:6 },
  inputRow:   { flexDirection:"row", alignItems:"center", borderWidth:1, borderColor:"#e5e7eb", borderRadius:12, backgroundColor:"#f9fafb", height:48, overflow:"hidden" },
  inputText:  { flex:1, fontSize:14, color:C.text, paddingVertical:0, paddingRight:14, outlineStyle:"none", outlineWidth:0 },
  fieldInput: { borderWidth:1, borderColor:"#e5e7eb", borderRadius:12, paddingVertical:12, paddingHorizontal:14, fontSize:14, color:C.text, backgroundColor:"#f9fafb" },
  switchRow:  { flexDirection:"row", alignItems:"center", gap:12, backgroundColor:"#f8fafc", borderRadius:12, padding:14 },
  saveBtn:    { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, paddingVertical:15, borderRadius:50, marginTop:8 },
  saveBtnText:{ color:"#fff", fontWeight:"700", fontSize:15 },
  errBox:     { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#fef2f2", borderWidth:1, borderColor:"#fecaca", borderRadius:12, padding:12 },
  errText:    { color:"#dc2626", fontSize:13, flex:1, fontWeight:"500" },
  // Password row
  pwdRow:     { flexDirection:"row", alignItems:"center", borderWidth:1, borderColor:"#e5e7eb", borderRadius:12, backgroundColor:"#f9fafb", height:48, overflow:"hidden" },
  pwdInput:   { flex:1, fontSize:14, color:"#111827", paddingVertical:0, outlineStyle:"none", outlineWidth:0 },
});