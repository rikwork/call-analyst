import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  FileText,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  Sliders,
  Database,
  Music,
  CheckCircle,
} from 'lucide-react';
import { AnalysisTemplate, ConsultationSession, Client } from '../types';
import { api } from '../api';
import { PromptStudioAdmin } from '../components/PromptStudioAdmin';
import { formatExactTime, formatDuration } from '../utils/formatters';

interface AdminTemplatesPageProps {
  onSelectSession?: (session: ConsultationSession) => void;
}

export const AdminTemplatesPage: React.FC<AdminTemplatesPageProps> = ({ onSelectSession }) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'prompts'>('sessions');
  const [templates, setTemplates] = useState<AnalysisTemplate[]>([]);
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [tData, sData, cData] = await Promise.all([
        api.getTemplates(),
        api.getSessions(),
        api.getClients(),
      ]);
      setTemplates(tData);
      setSessions(sData);

      const clientMap: Record<string, Client> = {};
      cData.forEach((c) => {
        clientMap[c.id] = c;
      });
      setClients(clientMap);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      if (!silent) setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);

    // Background auto-refresh every 3.5 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <p>Загрузка данных админ-панели и журнала сессий...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Администрирование & Журнал сессий
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Сквозной аудит аудиозаписей, точное время отправки и управление ИИ-промптами.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brand-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'sessions'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Журнал всех сессий ({sessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('prompts')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'prompts'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Prompt & Rubric Studio</span>
        </button>
      </div>

      {/* Tab 1: All Sessions Audit Table */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Все загруженные консультации и записи с десктоп-виджета
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Авто-обновление активно
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-white">
                    <th className="py-3 px-4">Клиент</th>
                    <th className="py-3 px-4">Название сессии</th>
                    <th className="py-3 px-4">Точное время отправки</th>
                    <th className="py-3 px-4">Длительность</th>
                    <th className="py-3 px-4">Статус & Аудио</th>
                    <th className="py-3 px-4">ИИ Альянс</th>
                    <th className="py-3 px-4 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Пока нет отправленных сессий. Запустите десктоп-рекордер и проведите первую запись.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => {
                      const client = clients[s.client_id];
                      return (
                        <tr
                          key={s.id}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => onSelectSession && onSelectSession(s)}
                        >
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {client ? (
                              <div>
                                <span>{client.first_name} {client.last_name}</span>
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {client.modality}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">{s.client_id}</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {s.title}
                          </td>

                          <td className="py-3 px-4 font-mono text-slate-700 font-medium whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <Calendar className="w-3.5 h-3.5 text-brand-600" />
                              <span>{formatExactTime(s.created_at)}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{formatDuration(s.duration_seconds)}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                s.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.status === 'analyzing'
                                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {s.status}
                              </span>
                              {(s as any).audio_file_path && (
                                <span className="inline-flex items-center text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                  <Music className="w-3 h-3 mr-0.5" />
                                  WAV
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {s.analysis ? (
                              <div className="flex items-center space-x-1 font-semibold text-slate-900">
                                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                                <span>{s.analysis.therapeutic_alliance_score}/10</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectSession) onSelectSession(s);
                              }}
                              className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold transition"
                            >
                              <span>Открыть разбор</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Prompt Studio */}
      {activeTab === 'prompts' && (
        <PromptStudioAdmin
          templates={templates}
          onTemplateUpdated={() => loadData(false)}
        />
      )}

    </div>
  );
};
