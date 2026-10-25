import React, { useState } from 'react';
import { Clock, Sun, Sunset, Moon, Coffee, Briefcase, Zap, Check } from 'lucide-react';
import { DAYS_OF_WEEK } from '../constants/initialData';

export function AvailabilityScreen({
  users = [],
  activeUser,
  availability = {},
  onSaveAvailability
}) {
  const [selectedUserId, setSelectedUserId] = useState(activeUser.id);
  const [localAvail, setLocalAvail] = useState(availability);

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];
  const userDays = localAvail[selectedUserId] || {};

  // Altera tipo rápido (corrido / normal / folga)
  const handleQuickPreset = (dayIndex, type) => {
    let freeMinutes = 120;
    let morning = true;
    let afternoon = false;
    let night = true;

    if (type === 'busy') {
      freeMinutes = 30;
      morning = true;
      afternoon = false;
      night = false;
    } else if (type === 'off') {
      freeMinutes = 300;
      morning = true;
      afternoon = true;
      night = true;
    } else {
      // normal
      freeMinutes = 120;
      morning = true;
      afternoon = false;
      night = true;
    }

    const updated = {
      ...localAvail,
      [selectedUserId]: {
        ...userDays,
        [dayIndex]: {
          type,
          freeMinutes,
          morning,
          afternoon,
          night
        }
      }
    };

    setLocalAvail(updated);
    onSaveAvailability(updated);
  };

  // Alterna turno específico (manhã / tarde / noite)
  const handleTogglePeriod = (dayIndex, period) => {
    const currentDay = userDays[dayIndex] || { freeMinutes: 120, morning: true, afternoon: false, night: true };
    const updated = {
      ...localAvail,
      [selectedUserId]: {
        ...userDays,
        [dayIndex]: {
          ...currentDay,
          [period]: !currentDay[period]
        }
      }
    };

    setLocalAvail(updated);
    onSaveAvailability(updated);
  };

  // Altera minutos livres
  const handleMinutesChange = (dayIndex, minutes) => {
    const currentDay = userDays[dayIndex] || { freeMinutes: 120, morning: true, afternoon: false, night: true };
    const updated = {
      ...localAvail,
      [selectedUserId]: {
        ...userDays,
        [dayIndex]: {
          ...currentDay,
          freeMinutes: Number(minutes) || 0
        }
      }
    };

    setLocalAvail(updated);
    onSaveAvailability(updated);
  };

  return (
    <div>
      {/* Cabeçalho com Seletor do Parceiro */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Disponibilidade Semanal</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Defina seus horários livres para que o app nunca agende tarefas quando você estiver ocupado.
        </p>

        {/* Alternador de Perfil para Configuração */}
        <div className="tabs-pill-container" style={{ marginTop: '12px' }}>
          {users.map((u) => {
            const isSelected = u.id === selectedUserId;
            return (
              <button
                key={u.id}
                className={`tab-pill ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedUserId(u.id)}
              >
                <span>{u.avatar}</span>
                <span>Horários de {u.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista dos 7 Dias da Semana */}
      {DAYS_OF_WEEK.map((day) => {
        const dayConfig = userDays[day.index] || {
          type: 'normal',
          freeMinutes: 120,
          morning: true,
          afternoon: false,
          night: true
        };

        return (
          <div key={day.index} className="card" style={{ marginBottom: '12px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{day.label}</strong>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor:
                      dayConfig.type === 'busy'
                        ? 'rgba(239, 68, 68, 0.12)'
                        : dayConfig.type === 'off'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(59, 130, 246, 0.12)',
                    color:
                      dayConfig.type === 'busy'
                        ? '#ef4444'
                        : dayConfig.type === 'off'
                        ? '#10b981'
                        : '#3b82f6',
                    fontWeight: '700'
                  }}
                >
                  {dayConfig.type === 'busy' ? 'Dia Corrido' : dayConfig.type === 'off' ? 'Folga' : 'Dia Normal'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <Clock size={14} />
                <span>{dayConfig.freeMinutes} min livres</span>
              </div>
            </div>

            {/* Botões Rápidos de 1 Toque */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
              <button
                type="button"
                className={`btn-task-action ${dayConfig.type === 'busy' ? 'active' : ''}`}
                style={{
                  backgroundColor: dayConfig.type === 'busy' ? 'var(--accent-rose-light)' : 'var(--bg-app)',
                  borderColor: dayConfig.type === 'busy' ? 'var(--accent-rose)' : 'var(--border-subtle)',
                  color: dayConfig.type === 'busy' ? 'var(--accent-rose)' : 'var(--text-secondary)'
                }}
                onClick={() => handleQuickPreset(day.index, 'busy')}
              >
                <Zap size={14} />
                <span>Corrido (30m)</span>
              </button>

              <button
                type="button"
                className={`btn-task-action ${dayConfig.type === 'normal' ? 'active' : ''}`}
                style={{
                  backgroundColor: dayConfig.type === 'normal' ? 'var(--accent-indigo-light)' : 'var(--bg-app)',
                  borderColor: dayConfig.type === 'normal' ? 'var(--accent-indigo)' : 'var(--border-subtle)',
                  color: dayConfig.type === 'normal' ? 'var(--accent-indigo)' : 'var(--text-secondary)'
                }}
                onClick={() => handleQuickPreset(day.index, 'normal')}
              >
                <Briefcase size={14} />
                <span>Normal (2h)</span>
              </button>

              <button
                type="button"
                className={`btn-task-action ${dayConfig.type === 'off' ? 'active' : ''}`}
                style={{
                  backgroundColor: dayConfig.type === 'off' ? 'var(--accent-primary-light)' : 'var(--bg-app)',
                  borderColor: dayConfig.type === 'off' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  color: dayConfig.type === 'off' ? 'var(--accent-primary)' : 'var(--text-secondary)'
                }}
                onClick={() => handleQuickPreset(day.index, 'off')}
              >
                <Coffee size={14} />
                <span>Folga (5h)</span>
              </button>
            </div>

            {/* Turnos Livres no Dia */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '8px',
                fontSize: '0.78rem'
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Horários livres:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleTogglePeriod(day.index, 'morning')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: dayConfig.morning ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: dayConfig.morning ? 'var(--accent-primary-light)' : 'transparent',
                    color: dayConfig.morning ? 'var(--accent-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  <Sun size={12} />
                  <span>Manhã</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTogglePeriod(day.index, 'afternoon')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: dayConfig.afternoon ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: dayConfig.afternoon ? 'var(--accent-primary-light)' : 'transparent',
                    color: dayConfig.afternoon ? 'var(--accent-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  <Sunset size={12} />
                  <span>Tarde</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTogglePeriod(day.index, 'night')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: dayConfig.night ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: dayConfig.night ? 'var(--accent-primary-light)' : 'transparent',
                    color: dayConfig.night ? 'var(--accent-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}
                >
                  <Moon size={12} />
                  <span>Noite</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
