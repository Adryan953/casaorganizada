import React, { useState } from 'react';
import {
  Settings,
  Users,
  Copy,
  Check,
  Share2,
  Bell,
  Moon,
  Sun,
  RotateCcw,
  Sliders,
  LogOut,
  Sparkles
} from 'lucide-react';
import { sendTestNotification } from '../services/notificationService';

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
          Ajustes de perfil, divisão e preferências da casa.
        </p>
      </div>

      {/* BLOCO 1: Conexão do Casal */}
      <div className="card" style={{ borderColor: 'var(--accent-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Share2 size={18} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Código do Casal</h3>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Ambos já estão conectados automaticamente nesta sala de sincronia:
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sala Ativa:</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', letterSpacing: '0.05em', color: 'var(--accent-primary)' }}>
              {coupleCode}
            </div>
          </div>
          <button className="btn btn-primary" style={{ padding: '8px 14px' }} onClick={handleCopyCode}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>

        {/* Mudar código se quiser */}
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

      {/* BLOCO 2: Nomes dos Parceiros */}
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

      {/* BLOCO 3: Meta de Divisão (50/50 ou ajustável) */}
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

      {/* BLOCO 4: Notificações e Testes */}
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

      {/* BLOCO 5: Tema, Restauração e Logout */}
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
