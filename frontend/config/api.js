import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ TOUJOURS utiliser Render — plus jamais l'IP locale
export const API_BASE_URL = 'https://smartirrigation-2.onrender.com/api';

// ── Endpoints ─────────────────────────────────────────────────────────────────
export const API_ENDPOINTS = {
  auth: {
    login:          `${API_BASE_URL}/auth/login`,
    adminLogin:     `${API_BASE_URL}/admin/login`,
    register:       `${API_BASE_URL}/auth/register`,
    forgotPassword: `${API_BASE_URL}/auth/forgot-password`,
    verifyCode:     `${API_BASE_URL}/auth/verify-code`,
    resetPassword:  `${API_BASE_URL}/auth/reset-password`,
    profile:        `${API_BASE_URL}/auth/profile`,
    google:         `${API_BASE_URL}/auth/google`,
  },
  weather: {
    current:      `${API_BASE_URL}/weather/current`,
    history:      `${API_BASE_URL}/weather/history`,
    forecast:     `${API_BASE_URL}/weather/forecast`,
    calculateET0: `${API_BASE_URL}/weather/calculate-et0`,
    calculateETc: `${API_BASE_URL}/weather/calculate-etc`,
  },
  kc: {
    search:  `${API_BASE_URL}/kc/search`,
    mensuel: (culture) => `${API_BASE_URL}/kc/mensuel/${encodeURIComponent(culture)}`,
    current: (culture, mois) =>
      `${API_BASE_URL}/kc/current?culture=${encodeURIComponent(culture)}${mois ? `&mois=${mois}` : ''}`,
    init: `${API_BASE_URL}/kc/init`,
  },
  cultures: {
    base: `${API_BASE_URL}/cultures`,
    byId: (id) => `${API_BASE_URL}/cultures/${id}`,
  },
  irrigations: {
    base:           `${API_BASE_URL}/irrigations`,
    byCulture:      (id) => `${API_BASE_URL}/irrigations/culture/${id}`,
    today:          `${API_BASE_URL}/irrigations/today`,
    calculateNeeds: (id) => `${API_BASE_URL}/irrigations/calculate-needs/${id}`,
    etcHistory:     (id, days = 30) => `${API_BASE_URL}/irrigations/etc-history/${id}?days=${days}`,
  },
  admin: {
    stats:       `${API_BASE_URL}/admin/stats`,
    users:       `${API_BASE_URL}/admin/users`,
    volumeByDay: (days = 30) => `${API_BASE_URL}/admin/irrigations/volume-by-day?days=${days}`,
  },
  users: {
    base: `${API_BASE_URL}/users`,
    byId: (id) => `${API_BASE_URL}/users/${id}`,
  },
};

// ── apiFetch : wrapper fetch avec timeout ─────────────────────────────────────
const TIMEOUT_MS = 30000;

export async function apiFetch(urlOrPath, options = {}) {
  const { timeoutMs = TIMEOUT_MS, ...fetchOptions } = options;

  const url = urlOrPath.startsWith('http')
    ? urlOrPath
    : `${API_BASE_URL}${urlOrPath.startsWith('/') ? urlOrPath : '/' + urlOrPath}`;

  // Ajouter automatiquement le token Authorization
  let authHeader = {};
  try {
    const token =
      await AsyncStorage.getItem('userToken') ||
      await AsyncStorage.getItem('adminToken');
    if (token) authHeader = { Authorization: `Bearer ${token}` };
  } catch {}

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const mergedOptions = {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(fetchOptions.headers || {}),
    },
    signal: controller.signal,
  };

  try {
    const response = await fetch(url, mergedOptions);
    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      throw new Error('Délai dépassé — vérifiez votre connexion internet');
    }
    if (String(error.message).includes('Network') || String(error.message).includes('fetch')) {
      throw new Error('Serveur inaccessible. Vérifiez votre connexion.');
    }
    throw error;
  }
}