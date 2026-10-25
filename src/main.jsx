import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ErrorBoundary para blindar o app contra qualquer tela branca
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('casa_em_paz_data_v1');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          <img
            src="./logo.png"
            alt="Casa em Paz"
            style={{ width: '80px', height: '80px', borderRadius: '18px', marginBottom: '16px' }}
          />
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '8px' }}>
            Casa em Paz 🌿
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '16px', maxWidth: '300px' }}>
            Tivemos um pequeno imprevisto ao carregar o aplicativo. Toque abaixo para recarregar com segurança.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#10b981',
                color: 'white',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Recarregar Aplicativo
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px',
                borderRadius: '12px',
                border: '1px solid #334155',
                backgroundColor: 'transparent',
                color: '#94a3b8',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Restaurar Dados Padrão
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
