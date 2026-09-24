import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { FloatingRecorderWidget } from './components/FloatingRecorderWidget';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { ProtocolsPage } from './pages/ProtocolsPage';
import { AdminTemplatesPage } from './pages/AdminTemplatesPage';
import { Client, ConsultationSession } from './types';
import { api } from './api';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('clients');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSession, setSelectedSession] = useState<ConsultationSession | null>(null);
  const [isRecorderOpen, setIsRecorderOpen] = useState<boolean>(false);
  const [isRecordingActive, setIsRecordingActive] = useState<boolean>(false);

  const loadClients = async () => {
    try {
      const data = await api.getClients();
      setClients(data);
      if (selectedClient) {
        const updated = data.find((c) => c.id === selectedClient.id);
        if (updated) setSelectedClient(updated);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setSelectedSession(null);
  };

  const handleSelectSession = (session: ConsultationSession) => {
    setSelectedSession(session);
    setCurrentTab('clients');
  };

  const handleBackToClients = () => {
    setSelectedClient(null);
    setSelectedSession(null);
    loadClients();
  };

  const handleBackToClientDetail = () => {
    setSelectedSession(null);
    if (selectedClient) {
      handleSelectClient(selectedClient);
    }
  };

  const handleStartSessionForClient = (client: Client) => {
    setSelectedClient(client);
    setIsRecorderOpen(true);
  };

  const handleSessionFinished = (finishedSession: ConsultationSession) => {
    loadClients();
    setSelectedSession(finishedSession);
    setCurrentTab('clients');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedClient(null);
          setSelectedSession(null);
        }}
        onOpenRecorder={() => setIsRecorderOpen(true)}
        isRecordingActive={isRecordingActive}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {currentTab === 'clients' && (
          <>
            {selectedSession ? (
              <SessionDetailPage
                sessionId={selectedSession.id}
                onBack={handleBackToClientDetail}
              />
            ) : selectedClient ? (
              <ClientDetailPage
                clientId={selectedClient.id}
                onBack={handleBackToClients}
                onSelectSession={handleSelectSession}
                onStartSessionForClient={handleStartSessionForClient}
              />
            ) : (
              <ClientsPage
                clients={clients}
                onSelectClient={handleSelectClient}
                onRefreshClients={loadClients}
              />
            )}
          </>
        )}

        {currentTab === 'protocols' && <ProtocolsPage />}

        {currentTab === 'admin' && (
          <AdminTemplatesPage onSelectSession={handleSelectSession} />
        )}

      </main>

      {/* Floating Desktop / Web Audio Recorder Overlay */}
      <FloatingRecorderWidget
        clients={clients}
        activeSession={selectedSession}
        isOpen={isRecorderOpen}
        onClose={() => setIsRecorderOpen(false)}
        onSessionFinished={handleSessionFinished}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Call Analyst Platform • Medical & Psychological AI Supervision System • Powered by Sber GigaAM v2 & Gemini 3.7 Flash
      </footer>

    </div>
  );
}

export default App;
