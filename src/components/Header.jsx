import React from 'react';
import { Sparkles, Moon, Sun, Wifi, WifiOff, LogOut } from 'lucide-react';

export function Header({
  activeUser,
  users = [],
  onSwitchUser,
  syncStatus = { online: true },
  coupleCode,
  theme,
  onToggleTheme,
  onOpenSettings,
  onLogout,
  onForceSync
}) {
  const otherUser = users.find((u) => u.id !== activeUser?.id) || users[1];

  return (
    <header className="app-header">
      <div className="header-top-row">
        {/* Marca do App */}
        <div className="brand-wrapper" style={{ minWidth: 0, flexShrink: 1 }}>
          <img
            src="./logo.png"
            alt="Casa em Paz"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              objectFit: 'cover',
              boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
              flexShrink: 0
            }}
          />
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <h1 className="brand-title">Casa em Paz</h1>
            <p className="brand-subtitle">
              Casal: <strong style={{ color: 'var(--accent-primary)', letterSpacing: '0.03em' }}>{coupleCode}</strong>
            </p>
          </div>
        </div>

        {/* Controles do Topo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {/* Status de Sincronização em Tempo Real */}
          <div
            title={syncStatus.online ? 'Sincronizado ao vivo entre os celulares (Toque para sincronizar)' : 'Conectando à nuvem...'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '3px 7px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: syncStatus.online ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.15)',
              color: syncStatus.online ? 'var(--accent-primary)' : 'var(--accent-warm)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            onClick={onForceSync ? onForceSync : onOpenSettings}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: syncStatus.online ? '#10b981' : '#f59e0b',
                display: 'inline-block'
              }}
            />
            <span>{syncStatus.online ? 'Ao Vivo' : 'Conectando'}</span>
          </div>

          {/* Alternar Tema */}
          <button
            className="btn-icon-subtle"
            onClick={onToggleTheme}
            aria-label="Alternar modo claro e escuro"
            title="Alternar tema"
            style={{ padding: '5px' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Botão Sair */}
          {onLogout && (
            <button
              className="btn-icon-subtle"
              onClick={onLogout}
              aria-label="Sair da conta"
              title="Trocar de conta / Sair"
              style={{ padding: '5px' }}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Barra de Perfil Ativo Fina e Discreta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          backgroundColor: 'var(--bg-app)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          lineHeight: 1.2
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <span style={{ color: 'var(--text-muted)' }}>Você:</span>
          <span style={{ fontWeight: '700', color: activeUser?.color, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span>{activeUser?.avatar}</span>
            <span>{activeUser?.name}</span>
          </span>
        </div>

        {otherUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--text-muted)' }}>Com:</span>
            <span style={{ fontWeight: '600' }}>{otherUser?.avatar} {otherUser?.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
