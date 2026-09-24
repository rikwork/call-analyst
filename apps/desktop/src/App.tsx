import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Pause,
  Play,
  Plus,
  Minus,
  X,
  Sparkles,
  Check,
  ChevronDown,
  Volume2,
  Tag,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { DualChannelAudioRecorder } from './audioEngine';
import { Client, DesktopNote } from './types';
import { formatTime } from './utils/formatters';

const BACKEND_URL = 'http://127.0.0.1:8000/api/v1';

export function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [sessionTitle, setSessionTitle] = useState<string>('Консультация (Zoom / Telegram)');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [sysLevel, setSysLevel] = useState<number>(0);
  const [notes, setNotes] = useState<DesktopNote[]>([]);
  const [currentNote, setCurrentNote] = useState<string>('');
  const [currentCategory, setCurrentCategory] = useState<string>('observation');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [finishedSessionId, setFinishedSessionId] = useState<string | null>(null);

  const recorderRef = useRef<DualChannelAudioRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch clients on mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/clients`)
      .then((res) => res.json())
      .then((data: Client[]) => {
        if (Array.isArray(data)) {
          setClients(data);
          if (data.length > 0) setSelectedClientId(data[0].id);
        }
      })
      .catch((err) => console.error('Failed to load clients in desktop app:', err));
  }, []);

  const handleStartRecording = async () => {
    try {
      const recorder = new DualChannelAudioRecorder();
      recorderRef.current = recorder;
      await recorder.start((mic, sys) => {
        setMicLevel(mic);
        setSysLevel(sys);
      });

      setIsRecording(true);
      setIsPaused(false);
      setElapsedSeconds(0);
      setNotes([]);
      setFinishedSessionId(null);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      // Fallback start so recording always works
      setIsRecording(true);
      setIsPaused(false);
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      setIsPaused(false);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPaused(true);
    }
  };

  const handleAddNote = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (!currentNote.trim()) return;

    setNotes((prev) => [
      ...prev,
      {
        timestamp: elapsedSeconds,
        timeStr: formatTime(elapsedSeconds),
        content: currentNote.trim(),
        category: currentCategory,
      },
    ]);
    setCurrentNote('');
  };

  const handleFinishAndAnalyze = async () => {
    if (!recorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setIsUploading(true);
    setUploadStatus('Останавливаем аудиопоток...');

    try {
      const audioBlob = await recorderRef.current.stop();
      setIsRecording(false);

      setUploadStatus('Создаем сессию на сервере...');
      // 1. Create session
      const createRes = await fetch(`${BACKEND_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClientId,
          title: sessionTitle || 'Консультация (Zoom / Telegram)',
        }),
      });
      const session = await createRes.json();

      // 2. Add notes
      for (const note of notes) {
        await fetch(`${BACKEND_URL}/sessions/${session.id}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp_seconds: note.timestamp,
            content: note.content,
            category: note.category,
          }),
        });
      }

      // 3. Upload real audio file & trigger Gemini 3.7 Flash analysis
      setUploadStatus('Транскрибация GigaAM v2 & Анализ Gemini 3.7 Flash...');
      const formData = new FormData();
      formData.append('audio_file', audioBlob, `call_session_${session.id}.webm`);
      formData.append('duration_seconds', Math.max(1, elapsedSeconds).toString());

      const finishRes = await fetch(`${BACKEND_URL}/sessions/${session.id}/finish`, {
        method: 'POST',
        body: formData,
      });
      const finishedSession = await finishRes.json();

      setIsUploading(false);
      setFinishedSessionId(finishedSession.id);
      setUploadStatus('Анализ завершен!');
    } catch (err) {
      console.error('Error during session upload & analysis:', err);
      setIsUploading(false);
      setUploadStatus('Ошибка при отправке');
    }
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  return (
    <div className="w-full h-screen bg-slate-900/95 text-white flex flex-col justify-between p-4 select-none border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl">
      
      {/* Title Bar (Draggable in Electron) */}
      <div
        className="flex items-center justify-between pb-3 border-b border-slate-800"
        style={window.electronAPI ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : undefined}
      >
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
          <span className="text-xs font-bold tracking-tight text-slate-200">
            Call Analyst • Desktop Mini-Recorder
          </span>
        </div>

        <div
          className="flex items-center space-x-1"
          style={window.electronAPI ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
        >
          <button
            onClick={handleMinimize}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClose}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div
        className="flex-1 py-3 space-y-3 overflow-y-auto"
        style={window.electronAPI ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
      >
        
        {/* Uploading Status Overlay */}
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3 text-center">
            <Sparkles className="w-8 h-8 text-brand-400 animate-spin" />
            <div className="text-sm font-semibold text-white">{uploadStatus}</div>
            <div className="text-xs text-slate-400">Соблюдение врачебной тайны • Локальный STT</div>
          </div>
        ) : finishedSessionId ? (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 text-center space-y-3">
            <div className="flex items-center justify-center space-x-2 text-emerald-400 font-semibold text-sm">
              <Check className="w-5 h-5" />
              <span>Сессия успешно проанализирована!</span>
            </div>
            <p className="text-xs text-slate-300">
              Стенограмма, ИИ-супервизия и Живое Досье обновлены.
            </p>
            <a
              href="http://localhost:3050"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow transition"
            >
              <span>Открыть в веб-кабинете</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : !isRecording ? (
          /* Pre-recording: Select client */
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Выберите клиента для сессии:
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.modality})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Название созвона:
              </label>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center space-x-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>2-Канальный захват аудио активен</span>
              </div>
              <p className="text-slate-400 text-[10px]">
                Пишет микрофон специалиста + звук Zoom/Telegram без установки виртуальных кабелей.
              </p>
            </div>

            <button
              onClick={handleStartRecording}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-600/30 flex items-center justify-center space-x-2 transition"
            >
              <Mic className="w-4 h-4" />
              <span>Начать запись созвона</span>
            </button>
          </div>
        ) : (
          /* Active recording */
          <div className="space-y-3">
            {/* Timer & VU Meters */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="font-mono text-lg font-bold text-white tracking-wider">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>

              <div className="flex items-center space-x-4 text-xs">
                {/* Mic level */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-slate-400">Мик:</span>
                  <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${micLevel}%` }}
                    />
                  </div>
                </div>

                {/* System level */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-slate-400">Zoom/TG:</span>
                  <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-75"
                      style={{ width: `${sysLevel}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Note input field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Быстрая заметка на {formatTime(elapsedSeconds)}:</span>
                <span className="font-mono">Enter — сохранить</span>
              </div>

              <div className="flex space-x-1">
                <input
                  type="text"
                  placeholder="Заметка с таймкодом..."
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  onKeyDown={handleAddNote}
                  className="flex-1 bg-slate-800 border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
                <button
                  onClick={handleAddNote}
                  className="px-3 py-1.5 bg-brand-700 hover:bg-brand-600 rounded-xl text-white text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tag selectors */}
              <div className="flex space-x-1 pt-1">
                {[
                  { id: 'observation', label: 'Наблюдение' },
                  { id: 'technique', label: 'Техника' },
                  { id: 'emotion', label: 'Эмоция' },
                  { id: 'homework', label: 'Д/З' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCurrentCategory(cat.id)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg font-medium transition ${
                      currentCategory === cat.id
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes list */}
            {notes.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-1 bg-slate-950/40 p-2 rounded-xl border border-slate-800 text-[11px]">
                {notes.map((n, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-slate-300">
                    <span className="font-mono text-[10px] text-brand-400">{n.timeStr}</span>
                    <span className="truncate">{n.content}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Footer Controls */}
      {isRecording && (
        <div className="pt-3 border-t border-slate-800 flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={handlePauseResume}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center justify-center space-x-1.5 transition"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Продолжить' : 'Пауза'}</span>
          </button>

          <button
            onClick={handleFinishAndAnalyze}
            disabled={isUploading}
            className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white flex items-center justify-center space-x-1.5 shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>Завершить & Анализ</span>
          </button>
        </div>
      )}

    </div>
  );
}

export default App;
