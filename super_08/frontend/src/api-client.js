const API_BASE_URL = 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.mensaje || 'Error en la solicitud');
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // ========== ENDPOINTS GET ==========
  
  // Supervisor
  async getSupervisor() {
    return this.request('/supervisor');
  }

  async getSupervisorStats() {
    return this.request('/supervisor/estadisticas');
  }

  // Incidencias
  async getIncidencias(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/incidencias${queryParams ? `?${queryParams}` : ''}`;
    return this.request(endpoint);
  }

  async getIncidenciaById(id) {
    return this.request(`/incidencias/${id}`);
  }

  async getIncidenciaHistorial(id) {
    return this.request(`/incidencias/${id}/historial`);
  }

  // Trabajadores
  async getTrabajadores() {
    return this.request('/trabajadores');
  }

  // Dashboard
  async getDashboard() {
    return this.request('/dashboard');
  }

  // Búsqueda
  async buscarIncidencias(query) {
    return this.request(`/buscar?q=${encodeURIComponent(query)}`);
  }

  // ========== ENDPOINTS PATCH ==========
  
  async patchIncidencia(id, data) {
    return this.request(`/incidencias/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async patchComentario(id, comentario) {
    return this.request(`/incidencias/${id}/comentario`, {
      method: 'PATCH',
      body: JSON.stringify({ comentario }),
    });
  }

  async patchReabrirIncidencia(id) {
    return this.request(`/incidencias/${id}/reabrir`, {
      method: 'PATCH',
    });
  }

  // ========== MÉTODOS COMPATIBILIDAD (opcionales) ==========
  
  // Para mantener compatibilidad con código existente
  async updateIncidencia(id, data) {
    return this.patchIncidencia(id, data);
  }

  async updateComentario(id, comentario) {
    return this.patchComentario(id, comentario);
  }

  async reabrirIncidencia(id) {
    return this.patchReabrirIncidencia(id);
  }
}

export default new ApiClient();