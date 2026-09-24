import React, { useState } from 'react';
import {
  Brain,
  Target,
  Layers,
  Sparkles,
  ExternalLink,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Client, ClientDossier, LongitudinalAnalysisResult } from '../types';
import { api } from '../api';
import { formatDate } from '../utils/formatters';

interface ClientDossierViewProps {
  client: Client;
  dossier?: ClientDossier;
}

export const ClientDossierView: React.FC<ClientDossierViewProps> = ({ client, dossier }) => {
  const [longitudinalResult, setLongitudinalResult] = useState<LongitudinalAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleGenerateLongitudinal = async () => {
    setIsLoading(true);
    try {
      const result = await api.getLongitudinalAnalysis(client.id);
      setLongitudinalResult(result);
    } catch (err) {
      console.error('Failed to generate longitudinal analysis:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formulation = dossier?.case_formulation || {};
  const goals = dossier?.therapeutic_goals || [];
  const patterns = dossier?.psychological_patterns || [];
  const timeline = dossier?.timeline_and_entities || [];

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-wider font-semibold bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full border border-brand-200">
              Living Clinical Dossier v{dossier?.version || 1}
            </span>
            <span className="text-xs text-slate-400">
              Обновлено: {formatDate(dossier?.updated_at || Date.now())}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Клиническая карта: {client.first_name} {client.last_name}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Модальность: <span className="font-semibold text-slate-700">{client.modality}</span> • Сессий пройдено: {client.session_count}
          </p>
        </div>

        {/* Big Action Button for History Analysis */}
        <button
          onClick={handleGenerateLongitudinal}
          disabled={isLoading}
          className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-brand-700 to-teal-800 hover:from-brand-800 hover:to-teal-900 text-white font-semibold text-sm shadow-md shadow-brand-700/20 transition disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 text-brand-200 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Анализируем историю (Gemini 3.7)...' : 'Сформировать сквозной анализ истории'}</span>
        </button>
      </div>

      {/* LONGITUDINAL REPORT MODAL / EXPANDED SECTION */}
      {longitudinalResult && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-xl border border-slate-700 space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-brand-400" />
              <h3 className="font-bold text-lg text-white">
                Лонгитюдный супервизорский отчет ({longitudinalResult.total_sessions_analyzed} сессий)
              </h3>
            </div>
            <span className="text-xs bg-brand-900/60 text-brand-300 px-2.5 py-1 rounded-full border border-brand-700/40">
              Evidence-Based Recommendations
            </span>
          </div>

          {/* Core Hypotheses */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand-300">
              Ключевые гипотезы случая:
            </div>
            <ul className="space-y-1.5">
              {longitudinalResult.core_hypotheses.map((h, i) => (
                <li key={i} className="text-xs text-slate-200 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60 flex items-start space-x-2">
                  <ArrowRight className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Interventions with Research Citations */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand-300 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Рекомендованные техники и доказательная база:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {longitudinalResult.recommended_interventions.map((rec, i) => (
                <div key={i} className="bg-slate-800 p-3.5 rounded-xl border border-slate-700 text-xs space-y-2">
                  <div className="font-bold text-sm text-white">{rec.title}</div>
                  <p className="text-slate-300">{rec.clinical_rationale}</p>
                  <div className="bg-slate-900/90 p-2 rounded border border-slate-800 text-[11px] font-serif italic text-brand-300 flex items-start space-x-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5" />
                    <span>{rec.evidence_citation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CASE FORMULATION (5P Model) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-brand-700" />
          <h3 className="font-bold text-slate-900 text-base">
            Биопсихосоциальная концептуализация (5P Case Formulation)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              1. Предрасположенность (Predisposing)
            </span>
            <p className="text-xs text-slate-800 leading-relaxed">
              {formulation.predisposing_factors || 'Повышенная интероцептивная тревожность в детстве.'}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              2. Провоцирующий триггер (Precipitating)
            </span>
            <p className="text-xs text-slate-800 leading-relaxed">
              {formulation.precipitating_factors || 'Эпизод вегетативного криза в метро.'}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-1">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              3. Поддерживающие факторы (Perpetuating)
            </span>
            <p className="text-xs text-slate-800 leading-relaxed">
              {formulation.perpetuating_factors || 'Охранительные ритуалы (бутылка воды), избегание транспорта.'}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-1">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              4. Защитные ресурсы (Protective)
            </span>
            <p className="text-xs text-slate-800 leading-relaxed">
              {formulation.protective_factors || 'Высокая осознанность, надежный партнер, сотрудничество.'}
            </p>
          </div>
        </div>
      </div>

      {/* THERAPEUTIC GOALS & RECURRING PATTERNS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Goals */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Target className="w-4 h-4 text-brand-700" />
            <span>Дерево терапевтических целей:</span>
          </div>

          <div className="space-y-3">
            {goals.map((g, i) => (
              <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{g.goal}</span>
                  <span className="font-mono text-brand-700 font-bold">{g.progress}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Psychological Patterns */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Layers className="w-4 h-4 text-brand-700" />
            <span>Выявленные паттерны & Защитные механизмы:</span>
          </div>

          <div className="space-y-2.5">
            {patterns.map((p, i) => (
              <div key={i} className="p-3 bg-amber-50/40 border border-amber-200/60 rounded-xl text-xs space-y-1">
                <div className="font-semibold text-amber-950">{p.pattern}</div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Частота: {p.frequency}</span>
                  <span className="text-amber-800 font-medium">Влияние: {p.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
