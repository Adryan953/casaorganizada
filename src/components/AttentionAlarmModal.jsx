import React from 'react';
import { AlertTriangle, BellOff, Volume2, ShieldAlert } from 'lucide-react';

export function AttentionAlarmModal({ alarmData, onStop }) {
  if (!alarmData) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '30px 20px env(safe-area-inset-bottom, 24px) 20px',
        color: '#ffffff',
        textAlign: 'center',
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      {/* Topo: Ícone de Alerta e Pulso */}
      <div style={{ width: '100%', maxWidth: '400px', marginTop: '10px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.25)',
            border: '3px solid #ef4444',
            color: '#ef4444',
            marginBottom: '14px',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.6)'
          }}
        >
          <AlertTriangle size={44} />
        </div>

        <h1
          style={{
            fontSize: '1.6rem',
            fontWeight: '900',
            letterSpacing: '0.02em',
            color: '#f87171',
            marginBottom: '4px',
            textTransform: 'uppercase'
          }}
        >
          Atenção Imediata! 🚨
        </h1>

        <p style={{ fontSize: '0.95rem', color: '#cbd5e1', fontWeight: '600' }}>
          <strong>{alarmData.fromUserName || 'Seu parceiro'}</strong> precisa da sua atenção agora!
        </p>
      </div>

      {/* Conteúdo Central: Card com Título, Descrição e Foto */}
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          backgroundColor: 'rgba(30, 41, 59, 0.9)',
          borderRadius: '20px',
          padding: '18px',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          overflowY: 'auto',
          maxHeight: '45vh',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: '0.72rem',
              fontWeight: '800'
            }}
          >
            ATENÇÃO
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {new Date(alarmData.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff', marginBottom: '6px' }}>
          {alarmData.title || 'Recado Importante da Casa'}
        </h2>

        {alarmData.description && (
          <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '12px' }}>
            {alarmData.description}
          </p>
        )}

        {/* Foto da Reclamação */}
        {alarmData.image && (
          <div style={{ marginTop: '8px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <img
              src={alarmData.image}
              alt="Foto do Alerta"
              style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}
      </div>

      {/* Rodapé: Botão Gigante de Parar o Alarme */}
      <div style={{ width: '100%', maxWidth: '380px', marginTop: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            color: '#fca5a5',
            marginBottom: '10px',
            fontWeight: '600'
          }}
        >
          <Volume2 size={16} />
          <span>O som contínuo só desliga ao tocar no botão:</span>
        </div>

        <button
          type="button"
          onClick={onStop}
          style={{
            width: '100%',
            padding: '18px 24px',
            borderRadius: '16px',
            border: 'none',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: '1.15rem',
            fontWeight: '900',
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.7), 0 6px 12px rgba(0,0,0,0.3)',
            textTransform: 'uppercase'
          }}
        >
          <BellOff size={24} />
          <span>Parar Alarme / Entendido</span>
        </button>
      </div>
    </div>
  );
}
