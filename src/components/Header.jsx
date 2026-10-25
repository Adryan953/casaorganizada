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
  onLogout
}) {
  const otherUser = users.find((u) => u.id !== activeUser.id) || users[1];

  return (
    <header className="app-header">
      <div className="header-top-row">
        {/* Marca do App */}
        <div className="brand-wrapper">
          <img
            src="./logo.png"
            alt="Casa em Paz"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              objectFit: 'cover',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
          />
          <div>
            <h1 className="brand-title">Casa em Paz</h1>
            <p className="brand-subtitle">
              Casal: <strong style={{ color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>{coupleCode}</strong>
            </p>
          </div>
        </div>

        {/* Controles do Topo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Status de Sincronização em Tempo Real */}
          <div
            title={syncStatus.online ? 'Sincronizado ao vivo entre os celulares' : 'Conectando à nuvem...'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.74rem',
              fontWeight: '700',
              padding: '4px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: syncStatus.online ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: syncStatus.online ? 'var(--accent-primary)' : 'var(--accent-warm)',
              cursor: 'pointer'
            }}
            onClick={onOpenSettings}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: syncStatus.online ? '#10b981' : '#f59e0b',
                display: 'inline-block'
              }}
            />
            <span>{syncStatus.online ? 'Ao Vivo' : 'Reconectando'}</span>
          </div>

          {/* Alternar Tema */}
          <button
            className="btn-icon-subtle"
            onClick={onToggleTheme}
            aria-label="Alternar modo claro e escuro"
            title="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Botão Sair */}
          {onLogout && (
            <button
              className="btn-icon-subtle"
              onClick={onLogout}
              aria-label="Sair da conta"
              title="Trocar de conta / Sair"
            >
              <LogOut size={16} />
            </button>
          )}
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
          <span style={{ color: 'var(--text-muted)' }}>Você:</span>
          <span style={{ fontWeight: '700', color: activeUser.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{activeUser.avatar}</span>
            <span>{activeUser.name}</span>
          </span>
        </div>

        {otherUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Com:</span>
            <span style={{ fontWeight: '600' }}>{otherUser.avatar} {otherUser.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
