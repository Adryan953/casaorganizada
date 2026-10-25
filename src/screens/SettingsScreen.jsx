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
  LogOut,
  ExternalLink,
  ShieldCheck,
  Heart
} from 'lucide-react';
import { sendTestNotification } from '../services/notificationService';
import { getStoredSupabaseConfig, saveStoredSupabaseConfig, getSupabase } from '../services/supabaseService';

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
  syncStatus = { online: true },
  onLogout
}) {
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [names, setNames] = useState({
    user1: users[0]?.name || 'Adryan',
    user2: users[1]?.name || 'Kah'
  });
  const [ratioVal, setRatioVal] = useState(targetRatio.user1 || 50);

  // Supabase Config State
  const [supabaseConfig, setSupabaseConfig] = useState(() => {
    const saved = getStoredSupabaseConfig();
    return saved || { url: '', anonKey: '' };
  });
  const [supabaseSaved, setSupabaseSaved] = useState(false);
  const [showSupabaseGuide, setShowSupabaseGuide] = useState(false);

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
      { ...users[0], name: names.user1.trim() || 'Adryan' },
      { ...users[1], name: names.user2.trim() || 'Kah' }
    ];
    onUpdateUsers(updated);
    alert('Nomes atualizados com sucesso!');
  };

  // Salvar Supabase Config
  const handleSaveSupabase = (e) => {
    e.preventDefault();
    if (!supabaseConfig.url || !supabaseConfig.anonKey) {
      alert('Preencha a URL e a Anon Key do seu projeto Supabase.');
      return;
    }
    saveStoredSupabaseConfig(supabaseConfig.url, supabaseConfig.anonKey);
    setSupabaseSaved(true);
    setTimeout(() => {
      setSupabaseSaved(false);
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

  const isSupabaseConnected = Boolean(getSupabase());

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Configurações do Casal</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Gerencie seu perfil, conexão em nuvem, banco de dados e preferências.
        </p>
      </div>

      {/* BLOCO 1: Conexão do Casal */}
      <div className="card" style={{ borderColor: 'var(--accent-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Share2 size={18} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Conectar os 2 Celulares</h3>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Código padrão ativo para Adryan e Kah:
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Código de Sincronia:</div>
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
          <label className="form-label">Quer mudar o código do casal?</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: CASAL-PAZ ou PAZ-4829"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              style={{ textTransform: 'uppercase' }}
            />
            <button type="submit" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>
              Alterar
            </button>
          </div>
        </form>
      </div>

      {/* BLOCO 2: Banco de Dados Supabase */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Banco de Dados (Supabase)</h3>
          </div>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: isSupabaseConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
              color: isSupabaseConnected ? 'var(--accent-primary)' : 'var(--text-muted)'
            }}
          >
            {isSupabaseConnected ? '● Supabase Conectado' : '○ Modo WebSocket Nativo'}
          </span>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          O app já sincroniza em tempo real pelo canal do casal! Para persistência definitiva com histórico no seu próprio banco de dados Postgres gratuito, insira suas credenciais do Supabase.
        </p>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem', marginBottom: '12px' }}
          onClick={() => setShowSupabaseGuide(!showSupabaseGuide)}
        >
          <span>{showSupabaseGuide ? 'Ocultar Guia do Supabase' : 'Como criar o Supabase em 2 minutos (Guia)'}</span>
        </button>

        {showSupabaseGuide && (
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
            <strong style={{ color: 'var(--text-primary)' }}>Passo a passo no Supabase (100% Gratuito):</strong>
            <ol style={{ paddingLeft: '18px', marginTop: '6px' }}>
              <li>Acesse <strong>supabase.com</strong> e crie uma conta gratuita (pode usar o GitHub).</li>
              <li>Clique em <strong>"New Project"</strong> e dê o nome: <code>casa-em-paz</code>.</li>
              <li>Vá em <strong>Project Settings ➔ API</strong> e copie a <strong>Project URL</strong> e a <strong>anon public key</strong>.</li>
              <li>Cole nos campos abaixo e clique em Salvar!</li>
            </ol>
          </div>
        )}

        <form onSubmit={handleSaveSupabase}>
          <div className="form-group">
            <label className="form-label">Project URL</label>
            <input
              type="text"
              className="form-input"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseConfig.url}
              onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value.trim() })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">API Anon Key</label>
            <input
              type="password"
              className="form-input"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseConfig.anonKey}
              onChange={(e) => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value.trim() })}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px', marginTop: '4px' }}>
            {supabaseSaved ? 'Salvo e Reiniciando...' : 'Salvar e Conectar Supabase'}
          </button>
        </form>
      </div>

      {/* BLOCO 3: Nomes dos Parceiros */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Users size={18} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Nomes do Casal</h3>
        </div>

        <form onSubmit={handleSaveNames}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div className="form-group">
              <label className="form-label">{users[0]?.avatar} Ele</label>
              <input
                type="text"
                className="form-input"
                value={names.user1}
                onChange={(e) => setNames({ ...names, user1: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{users[1]?.avatar} Ela</label>
              <input
                type="text"
                className="form-input"
                value={names.user2}
                onChange={(e) => setNames({ ...names, user2: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-secondary" style={{ width: '100%', padding: '10px' }}>
            Atualizar Nomes
          </button>
        </form>
      </div>

      {/* BLOCO 4: Meta de Divisão (50/50 ou ajustável) */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Sliders size={18} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Meta de Divisão do Esforço</h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Por padrão, o app busca o equilíbrio perfeito (50% / 50%).
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
      </div>

      {/* BLOCO 5: Notificações e Testes */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Bell size={18} />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Notificações & Lembretes</h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Avisa no horário de cada tarefa e quando o parceiro envia um recado ou reclamação.
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

      {/* BLOCO 6: Tema, Restauração e Logout */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Aparência</span>
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={onToggleTheme}>
            {theme === 'dark' ? 'Modo Claro ☀️' : 'Modo Escuro 🌙'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
            onClick={onLogout}
          >
            <LogOut size={16} />
            <span>Sair da Conta ({activeUser.name})</span>
          </button>

          <button
            className="btn btn-secondary"
            style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '10px', fontSize: '0.85rem' }}
            onClick={() => {
              if (confirm('Tem certeza? Isso restaurará as tarefas padrão da casa e o equilíbrio original.')) {
                onResetToDefaults();
              }
            }}
          >
            <RotateCcw size={16} />
            <span>Restaurar Tarefas Padrão da Casa</span>
          </button>
        </div>
      </div>
    </div>
  );
}
