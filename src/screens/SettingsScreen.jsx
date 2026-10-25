import React, { useState } from 'react';
import {
  Settings,
  Users,
  Copy,
  Check,
  Share2,
  Database,
  Bell,
  Moon,
  Sun,
  RotateCcw,
  Sliders,
  ExternalLink,
  ShieldCheck,
  Heart
} from 'lucide-react';
import { sendTestNotification } from '../services/notificationService';
import { getStoredFirebaseConfig, saveStoredFirebaseConfig } from '../services/storageService';

export function SettingsScreen({
  users = [],
  activeUser,
  coupleCode,
  targetRatio = { user1: 50, user2: 50 },
  theme,
  onToggleTheme,
  onUpdateCoupleCode,
  onUpdateUsers,
  onUpdateTargetRatio,
  onResetToDefaults,
  syncStatus = { online: false }
}) {
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [names, setNames] = useState({
    user1: users[0]?.name || 'Eu',
    user2: users[1]?.name || 'Kassandra'
  });
  const [ratioVal, setRatioVal] = useState(targetRatio.user1 || 50);

  // Firebase Config State
  const [firebaseConfig, setFirebaseConfig] = useState(() => {
    const saved = getStoredFirebaseConfig();
    return saved || {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    };
  });
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false);
  const [firebaseSaved, setFirebaseSaved] = useState(false);

  // Copiar código do casal
  const handleCopyCode = () => {
    navigator.clipboard.writeText(coupleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Entrar com código existente
  const handleJoinCouple = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      alert('Digite o código do casal.');
      return;
    }
    onUpdateCoupleCode(inputCode.toUpperCase().trim());
    setInputCode('');
    alert(`Conectando ao casal com o código: ${inputCode.toUpperCase().trim()}!`);
  };

  // Salvar nomes
  const handleSaveNames = (e) => {
    e.preventDefault();
    const updated = [
      { ...users[0], name: names.user1.trim() || 'Eu' },
      { ...users[1], name: names.user2.trim() || 'Kassandra' }
    ];
    onUpdateUsers(updated);
    alert('Nomes atualizados com sucesso!');
  };

  // Salvar Firebase Config
  const handleSaveFirebase = (e) => {
    e.preventDefault();
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      alert('Preencha ao menos o apiKey e o projectId do Firebase.');
      return;
    }
    saveStoredFirebaseConfig(firebaseConfig);
    setFirebaseSaved(true);
    setTimeout(() => {
      setFirebaseSaved(false);
      window.location.reload();
    }, 1500);
  };

  // Alterar meta de divisão
  const handleRatioChange = (val) => {
    setRatioVal(val);
    onUpdateTargetRatio({
      user1: Number(val),
      user2: 100 - Number(val)
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Configurações do Casal</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Gerencie a conexão dos celulares, nomes, notificações e sincronização.
        </p>
      </div>

      {/* BLOCO 1: Conexão do Casal (Compartilhamento) */}
      <div className="card" style={{ borderColor: 'var(--accent-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Share2 size={18} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Conectar os 2 Celulares</h3>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Para sua esposa usar no celular dela com os mesmos dados sincronizados, passe este código:
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-app)',
            borderRadius: 'var(--radius-md)',
            border: '2px dashed var(--accent-primary)',
            marginBottom: '12px'
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Código do seu casal:</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', letterSpacing: '0.05em', color: 'var(--accent-primary)' }}>
              {coupleCode}
            </div>
          </div>
          <button className="btn btn-primary" style={{ padding: '8px 14px' }} onClick={handleCopyCode}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>

        {/* Entrar em um código existente */}
        <form onSubmit={handleJoinCouple} style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          <label className="form-label">Já possui um código criado pelo parceiro?</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: PAZ-4829"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              style={{ textTransform: 'uppercase' }}
            />
            <button type="submit" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>
              Entrar
            </button>
          </div>
        </form>
      </div>

      {/* BLOCO 2: Nomes e Perfis */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Users size={18} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Nomes dos Parceiros</h3>
        </div>

        <form onSubmit={handleSaveNames}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div className="form-group">
              <label className="form-label">{users[0]?.avatar} Parceiro 1</label>
              <input
                type="text"
                className="form-input"
                value={names.user1}
                onChange={(e) => setNames({ ...names, user1: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{users[1]?.avatar} Parceira 2</label>
              <input
                type="text"
                className="form-input"
                value={names.user2}
                onChange={(e) => setNames({ ...names, user2: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-secondary" style={{ width: '100%', padding: '10px' }}>
            Salvar Nomes
          </button>
        </form>
      </div>

      {/* BLOCO 3: Meta de Divisão (50/50 ou ajustável) */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Sliders size={18} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Meta de Divisão do Esforço</h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Por padrão, o app busca o equilíbrio perfeito (50% / 50%). Se um dos parceiros trabalhar muito mais horas fora, você pode ajustar a proporção:
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: '700', fontSize: '0.95rem', marginBottom: '6px' }}>
          <span>{names.user1}: {ratioVal}%</span>
          <span>{names.user2}: {100 - ratioVal}%</span>
        </div>

        <input
          type="range"
          min="30"
          max="70"
          step="5"
          value={ratioVal}
          onChange={(e) => handleRatioChange(e.target.value)}
          style={{ width: '100%', accentColor: 'var(--accent-primary)', height: '6px', cursor: 'pointer' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>30% / 70%</span>
          <span>50% / 50% (Recomendado)</span>
          <span>70% / 30%</span>
        </div>
      </div>

      {/* BLOCO 4: Sincronização Online Firebase */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color={syncStatus.online ? 'var(--accent-primary)' : 'var(--text-muted)'} />
            <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Banco Online (Firebase)</h3>
          </div>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: syncStatus.online ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
              color: syncStatus.online ? 'var(--accent-primary)' : 'var(--text-muted)'
            }}
          >
            {syncStatus.online ? '● Conectado em Tempo Real' : '○ Modo Local / Offline'}
          </span>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          O app já funciona 100% no seu aparelho! Para sincronizar em tempo real entre dois celulares diferentes, insira as credenciais do seu projeto gratuito do Firebase.
        </p>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem', marginBottom: '12px' }}
          onClick={() => setShowFirebaseGuide(!showFirebaseGuide)}
        >
          <span>{showFirebaseGuide ? 'Ocultar Tutorial Passo a Passo' : 'Ver Tutorial Passo a Passo para Leigos'}</span>
        </button>

        {showFirebaseGuide && (
          <div
            style={{
              backgroundColor: 'var(--bg-app)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '14px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.5'
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Como criar seu banco gratuito em 3 minutos:</strong>
            <ol style={{ paddingLeft: '18px', marginTop: '6px' }}>
              <li>Acesse <strong>console.firebase.google.com</strong> com sua conta Google.</li>
              <li>Clique em <strong>"Adicionar projeto"</strong> e dê o nome "Casa em Paz".</li>
              <li>No menu lateral, clique em <strong>"Criação" → "Firestore Database"</strong> e crie o banco em modo de teste.</li>
              <li>Na engrenagem ⚙️ (Configurações do Projeto), role até o final e clique no ícone da Web <strong>&lt;/&gt;</strong> para registrar o app.</li>
              <li>Copie os valores do <code>firebaseConfig</code> e cole abaixo:</li>
            </ol>
          </div>
        )}

        <form onSubmit={handleSaveFirebase}>
          <div className="form-group">
            <label className="form-label">apiKey</label>
            <input
              type="text"
              className="form-input"
              placeholder="AIzaSy..."
              value={firebaseConfig.apiKey}
              onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value.trim() })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">projectId</label>
              <input
                type="text"
                className="form-input"
                placeholder="casa-em-paz-123"
                value={firebaseConfig.projectId}
                onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value.trim() })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">authDomain</label>
              <input
                type="text"
                className="form-input"
                placeholder="casa-em-paz-123.firebaseapp.com"
                value={firebaseConfig.authDomain}
                onChange={(e) => setFirebaseConfig({ ...firebaseConfig, authDomain: e.target.value.trim() })}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px', marginTop: '4px' }}>
            {firebaseSaved ? 'Salvo e Reiniciando...' : 'Salvar e Conectar Banco Online'}
          </button>
        </form>
      </div>

      {/* BLOCO 5: Notificações e Testes */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Bell size={18} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Notificações & Lembretes</h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          O app avisa suavemente no horário agendado de cada tarefa com um tom calmo de sino tibetano.
        </p>

        <button
          className="btn btn-secondary"
          style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
          onClick={() => sendTestNotification(activeUser.name)}
        >
          <Bell size={16} />
          <span>Testar Lembrete Suave Agora</span>
        </button>
      </div>

      {/* BLOCO 6: Tema e Restauração */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Aparência</span>
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={onToggleTheme}>
            {theme === 'dark' ? 'Mudar p/ Modo Claro ☀️' : 'Mudar p/ Modo Escuro 🌙'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '12px' }}>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '10px', fontSize: '0.85rem' }}
            onClick={() => {
              if (confirm('Tem certeza? Isso restaurará as tarefas padrão da casa (ração dos gatos, caixa de areia, louça, plantas, etc.) e o equilíbrio original.')) {
                onResetToDefaults();
              }
            }}
          >
            <RotateCcw size={16} />
            <span>Restaurar Tarefas e Dados Padrão</span>
          </button>
        </div>
      </div>
    </div>
  );
}
