import React, { useState } from 'react';
import { Scale, Heart, Sparkles, TrendingUp, Clock, Flame, ShieldCheck } from 'lucide-react';
import { calculateBalanceMetrics } from '../services/schedulerService';

export function BalanceScreen({ users = [], schedule = [], targetRatio = { user1: 50, user2: 50 } }) {
  const [periodTab, setPeriodTab] = useState('weekly'); // 'weekly' | 'monthly'

  const user1 = users[0] || { id: 'user1', name: 'Eu', avatar: '🧔', color: '#3b82f6' };
  const user2 = users[1] || { id: 'user2', name: 'Kassandra', avatar: '👩', color: '#ec4899' };

  // Métricas do agendamento
  const metrics = calculateBalanceMetrics(schedule, users);

  // Fator multiplicador para simular mensalidade ou histórico
  const multiplier = periodTab === 'monthly' ? 4 : 1;
  const u1Points = metrics[user1.id]?.points * multiplier || 0;
  const u2Points = metrics[user2.id]?.points * multiplier || 0;
  const u1Minutes = metrics[user1.id]?.minutes * multiplier || 0;
  const u2Minutes = metrics[user2.id]?.minutes * multiplier || 0;

  const totalPoints = u1Points + u2Points || 1;
  const u1PointsPercent = Math.round((u1Points / totalPoints) * 100);
  const u2PointsPercent = 100 - u1PointsPercent;

  const totalMinutes = u1Minutes + u2Minutes || 1;
  const u1MinPercent = Math.round((u1Minutes / totalMinutes) * 100);
  const u2MinPercent = 100 - u1MinPercent;

  // Formata minutos em "Xh Ym"
  const formatTime = (mins) => {
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    if (hours === 0) return `${m} min`;
    return `${hours}h ${m > 0 ? `${m}m` : ''}`;
  };

  // Conta tarefas pesadas de cada um
  const u1Heavy = schedule.filter((t) => t.assignedTo === user1.id && t.effortLevel === 3).length * multiplier;
  const u2Heavy = schedule.filter((t) => t.assignedTo === user2.id && t.effortLevel === 3).length * multiplier;

  // Alívio de sobrecargas (quantas tarefas que sobrecarregam o parceiro foram feitas pelo outro)
  const u1SavedPartner = schedule.filter(
    (t) => t.assignedTo === user1.id && (t.overloadsUsers || []).includes(user2.id)
  ).length * multiplier;

  const u2SavedPartner = schedule.filter(
    (t) => t.assignedTo === user2.id && (t.overloadsUsers || []).includes(user1.id)
  ).length * multiplier;

  return (
    <div>
      {/* Seletor Semanal / Mensal */}
      <div className="tabs-pill-container" style={{ maxWidth: '280px', margin: '0 auto 16px auto' }}>
        <button
          className={`tab-pill ${periodTab === 'weekly' ? 'active' : ''}`}
          onClick={() => setPeriodTab('weekly')}
        >
          <span>Visão da Semana</span>
        </button>
        <button
          className={`tab-pill ${periodTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setPeriodTab('monthly')}
        >
          <span>Mês Inteiro</span>
        </button>
      </div>

      {/* Cartão de Mensagem Acolhedora Principal */}
      <div className="card" style={{ textAlign: 'center', padding: '24px 20px', borderColor: 'var(--accent-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)'
            }}
          >
            <Scale size={26} />
          </div>
        </div>

        <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '6px' }}>
          {u1PointsPercent}% / {u2PointsPercent}%
        </h3>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '340px', margin: '0 auto', lineHeight: '1.4' }}>
          {metrics.friendlyMessage}
        </p>

        {/* Barra Visual de Equilíbrio com Marcador Central */}
        <div className="balance-bar-wrapper" style={{ height: '28px', marginTop: '16px' }}>
          <div
            className="balance-segment"
            style={{
              width: `${u1PointsPercent}%`,
              backgroundColor: user1.color || '#3b82f6'
            }}
          >
            {u1PointsPercent}%
          </div>
          <div className="balance-center-marker" title="Centro ideal 50/50" />
          <div
            className="balance-segment"
            style={{
              width: `${u2PointsPercent}%`,
              backgroundColor: user2.color || '#ec4899'
            }}
          >
            {u2PointsPercent}%
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          <span>{user1.avatar} {user1.name}</span>
          <span>Meta: {targetRatio.user1 || 50}% / {targetRatio.user2 || 50}%</span>
          <span>{user2.avatar} {user2.name}</span>
        </div>
      </div>

      {/* Comparativo Detalhado Lado a Lado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {/* Card Usuário 1 */}
        <div className="card" style={{ padding: '16px 12px', borderTop: `4px solid ${user1.color}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '1.4rem' }}>{user1.avatar}</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{user1.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u1PointsPercent}% do esforço</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pontos:</span>
              <strong>{u1Points} pts</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tempo:</span>
              <strong>{formatTime(u1Minutes)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pesadas:</span>
              <strong style={{ color: '#ef4444' }}>{u1Heavy}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
              <span style={{ color: 'var(--accent-primary)', fontSize: '0.74rem' }}>Apoiou {user2.name}:</span>
              <strong style={{ color: 'var(--accent-primary)' }}>{u1SavedPartner}x</strong>
            </div>
          </div>
        </div>

        {/* Card Usuário 2 */}
        <div className="card" style={{ padding: '16px 12px', borderTop: `4px solid ${user2.color}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '1.4rem' }}>{user2.avatar}</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{user2.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u2PointsPercent}% do esforço</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pontos:</span>
              <strong>{u2Points} pts</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tempo:</span>
              <strong>{formatTime(u2Minutes)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pesadas:</span>
              <strong style={{ color: '#ef4444' }}>{u2Heavy}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
              <span style={{ color: 'var(--accent-primary)', fontSize: '0.74rem' }}>Apoiou {user1.name}:</span>
              <strong style={{ color: 'var(--accent-primary)' }}>{u2SavedPartner}x</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico Secundário: Proporção de Tempo Dedicado */}
      <div className="card">
        <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={16} />
          <span>Equilíbrio de Horas Dedicadas</span>
        </h4>
        <div className="balance-bar-wrapper" style={{ height: '14px', margin: '8px 0' }}>
          <div
            className="balance-segment"
            style={{ width: `${u1MinPercent}%`, backgroundColor: user1.color }}
          />
          <div
            className="balance-segment"
            style={{ width: `${u2MinPercent}%`, backgroundColor: user2.color }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>{user1.name}: {formatTime(u1Minutes)} ({u1MinPercent}%)</span>
          <span>{user2.name}: {formatTime(u2Minutes)} ({u2MinPercent}%)</span>
        </div>
      </div>

      {/* Destaque das Regras Anti-Sobrecarga em Ação */}
      <div className="card" style={{ background: 'var(--bg-app)' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} color="var(--accent-primary)" />
          <span>Proteção Anti-Sobrecarga Ativa</span>
        </h4>
        <ul style={{ paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          <li>As tarefas mais pesadas foram alternadas para ninguém repetir na semana seguinte.</li>
          <li>As tarefas marcadas como sobrecarga para Kassandra foram priorizadas com apoio de {user1.name}.</li>
          <li>A pontuação pondera tempo real e cansaço físico (1x leve, 2x médio, 3x pesado).</li>
        </ul>
      </div>
    </div>
  );
}
