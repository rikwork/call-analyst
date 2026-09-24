import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Mic,
  Share2,
  Sparkles,
} from 'lucide-react';
import { ConsultationSession } from '../types';
import { api } from '../api';
import { AudioPlayerWithTranscript } from '../components/AudioPlayerWithTranscript';
import { SessionSupervisionCard } from '../components/SessionSupervisionCard';
import { formatDate, formatDuration } from '../utils/formatters';

interface SessionDetailPageProps {
  sessionId: string;
  onBack: () => void;
}

export const SessionDetailPage: React.FC<SessionDetailPageProps> = ({
  sessionId,
  onBack,
}) => {
  const [session, setSession] = useState<ConsultationSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      try {
        const data = await api.getSession(sessionId);
        setSession(data);
      } catch (err) {
        console.error('Error loading session:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, [sessionId]);

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Sparkles className="w-6 h-6 animate-spin text-brand-600 mr-2" />
        <span>Загружаем запись и ИИ-супервизию...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к карточке клиента</span>
        </button>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono bg-brand-50 text-brand-800 px-3 py-1 rounded-full border border-brand-200 font-semibold">
            2-Канальная запись (Zoom / TG)
          </span>
        </div>
      </div>

      {/* Title & Metadata Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <span>СЕССИЯ #{session.session_number}</span>
            <span>•</span>
            <span>{formatDate(session.created_at)}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{session.title}</h1>
        </div>

        <div className="flex items-center space-x-6 text-xs text-slate-500">
          <div>
            Длительность: <strong className="text-slate-900">{formatDuration(session.duration_seconds)}</strong>
          </div>
          <div>
            Реплик в диалоге: <strong className="text-slate-900">{session.utterances?.length || 0}</strong>
          </div>
          <div>
            Заметок: <strong className="text-slate-900">{session.notes?.length || 0}</strong>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Player/Transcript vs Right AI Supervision */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Audio Waveform & Clickable Transcript */}
        <div className="lg:col-span-7 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
            Синхронизированная запись & Стенограмма (Sber GigaAM v2)
          </div>
          <AudioPlayerWithTranscript
            utterances={session.utterances || []}
            notes={session.notes || []}
            durationSeconds={session.duration_seconds || 120}
            audioUrl={session.audio_file_path ? `/api/v1/sessions/${session.id}/audio` : undefined}
          />
        </div>

        {/* Right Column (5 cols): AI Clinical Supervision Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Клиническая супервизия (Gemini 3.7 Flash)</span>
          </div>
          <SessionSupervisionCard analysis={session.analysis} />
        </div>

      </div>

    </div>
  );
};
