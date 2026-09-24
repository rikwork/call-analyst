import {
  Client,
  ConsultationSession,
  SessionNote,
  ClinicalProtocol,
  AnalysisTemplate,
  LongitudinalAnalysisResult,
} from './types';

const API_BASE = '/api/v1';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Clients
  async getClients(): Promise<Client[]> {
    return fetchJSON<Client[]>('/clients');
  },

  async getClient(id: string): Promise<Client> {
    return fetchJSON<Client>(`/clients/${id}`);
  },

  async createClient(data: Partial<Client>): Promise<Client> {
    return fetchJSON<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    return fetchJSON<Client>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getLongitudinalAnalysis(clientId: string): Promise<LongitudinalAnalysisResult> {
    return fetchJSON<LongitudinalAnalysisResult>(`/clients/${clientId}/longitudinal-analysis`, {
      method: 'POST',
    });
  },

  // Sessions
  async getSessions(clientId?: string): Promise<ConsultationSession[]> {
    const query = clientId ? `?client_id=${clientId}` : '';
    return fetchJSON<ConsultationSession[]>(`/sessions${query}`);
  },

  async getSession(id: string): Promise<ConsultationSession> {
    return fetchJSON<ConsultationSession>(`/sessions/${id}`);
  },

  async createSession(data: { client_id: string; title?: string; template_id?: string }): Promise<ConsultationSession> {
    return fetchJSON<ConsultationSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async addSessionNote(sessionId: string, note: { timestamp_seconds: number; content: string; category?: string }): Promise<SessionNote> {
    return fetchJSON<SessionNote>(`/sessions/${sessionId}/notes`, {
      method: 'POST',
      body: JSON.stringify(note),
    });
  },

  async finishSession(sessionId: string, audioFile?: File | Blob, durationSeconds?: number): Promise<ConsultationSession> {
    if (audioFile) {
      const formData = new FormData();
      formData.append('audio_file', audioFile, 'recording.webm');
      if (durationSeconds !== undefined && durationSeconds > 0) {
        formData.append('duration_seconds', durationSeconds.toString());
      }
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/finish`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to finish session with audio');
      }
      return res.json();
    }
    return fetchJSON<ConsultationSession>(`/sessions/${sessionId}/finish`, {
      method: 'POST',
    });
  },

  // Protocols
  async getProtocols(modality?: string): Promise<ClinicalProtocol[]> {
    const query = modality ? `?modality=${modality}` : '';
    return fetchJSON<ClinicalProtocol[]>(`/protocols${query}`);
  },

  // Templates & Admin Studio
  async getTemplates(domain?: string): Promise<AnalysisTemplate[]> {
    const query = domain ? `?domain=${domain}` : '';
    return fetchJSON<AnalysisTemplate[]>(`/templates${query}`);
  },

  async updateTemplate(id: string, data: Partial<AnalysisTemplate>): Promise<AnalysisTemplate> {
    return fetchJSON<AnalysisTemplate>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
