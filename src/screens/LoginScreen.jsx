import React, { useState } from 'react';
import { Sparkles, Lock, User, ArrowRight, Heart } from 'lucide-react';
import { login } from '../services/authService';

export function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await login(username, password);
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg('Erro ao tentar conectar.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await login(user, pass);
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'calc(var(--safe-top) + 20px) 20px calc(var(--safe-bottom) + 20px) 20px',
        backgroundColor: 'var(--bg-app)'
      }}
    >
      <div className="card" style={{ padding: '28px 20px', textAlign: 'center', borderColor: 'var(--border-subtle)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <img
            src="./logo.png"
            alt="Casa em Paz"
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '24px',
              objectFit: 'cover',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
            }}
          />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: '800', marginBottom: '4px' }}>
          Casa em Paz
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '22px' }}>
          O cantinho acolhedor de tarefas e harmonia do casal.
        </p>

        {errorMsg && (
          <div
            style={{
              backgroundColor: 'var(--accent-rose-light)',
              color: 'var(--accent-rose)',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              marginBottom: '14px',
              fontWeight: '600'
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} />
              <span>Usuário</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Kah ou Adryan"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} />
              <span>Senha</span>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Digite sua senha..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-action-large"
            disabled={loading}
            style={{ marginBottom: '8px' }}
          >
            <span>{loading ? 'Entrando...' : 'Entrar no Lar'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Atalhos de Acesso Rápido em 1 Toque */}
        <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px dashed var(--border-subtle)' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Acesso Rápido em 1 Toque:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '10px 8px', fontSize: '0.82rem', justifyContent: 'center' }}
              onClick={() => handleQuickLogin('Adryan', 'Adryan123')}
              disabled={loading}
            >
              🧔‍♂️ Adryan
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '10px 8px', fontSize: '0.82rem', justifyContent: 'center' }}
              onClick={() => handleQuickLogin('Kah', 'Kah123')}
              disabled={loading}
            >
              👩‍🦰 Kah
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
