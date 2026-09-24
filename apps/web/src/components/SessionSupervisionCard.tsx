import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Award,
  ListTodo,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { SessionAnalysis } from '../types';

interface SessionSupervisionCardProps {
  analysis?: SessionAnalysis;
}

export const SessionSupervisionCard: React.FC<SessionSupervisionCardProps> = ({ analysis }) => {
  if (!analysis) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
        <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p>Анализ сессии еще не сформирован.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Metrics Header */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Активное слушание & Эмпатия
            </span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{analysis.active_listening_score}</span>
            <span className="text-xs text-slate-400">/ 10</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${(analysis.active_listening_score / 10) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Терапевтический альянс
            </span>
            <Sparkles className="w-4 h-4 text-brand-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{analysis.therapeutic_alliance_score}</span>
            <span className="text-xs text-slate-400">/ 10</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-brand-600 h-full rounded-full"
              style={{ width: `${(analysis.therapeutic_alliance_score / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      {analysis.executive_summary && (
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2 text-xs font-semibold uppercase tracking-wider text-brand-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Резюме супервизора (Gemini 3.7 Flash)</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{analysis.executive_summary}</p>
        </div>
      )}

      {/* STRENGTHS (🟢 Что сделано отлично) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-emerald-800 font-semibold text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Сильные стороны интервенций:</span>
        </div>
        <div className="space-y-3">
          {analysis.strengths.map((st, i) => (
            <div key={i} className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-3 text-xs space-y-1.5">
              <div className="font-semibold text-emerald-950 text-sm">{st.title}</div>
              <p className="text-slate-700 leading-relaxed">{st.description}</p>
              {st.quote && (
                <div className="italic text-emerald-900 bg-white/80 p-2 rounded-lg border border-emerald-200/50">
                  «{st.quote}»
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* GROWTH AREAS (🟡 Зоны внимания) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-amber-800 font-semibold text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Зоны внимания и упущенные маркеры:</span>
        </div>
        <div className="space-y-3">
          {analysis.growth_areas.map((ga, i) => (
            <div key={i} className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3 text-xs space-y-1.5">
              <div className="font-semibold text-amber-950 text-sm">{ga.title}</div>
              <p className="text-slate-700 leading-relaxed">{ga.description}</p>
              <div className="font-medium text-amber-900 bg-white/80 p-2 rounded-lg border border-amber-200/50">
                💡 <span className="font-semibold">Рекомендация:</span> {ga.recommendation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MATCHED CLINICAL PROTOCOLS & EVIDENCE (🔵 Доказательные протоколы) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-brand-900 font-semibold text-sm">
          <BookOpen className="w-4 h-4 text-brand-700" />
          <span>Рекомендованные протоколы и исследования:</span>
        </div>
        <div className="space-y-3">
          {analysis.recommended_interventions.map((proto, i) => (
            <div key={i} className="bg-brand-50/50 border border-brand-200/70 rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-sm">{proto.title}</span>
                <span className="font-mono text-[10px] bg-brand-100 text-brand-800 px-2 py-0.5 rounded font-bold">
                  {proto.protocol_code}
                </span>
              </div>
              <p className="text-slate-700">{proto.action_steps}</p>
              {proto.evidence_citation && (
                <div className="flex items-center space-x-1.5 text-slate-500 bg-white/90 p-2 rounded-lg border border-slate-200">
                  <ExternalLink className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                  <span className="text-[11px] font-serif italic text-slate-700">{proto.evidence_citation}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SUGGESTED HOMEWORK */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm">
          <ListTodo className="w-4 h-4 text-brand-600" />
          <span>Сформированное домашнее задание для клиента:</span>
        </div>
        <ul className="space-y-2">
          {analysis.suggested_homework.map((hw, i) => (
            <li key={i} className="flex items-start space-x-2 text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
              <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                {i + 1}
              </span>
              <span className="pt-0.5">{hw}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* RISK ASSESSMENT */}
      {analysis.risk_assessment && (
        <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 text-xs flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-slate-900">Клинический скрининг безопасности</div>
            <p className="text-slate-600 mt-0.5">
              Уровень риска: <span className="font-semibold text-emerald-700 uppercase">{analysis.risk_assessment.risk_level}</span>. {analysis.risk_assessment.clinical_alert}
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
