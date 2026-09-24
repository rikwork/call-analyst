import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  Save,
  Plus,
  Check,
  Code,
  Briefcase,
  UserCheck,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';
import { AnalysisTemplate } from '../types';
import { api } from '../api';

interface PromptStudioAdminProps {
  templates: AnalysisTemplate[];
  onTemplateUpdated: () => void;
}

export const PromptStudioAdmin: React.FC<PromptStudioAdminProps> = ({
  templates,
  onTemplateUpdated,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<AnalysisTemplate | null>(templates[0] || null);
  const [name, setName] = useState<string>('');
  const [domain, setDomain] = useState<string>('psychology');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [sessionPrompt, setSessionPrompt] = useState<string>('');
  const [longitudinalPrompt, setLongitudinalPrompt] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (selectedTemplate) {
      setName(selectedTemplate.name);
      setDomain(selectedTemplate.domain);
      setSystemPrompt(selectedTemplate.system_prompt);
      setSessionPrompt(selectedTemplate.session_analysis_prompt);
      setLongitudinalPrompt(selectedTemplate.longitudinal_prompt);
    }
  }, [selectedTemplate]);

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);
    try {
      await api.updateTemplate(selectedTemplate.id, {
        name,
        domain,
        system_prompt: systemPrompt,
        session_analysis_prompt: sessionPrompt,
        longitudinal_prompt: longitudinalPrompt,
      });
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onTemplateUpdated();
    } catch (err) {
      console.error('Failed to update template:', err);
      setIsSaving(false);
    }
  };

  const getDomainIcon = (d: string) => {
    switch (d) {
      case 'sales':
        return <TrendingUp className="w-4 h-4 text-amber-500" />;
      case 'executive':
        return <Briefcase className="w-4 h-4 text-sky-500" />;
      case 'medical':
        return <Stethoscope className="w-4 h-4 text-rose-500" />;
      default:
        return <UserCheck className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-brand-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sliders className="w-4 h-4" />
            <span>AI Pivot & Prompt Studio</span>
          </div>
          <h2 className="text-xl font-bold">Конструктор шаблонов и рубрик анализа</h2>
          <p className="text-sm text-slate-300 mt-1">
            Настраивайте промпты и критерии оценки для мгновенного пивота в продажи, executive-коучинг или медицину.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm shadow-md transition disabled:opacity-50"
        >
          {saveSuccess ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Сохраняем...' : saveSuccess ? 'Сохранено!' : 'Сохранить шаблон'}</span>
        </button>
      </div>

      {/* Grid: Template Selector + Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Template List */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            Доступные шаблоны и домены:
          </div>

          <div className="space-y-2">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedTemplate?.id === tmpl.id
                    ? 'bg-white border-brand-500 ring-2 ring-brand-500/20 shadow-md'
                    : 'bg-white/80 border-slate-200/80 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    {getDomainIcon(tmpl.domain)}
                    <span className="text-xs font-semibold text-slate-900">{tmpl.name}</span>
                  </div>
                  {tmpl.is_default && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                      Default
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="capitalize">Домен: {tmpl.domain}</span>
                  <span className="font-mono text-[10px] text-slate-400">slug: {tmpl.slug}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Detailed Prompt & Rubric Editor */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Название шаблона</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Домен / Вертикаль</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-500"
              >
                <option value="psychology">Психология & Терапия</option>
                <option value="sales">Sales & Отдел продаж (BANT / SPIN)</option>
                <option value="executive">Executive & Бизнес-коучинг (GROW)</option>
                <option value="medical">Медицина (SOAP прием)</option>
              </select>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700">
                Системный промпт роли (System Prompt)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Gemini 3.7 Flash</span>
            </div>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-mono rounded-xl p-3 text-slate-800 focus:outline-none focus:border-brand-500 leading-relaxed"
            />
          </div>

          {/* Single Session Prompt */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Промпт экспресс-анализа отдельной сессии / звонка
            </label>
            <textarea
              rows={4}
              value={sessionPrompt}
              onChange={(e) => setSessionPrompt(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-mono rounded-xl p-3 text-slate-800 focus:outline-none focus:border-brand-500 leading-relaxed"
            />
          </div>

          {/* Longitudinal Prompt */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Промпт сквозного анализа истории (Досье / Динамика)
            </label>
            <textarea
              rows={3}
              value={longitudinalPrompt}
              onChange={(e) => setLongitudinalPrompt(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-mono rounded-xl p-3 text-slate-800 focus:outline-none focus:border-brand-500 leading-relaxed"
            />
          </div>

          {/* Scoring Rubrics Preview */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Шкалы и рубрики оценки в данном шаблоне:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(selectedTemplate?.scoring_rubrics || []).map((rubric, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-semibold text-slate-800">{rubric.metric}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Вес: {(rubric.weight * 100).toFixed(0)}%</span>
                    <span>Макс: {rubric.scale_max} баллов</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
