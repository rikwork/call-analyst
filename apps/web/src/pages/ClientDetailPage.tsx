import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Mic,
  FileText,
  Sparkles,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { Client, ConsultationSession } from '../types';
import { api } from '../api';
import { ClientDossierView } from '../components/ClientDossierView';

interface ClientDetailPageProps {
  clientId: string;
  onBack: () => void;
  onSelectSession: (session: ConsultationSession) => void;
  onStartSessionForClient: (client: Client) => void;
}

export const ClientDetailPage: React.FC<ClientDetailPageProps> = ({
  clientId,
  onBack,
  onSelectSession,
  onStartSessionForClient,
}) => {
  const [client, setClient] = useState<Client | null>(null);
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [activeTab, setActiveTab] = useState<'dossier' | 'sessions'>('dossier');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [cData, sData] = await Promise.all([
        api.getClient(clientId),
        api.getSessions(clientId),
      ]);
      setClient(cData);
      setSessions(sData);
    } catch (err) {
      console.error('Error loading client details:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);

    // Auto-refresh every 3.5s to immediately pick up newly completed desktop recordings
    const interval = setInterval(() => {
      loadData(true);
    }, 3500);

    return () => clearInterval(interval);
  }, [clientId]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m} мин ${s} сек`;
  };

  const formatExactTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('ru-RU');
    const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${date} в ${time}`;
  };

  if (isLoading || !client) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <p>Загрузка досье и истории сессий...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Header Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад ко всем клиентам</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData(false)}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-sm transition flex items-center space-x-1.5"
            title="Обновить список"
          >
            <span>Обновить</span>
          </button>

          <button
            onClick={() => onStartSessionForClient(client)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-medium text-sm shadow-md transition"
          >
            <Mic className="w-4 h-4" />
            <span>Начать сессию с клиентом</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('dossier')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'dossier'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Живое Досье & Концептуализация
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'sessions'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          История сессий ({sessions.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'dossier' && (
        <ClientDossierView client={client} dossier={client.dossier} />
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
              <Mic className="w-8 h-8 mx-auto text-slate-300" />
              <p>У данного клиента еще нет сохраненных сессий.</p>
              <button
                onClick={() => onStartSessionForClient(client)}
                className="px-4 py-2 bg-brand-700 text-white text-xs font-semibold rounded-xl"
              >
                Записать первую консультацию
              </button>
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectSession(s)}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md hover:border-brand-300 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-base text-slate-900">{s.title}</span>
                    <span className="text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      {s.status}
                    </span>
                    {(s as any).audio_file_path && (
                      <span className="text-[10px] uppercase tracking-wider bg-teal-50 text-teal-800 font-semibold px-2 py-0.5 rounded-full border border-teal-200">
                        Аудио прикреплено
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1 font-mono text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-brand-600" />
                      {formatExactTime(s.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(s.duration_seconds || 115)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      Заметок: {s.notes?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {s.analysis && (
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-semibold text-slate-900">
                        Альянс: {s.analysis.therapeutic_alliance_score}/10
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        Успехов: {s.analysis.strengths.length}
                      </div>
                    </div>
                  )}
                  <div className="p-2 rounded-xl bg-slate-50 text-brand-700 hover:bg-brand-50 transition">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
};
