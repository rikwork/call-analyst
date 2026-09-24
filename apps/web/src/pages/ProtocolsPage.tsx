import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { ClinicalProtocol } from '../types';
import { api } from '../api';

export const ProtocolsPage: React.FC = () => {
  const [protocols, setProtocols] = useState<ClinicalProtocol[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedModality, setSelectedModality] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadProtocols = async () => {
      setIsLoading(true);
      try {
        const data = await api.getProtocols();
        setProtocols(data);
      } catch (err) {
        console.error('Error loading protocols:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProtocols();
  }, []);

  const modalities = ['all', 'CBT', 'Schema', 'Gestalt'];

  const filteredProtocols = protocols.filter((p) => {
    const matchesModality = selectedModality === 'all' || p.modality === selectedModality;
    const matchesSearch =
      `${p.title} ${p.code} ${p.description || ''} ${(p.target_symptoms || []).join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchesModality && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-brand-700 mb-1">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>Evidence-Based Clinical Knowledge Base</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Кураторская база клинических протоколов & шкал
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Валидированные алгоритмы терапевтических интервенций и прямые ссылки на доказательные исследования (NICE, APA, Lancet).
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск по симптомам, коду, автору..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-sm rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex space-x-1.5 overflow-x-auto w-full md:w-auto">
          {modalities.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedModality(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedModality === m
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m === 'all' ? 'Все модальности' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Protocols Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProtocols.map((p) => (
          <div
            key={p.id || p.code}
            className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4 hover:border-brand-300 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono text-[11px] bg-brand-100 text-brand-800 font-bold px-2.5 py-0.5 rounded">
                  {p.code}
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1.5">{p.title}</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {p.modality}
              </span>
            </div>

            {p.description && <p className="text-xs text-slate-600">{p.description}</p>}

            {/* Target Symptoms */}
            {p.target_symptoms && p.target_symptoms.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Мишени терапии / Симптомы:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {p.target_symptoms.map((s, i) => (
                    <span
                      key={i}
                      className="text-[11px] bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Algorithm Steps */}
            {p.algorithm_steps && p.algorithm_steps.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Шаги клинического алгоритма:
                </span>
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {p.algorithm_steps.map((step, idx) => (
                    <div key={idx} className="text-xs text-slate-800 leading-relaxed">
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Base Citations */}
            {p.evidence_base && p.evidence_base.length > 0 && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <span className="text-[11px] font-semibold text-brand-800 uppercase tracking-wider flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Доказательная база & Ссылки:
                </span>
                <div className="space-y-1.5">
                  {p.evidence_base.map((ev, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] font-serif bg-brand-50/40 p-2 rounded-lg border border-brand-200/50 text-slate-700"
                    >
                      <div className="font-semibold text-slate-900">{ev.citation}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{ev.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ))}
      </div>

    </div>
  );
};
