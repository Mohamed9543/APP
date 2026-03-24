import { API_ENDPOINTS, apiFetch } from '../config/api';

class CultureService {
  async getAllCultures() {
    try {
      const response = await apiFetch(API_ENDPOINTS.cultures.base);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur récupération cultures:', error);
      throw error;
    }
  }

  async addCulture(cultureData) {
    try {
      const response = await apiFetch(API_ENDPOINTS.cultures.base, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cultureData),
      });
      return await response.json();
    } catch (error) {
      console.error('Erreur ajout culture:', error);
      throw error;
    }
  }

  async deleteCulture(id) {
    try {
      const response = await apiFetch(API_ENDPOINTS.cultures.byId(id), {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      console.error('Erreur suppression culture:', error);
      throw error;
    }
  }
}

export default new CultureService();
