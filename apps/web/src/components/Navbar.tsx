import React from 'react';
import { Mic, Users, BookOpen, Sliders, ShieldCheck, Activity } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenRecorder: () => void;
  isRecordingActive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenRecorder,
  isRecordingActive,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('clients')}>
            <div className="w-10 h-10 rounded-xl bg-brand-700 flex items-center justify-center shadow-lg shadow-brand-700/30">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight">Call Analyst</span>
                <span className="text-[10px] uppercase tracking-wider bg-brand-900/60 text-brand-300 font-semibold px-2 py-0.5 rounded border border-brand-700/50">
                  AI Supervision
                </span>
              </div>
              <p className="text-xs text-slate-400">Пространство клинического анализа & Досье</p>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => onSelectTab('clients')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'clients'
                  ? 'bg-slate-800 text-brand-300 border border-slate-700'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Клиенты и Досье</span>
            </button>

            <button
              onClick={() => onSelectTab('protocols')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'protocols'
                  ? 'bg-slate-800 text-brand-300 border border-slate-700'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>База протоколов</span>
            </button>

            <button
              onClick={() => onSelectTab('admin')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'admin'
                  ? 'bg-slate-800 text-brand-300 border border-slate-700'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Админка & Шаблоны</span>
            </button>
          </nav>

          {/* Right Action: Quick Record Widget Button & Profile */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onOpenRecorder}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-md ${
                isRecordingActive
                  ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/30'
                  : 'bg-brand-700 hover:bg-brand-800 text-white shadow-brand-700/30'
              }`}
            >
              <Mic className={`w-4 h-4 ${isRecordingActive ? 'text-white' : 'text-brand-200'}`} />
              <span>{isRecordingActive ? 'Идет запись звонка' : 'Начать запись (Виджет)'}</span>
            </button>

            <div className="hidden md:flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
                АВ
              </div>
              <div className="text-left text-xs">
                <div className="font-medium text-slate-200">Д-р Воронов</div>
                <div className="text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> КПТ / Схема
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
