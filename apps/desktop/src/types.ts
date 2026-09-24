export interface Client {
  id: string;
  tenant_id?: string;
  specialist_id?: string;
  first_name: string;
  last_name: string;
  modality: string;
  initial_complaint?: string;
  created_at?: string;
}

export interface DesktopNote {
  timestamp: number;
  timeStr: string;
  content: string;
  category: string;
}

export interface SessionNote {
  id?: string;
  session_id?: string;
  timestamp_seconds: number;
  content: string;
  category: 'observation' | 'technique' | 'emotion' | 'homework' | string;
  created_at?: string;
}

export interface ConsultationSession {
  id: string;
  client_id: string;
  title: string;
  status?: string;
  duration_seconds?: number;
}

export interface ElectronAPI {
  closeWindow: () => void;
  minimizeWindow: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
