export type UserRole = 'super_admin' | 'org_admin' | 'specialist' | 'supervisor';

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  specialty: string;
  role: UserRole;
}

export interface ClientDossier {
  id: string;
  client_id: string;
  case_formulation: {
    predisposing_factors?: string;
    precipitating_factors?: string;
    perpetuating_factors?: string;
    protective_factors?: string;
    [key: string]: any;
  };
  therapeutic_goals: Array<{
    goal: string;
    status: 'active' | 'in_progress' | 'completed' | 'planned';
    progress: number;
  }>;
  psychological_patterns: Array<{
    pattern: string;
    frequency: string;
    impact: string;
  }>;
  homework_tracker: Array<{
    task: string;
    status: string;
    assigned_session_id?: string;
    assigned_at?: string;
  }>;
  timeline_and_entities: Array<{
    entity: string;
    relation: string;
    influence: string;
  }>;
  longitudinal_summary?: string;
  version: number;
  updated_at: string;
}

export interface Client {
  id: string;
  tenant_id: string;
  specialist_id: string;
  first_name: string;
  last_name: string;
  pseudonym?: string;
  contact_info?: string;
  modality: string;
  initial_complaint?: string;
  created_at: string;
  session_count: number;
  last_session_at?: string;
  dossier?: ClientDossier;
}

export interface SessionNote {
  id: string;
  session_id: string;
  timestamp_seconds: number;
  content: string;
  category: 'observation' | 'intervention' | 'emotion' | 'homework';
  created_at: string;
}

export interface TranscriptUtterance {
  id: string;
  session_id: string;
  speaker: string;
  start_time: number;
  end_time: number;
  text: string;
  confidence: number;
  sentiment?: string;
  tags: string[];
}

export interface SessionAnalysis {
  id: string;
  session_id: string;
  strengths: Array<{
    title: string;
    description: string;
    quote?: string;
  }>;
  growth_areas: Array<{
    title: string;
    description: string;
    recommendation: string;
  }>;
  active_listening_score: number;
  therapeutic_alliance_score: number;
  key_themes: string[];
  cognitive_distortions: Array<{
    type: string;
    utterance: string;
    explanation: string;
  }>;
  recommended_interventions: Array<{
    protocol_code: string;
    title: string;
    action_steps: string;
    evidence_citation?: string;
  }>;
  suggested_homework: string[];
  risk_assessment: {
    risk_level: string;
    suicide_risk?: boolean;
    self_harm_risk?: boolean;
    clinical_alert?: string;
  };
  executive_summary?: string;
  generated_at: string;
}

export interface ConsultationSession {
  id: string;
  client_id: string;
  specialist_id: string;
  session_number: number;
  title: string;
  status: 'recording' | 'uploaded' | 'transcribing' | 'analyzing' | 'completed' | 'failed';
  duration_seconds: number;
  channel_count: number;
  audio_file_path?: string;
  started_at: string;
  ended_at?: string;
  created_at: string;
  notes: SessionNote[];
  utterances: TranscriptUtterance[];
  analysis?: SessionAnalysis;
}

export interface ClinicalProtocol {
  id: string;
  code: string;
  title: string;
  modality: string;
  target_symptoms: string[];
  algorithm_steps: string[];
  contraindications: string[];
  evidence_base: Array<{
    citation: string;
    doi?: string;
    summary: string;
  }>;
  description?: string;
}

export interface AnalysisTemplate {
  id: string;
  tenant_id?: string;
  slug: string;
  name: string;
  domain: string;
  is_default: boolean;
  system_prompt: string;
  session_analysis_prompt: string;
  longitudinal_prompt: string;
  extraction_schema: Record<string, any>;
  scoring_rubrics: Array<{
    metric: string;
    weight: number;
    scale_max: number;
  }>;
}

export interface LongitudinalAnalysisResult {
  client_id: string;
  client_name: string;
  total_sessions_analyzed: number;
  case_formulation: Record<string, any>;
  core_hypotheses: string[];
  therapeutic_progress: Array<{
    milestone: string;
    status: string;
    progress_pct: number;
  }>;
  recommended_interventions: Array<{
    protocol_code: string;
    title: string;
    clinical_rationale: string;
    evidence_citation: string;
  }>;
  risk_profile: Record<string, any>;
  full_supervision_report_markdown: string;
}
