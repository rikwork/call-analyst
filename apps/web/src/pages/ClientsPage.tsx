import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Sparkles,
  Shield,
  Activity,
} from 'lucide-react';
import { Client } from '../types';
import { api } from '../api';

interface ClientsPageProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onRefreshClients: () => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({
  clients,
  onSelectClient,
  onRefreshClients,
}) => {
  const [search, setSearch] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [modality, setModality] = useState<string>('CBT');
  const [complaint, setComplaint] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      onRefreshClients();
    }, 4000);
    return () => clearInterval(interval);
  }, [onRefreshClients]);

  const filteredClients = clients.filter((c) =>
    `${c.first_name} ${c.last_name} ${c.modality} ${c.initial_complaint || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createClient({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        modality,
        initial_complaint: complaint.trim(),
      });
      setIsModalOpen(false);
      setFirstName('');
      setLastName('');
      setComplaint('');
      onRefreshClients();
    } catch (err) {
      console.error('Error creating client:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Клиенты и Живые Досье</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Управление клиническими случаями, сессиями и сквозной динамикой терапии.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-medium text-sm shadow-md shadow-brand-700/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Новый клиент</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск по имени, модальности, запросу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-sm rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center space-x-6 text-xs text-slate-500 w-full md:w-auto justify-end">
          <div>
            Всего клиентов: <span className="font-bold text-slate-900">{clients.length}</span>
          </div>
          <div>
            Активных сессий: <span className="font-bold text-brand-700">{clients.reduce((acc, c) => acc + c.session_count, 0)}</span>
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClients.map((c) => (
          <div
            key={c.id}
            onClick={() => onSelectClient(c)}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md hover:border-brand-300 transition-all cursor-pointer flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {c.first_name} {c.last_name}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">id: {c.pseudonym || c.first_name[0] + '.'}</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-800 border border-brand-200">
                  {c.modality}
                </span>
              </div>

              {c.initial_complaint && (
                <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {c.initial_complaint}
                </p>
              )}
            </div>

            {/* Bottom Meta */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-brand-600" />
                <span>Сессий: <strong className="text-slate-800">{c.session_count}</strong></span>
              </div>

              <div className="flex items-center space-x-1 text-brand-700 font-medium group">
                <span>Открыть досье</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Добавить нового клиента</h2>
            
            <form onSubmit={handleCreateClient} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Имя</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Напр. Анна"
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Фамилия</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Напр. Смирнова"
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Рабочая модальность</label>
                <select
                  value={modality}
                  onChange={(e) => setModality(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-brand-500"
                >
                  <option value="CBT">Когнитивно-поведенческая терапия (КПТ)</option>
                  <option value="Schema">Схема-терапия (Джеффри Янг)</option>
                  <option value="Gestalt">Гештальт-терапия</option>
                  <option value="ACT">Терапия принятия и ответственности (ACT)</option>
                  <option value="Coaching">ICF Коучинг</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Первичный запрос / Жалоба</label>
                <textarea
                  rows={3}
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="Опишите симптоматику и контекст обращения..."
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3 text-slate-900 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold shadow transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Создаем...' : 'Создать клиента и Досье'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
