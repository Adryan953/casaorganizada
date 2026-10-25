import React from 'react';
import { Sparkles, Moon, Sun, Wifi, WifiOff } from 'lucide-react';

export function Header({
  activeUser,
  users = [],
  onSwitchUser,
  syncStatus = { online: false },
  coupleCode,
  theme,
  onToggleTheme,
  onOpenSettings
}) {
  const otherUser = users.find((u) => u.id !== activeUser.id) || users[1];

  return (
    <header className="app-header">
      <div className="header-top-row">
        {/* Marca do App */}
        <div className="brand-wrapper">
          <div className="brand-logo">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="brand-title">Casa em Paz</h1>
            <p className="brand-subtitle">
              Código: <strong style={{ color: 'var(--accent-primary)' }}>{coupleCode}</strong>
            </p>
          </div>
        </div>

        {/* Controles do Topo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Status de Sincronização */}
          <div
            title={syncStatus.online ? 'Sincronizado online em tempo real' : 'Modo offline / local'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              color: syncStatus.online ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
            onClick={onOpenSettings}
          >
            {syncStatus.online ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{syncStatus.online ? 'Nuvem' : 'Local'}</span>
          </div>

          {/* Alternar Tema */}
          <button
            className="btn-icon-subtle"
            onClick={onToggleTheme}
            aria-label="Alternar modo claro e escuro"
            title="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Barra de Perfil Ativo com Alternância Rápida de Aparelho */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          backgroundColor: 'var(--bg-app)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Você está usando como:</span>
          <span style={{ fontWeight: '700', color: activeUser.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{activeUser.avatar}</span>
            <span>{activeUser.name}</span>
          </span>
        </div>

        {otherUser && (
          <button
            className="active-user-pill"
            onClick={() => onSwitchUser(otherUser.id)}
            title={`Mudar para o perfil de ${otherUser.name}`}
          >
            <span style={{ fontSize: '0.85rem' }}>{otherUser.avatar}</span>
            <span>Usar como {otherUser.name}</span>
          </button>
        )}
      </div>
    </header>
  );
}
