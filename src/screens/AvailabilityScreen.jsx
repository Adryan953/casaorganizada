import React, { useState } from 'react';
import {
  Clock,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Briefcase,
  Zap,
  Check,
  Sliders,
  Plus,
  Minus,
  Sparkles,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DAYS_OF_WEEK } from '../constants/initialData';

// Formata minutos em formato legível (ex: "2h 30m" ou "45 min")
function formatMinutesToHours(minutes) {
  const m = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

// Calcula diferença de minutos entre dois horários "HH:MM"
function calculateMinutesBetweenTimes(start, end) {
  if (!start || !end) return 120;
  const [h1, m1] = (start || '08:00').split(':').map(Number);
  const [h2, m2] = (end || '10:00').split(':').map(Number);
  let totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60; // Passa da meia-noite
  }
  return totalMinutes;
}

// Dedução automática de períodos a partir do horário
function deducePeriodsFromRange(start, end) {
  if (!start || !end) return { morning: true, afternoon: false, night: true };
  const [h1] = (start || '08:00').split(':').map(Number);
  const [h2] = (end || '12:00').split(':').map(Number);
  const endHour = h2 < h1 ? h2 + 24 : h2;

  const morning = h1 < 12 && endHour > 6;
  const afternoon = h1 < 18 && endHour > 12;
  const night = endHour > 18 || h1 >= 18;

  return {
    morning: morning || (!afternoon && !night),
    afternoon,
    night
  };
}

export function AvailabilityScreen({
  users = [],
  activeUser,
  availability = {},
  onSaveAvailability,
  onRegenerateSchedule
}) {
  const [selectedUserId, setSelectedUserId] = useState(activeUser.id);
  const [localAvail, setLocalAvail] = useState(availability);
  const [expandedDay, setExpandedDay] = useState(null); // dia aberto para edição de horário detalhado
  const [savedFeedback, setSavedFeedback] = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];
  const userDays = localAvail[selectedUserId] || {};

  // Atualiza disponibilidade e salva
  const updateAndSave = (updatedDays) => {
    const newAvail = {
      ...localAvail,
      [selectedUserId]: updatedDays
    };
    setLocalAvail(newAvail);
    onSaveAvailability(newAvail);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  // Presets Rápidos (Corrido, Normal, Folga ou Personalizado)
  const handleSelectPreset = (dayIndex, type) => {
    const current = userDays[dayIndex] || {};
    let freeMinutes = 120;
    let morning = true;
    let afternoon = false;
    let night = true;
    let startTime = current.startTime || '08:00';
    let endTime = current.endTime || '10:00';

    if (type === 'busy') {
      freeMinutes = 30;
      morning = true;
      afternoon = false;
      night = false;
      startTime = '07:30';
      endTime = '08:00';
      setExpandedDay(null);
    } else if (type === 'normal') {
      freeMinutes = 120;
      morning = true;
      afternoon = false;
      night = true;
      startTime = '08:00';
      endTime = '10:00';
      setExpandedDay(null);
    } else if (type === 'off') {
      freeMinutes = 300;
      morning = true;
      afternoon = true;
      night = true;
      startTime = '09:00';
      endTime = '14:00';
      setExpandedDay(null);
    } else if (type === 'custom') {
      // Abre painel de personalização do dia
      freeMinutes = current.freeMinutes || 90;
      morning = current.morning ?? true;
      afternoon = current.afternoon ?? true;
      night = current.night ?? true;
      startTime = current.startTime || '18:00';
      endTime = current.endTime || '20:30';
      setExpandedDay(dayIndex);
    }

    const updated = {
      ...userDays,
      [dayIndex]: {
        ...current,
        type,
        freeMinutes,
        morning,
        afternoon,
        night,
        startTime,
        endTime,
        customMode: current.customMode || 'range'
      }
    };

    updateAndSave(updated);
  };

  // Altera horário de início e término no modo personalizado
  const handleTimeRangeChange = (dayIndex, newStart, newEnd) => {
    const current = userDays[dayIndex] || {};
    const start = newStart !== undefined ? newStart : (current.startTime || '18:00');
    const end = newEnd !== undefined ? newEnd : (current.endTime || '20:00');
    const calculatedMinutes = calculateMinutesBetweenTimes(start, end);
    const autoPeriods = deducePeriodsFromRange(start, end);

    const updated = {
      ...userDays,
      [dayIndex]: {
        ...current,
        type: 'custom',
        customMode: 'range',
        startTime: start,
        endTime: end,
        freeMinutes: calculatedMinutes,
        morning: autoPeriods.morning,
        afternoon: autoPeriods.afternoon,
        night: autoPeriods.night
      }
    };

    updateAndSave(updated);
  };

  // Ajusta minutos livres diretamente no modo personalizado (+15, -15, etc.)
  const handleAdjustMinutes = (dayIndex, deltaMinutes) => {
    const current = userDays[dayIndex] || { freeMinutes: 120 };
    const currentMin = Number(current.freeMinutes) || 120;
    const nextMin = Math.max(15, Math.min(720, currentMin + deltaMinutes));

    const updated = {
      ...userDays,
      [dayIndex]: {
        ...current,
        type: 'custom',
        freeMinutes: nextMin
      }
    };

    updateAndSave(updated);
  };

  // Digitação direta dos minutos
  const handleDirectMinutes = (dayIndex, minutes) => {
    const current = userDays[dayIndex] || {};
    const val = Math.max(0, Math.min(720, Number(minutes) || 0));

    const updated = {
      ...userDays,
      [dayIndex]: {
        ...current,
        type: 'custom',
        freeMinutes: val
      }
    };

    updateAndSave(updated);
  };

  // Alterna períodos do dia (Manhã, Tarde, Noite)
  const handleTogglePeriod = (dayIndex, period) => {
    const current = userDays[dayIndex] || { freeMinutes: 120, morning: true, afternoon: false, night: true };
    const updated = {
      ...userDays,
      [dayIndex]: {
        ...current,
        [period]: !current[period]
      }
    };

    updateAndSave(updated);
  };

  // Copia a configuração de um dia para Segunda a Sexta
  const handleCopyWeekdays = (sourceDayIndex) => {
    const sourceConfig = userDays[sourceDayIndex];
    if (!sourceConfig) return;

    const updated = { ...userDays };
    // 1 a 5 = Seg a Sex
    [1, 2, 3, 4, 5].forEach((d) => {
      updated[d] = { ...sourceConfig };
    });

    updateAndSave(updated);
    alert(`Horário de ${DAYS_OF_WEEK.find((d) => d.index === sourceDayIndex)?.label} copiado para Segunda a Sexta!`);
  };

  // Copia para o fim de semana (Sáb e Dom)
  const handleCopyWeekend = (sourceDayIndex) => {
    const sourceConfig = userDays[sourceDayIndex];
    if (!sourceConfig) return;

    const updated = { ...userDays };
    [0, 6].forEach((d) => {
      updated[d] = { ...sourceConfig };
    });

    updateAndSave(updated);
    alert(`Horário de ${DAYS_OF_WEEK.find((d) => d.index === sourceDayIndex)?.label} copiado para Sábado e Domingo!`);
  };

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Disponibilidade & Horários</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Personalize o tempo livre de cada um para que tarefas nunca caiam em horas ocupadas.
            </p>
          </div>
          {savedFeedback && (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#10b981',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Check size={14} /> Salvo!
            </span>
          )}
        </div>

        {/* Alternador de Perfil */}
        <div className="tabs-pill-container" style={{ marginTop: '12px' }}>
          {users.map((u) => {
            const isSelected = u.id === selectedUserId;
            return (
              <button
                key={u.id}
                className={`tab-pill ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedUserId(u.id);
                  setExpandedDay(null);
                }}
              >
                <span>{u.avatar}</span>
                <span>Horários de {u.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dica amigável */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--accent-primary-light)',
          color: 'var(--text-primary)',
          fontSize: '0.8rem',
          marginBottom: '14px'
        }}
      >
        <Sparkles size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        <span>
          Toque em <strong>Personalizado ⏱️</strong> para colocar horários exatos (ex: 18:00 às 20:30) ou ajustar minutos livres maiores/menores.
        </span>
      </div>

      {/* Lista dos 7 Dias da Semana */}
      {DAYS_OF_WEEK.map((day) => {
        const dayConfig = userDays[day.index] || {
          type: 'normal',
          freeMinutes: 120,
          morning: true,
          afternoon: false,
          night: true,
          startTime: '08:00',
          endTime: '10:00',
          customMode: 'range'
        };

        const isExpanded = expandedDay === day.index;
        const isCustom = dayConfig.type === 'custom';

        return (
          <div
            key={day.index}
            className="card"
            style={{
              marginBottom: '12px',
              padding: '14px',
              borderColor: isCustom ? 'var(--accent-primary)' : 'var(--border-subtle)',
              boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            {/* Topo do Card: Nome do dia e Total de Tempo Livre */}
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
                        : dayConfig.type === 'custom'
                        ? 'rgba(168, 85, 247, 0.15)'
                        : 'rgba(59, 130, 246, 0.12)',
                    color:
                      dayConfig.type === 'busy'
                        ? '#ef4444'
                        : dayConfig.type === 'off'
                        ? '#10b981'
                        : dayConfig.type === 'custom'
                        ? '#9333ea'
                        : '#3b82f6',
                    fontWeight: '700'
                  }}
                >
                  {dayConfig.type === 'busy'
                    ? 'Corrido'
                    : dayConfig.type === 'off'
                    ? 'Folga'
                    : dayConfig.type === 'custom'
                    ? 'Personalizado'
                    : 'Normal'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: isCustom ? 'var(--accent-primary)' : 'var(--text-primary)'
                }}
              >
                <Clock size={15} />
                <span>{formatMinutesToHours(dayConfig.freeMinutes)} livres</span>
              </div>
            </div>

            {/* 4 Botões Rápidos (Corrido, Normal, Folga, Personalizado) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1.2fr',
                gap: '6px',
                marginBottom: '10px'
              }}
            >
              <button
                type="button"
                className={`btn-task-action ${dayConfig.type === 'busy' ? 'active' : ''}`}
                style={{
                  padding: '8px 4px',
                  backgroundColor: dayConfig.type === 'busy' ? 'var(--accent-rose-light)' : 'var(--bg-app)',
                  borderColor: dayConfig.type === 'busy' ? 'var(--accent-rose)' : 'var(--border-subtle)',
                  color: dayConfig.type === 'busy' ? 'var(--accent-rose)' : 'var(--text-secondary)',
                  fontSize: '0.74rem'
                }}
                onClick={() => handleSelectPreset(day.index, 'busy')}
              >
                <Zap size={13} />
                <span>Corrido (30m)</span>
              </button>

              <button
                type="button"
                className={`btn-task-action ${dayConfig.type === 'normal' ? 'active' : ''}`}
                style={{
                  padding: '8px 4px',
                  backgroundColor: dayConfig.type === 'normal' ? 'var(--accent-indigo-light)' : 'var(--bg-app)',
                  borderColor: dayConfig.type === 'normal' ? 'var(--accent-indigo)' : 'var(--border-subtle)',
                  color: dayConfig.type === 'normal' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                  fontSize: '0.74rem'
                }}
                onClick={() => handleSelectPreset(day.index, 'normal')}
              >
                <Briefcase size={13} />
                <span>Normal (2h)</span>
              </button>

              <button
                type="button"
                className={`btn-task-action ${dayConfig.type === 'off' ? 'active' : ''}`}
                style={{
                  padding: '8px 4px',
                  backgroundColor: dayConfig.type === 'off' ? 'var(--accent-primary-light)' : 'var(--bg-app)',
                  borderColor: dayConfig.type === 'off' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  color: dayConfig.type === 'off' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontSize: '0.74rem'
                }}
                onClick={() => handleSelectPreset(day.index, 'off')}
              >
                <Coffee size={13} />
                <span>Folga (5h)</span>
              </button>

              <button
                type="button"
                className={`btn-task-action ${isCustom ? 'active' : ''}`}
                style={{
                  padding: '8px 4px',
                  backgroundColor: isCustom ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-app)',
                  borderColor: isCustom ? '#9333ea' : 'var(--border-subtle)',
                  color: isCustom ? '#9333ea' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: '700'
                }}
                onClick={() => {
                  if (dayConfig.type !== 'custom') {
                    handleSelectPreset(day.index, 'custom');
                  } else {
                    setExpandedDay(isExpanded ? null : day.index);
                  }
                }}
              >
                <Sliders size={13} />
                <span>Personalizar</span>
                {isCustom && (isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
              </button>
            </div>

            {/* PAINEL DETALHADO DO MODO PERSONALIZADO */}
            {isCustom && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {/* 1. Escolha por Horário (Início e Fim) */}
                <div style={{ marginBottom: '12px' }}>
                  <label
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '6px'
                    }}
                  >
                    <Clock size={14} color="var(--accent-primary)" />
                    <span>Definir por Horário Livre (De / Até):</span>
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Horário de Início</span>
                      <input
                        type="time"
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                        value={dayConfig.startTime || '18:00'}
                        onChange={(e) => handleTimeRangeChange(day.index, e.target.value, undefined)}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Horário de Fim</span>
                      <input
                        type="time"
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                        value={dayConfig.endTime || '20:30'}
                        onChange={(e) => handleTimeRangeChange(day.index, undefined, e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Ajuste Fino do Tempo Total Livre */}
                <div style={{ marginBottom: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Ou ajuste os minutos livres direto:
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
                      {formatMinutesToHours(dayConfig.freeMinutes)} ({dayConfig.freeMinutes} min)
                    </span>
                  </div>

                  {/* Botões de + e - rápidos */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '6px 2px', fontSize: '0.75rem' }}
                      onClick={() => handleAdjustMinutes(day.index, -30)}
                    >
                      <Minus size={12} /> 30m
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '6px 2px', fontSize: '0.75rem' }}
                      onClick={() => handleAdjustMinutes(day.index, -15)}
                    >
                      <Minus size={12} /> 15m
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '6px 2px', fontSize: '0.75rem' }}
                      onClick={() => handleAdjustMinutes(day.index, 15)}
                    >
                      <Plus size={12} /> 15m
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '6px 2px', fontSize: '0.75rem' }}
                      onClick={() => handleAdjustMinutes(day.index, 30)}
                    >
                      <Plus size={12} /> 30m
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '6px 2px', fontSize: '0.75rem' }}
                      onClick={() => handleAdjustMinutes(day.index, 60)}
                    >
                      <Plus size={12} /> 1h
                    </button>
                  </div>
                </div>

                {/* 3. Ações Rápidas de Cópia */}
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '8px',
                    marginTop: '8px'
                  }}
                >
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '6px 8px',
                      fontSize: '0.7rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px dashed var(--border-subtle)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleCopyWeekdays(day.index)}
                  >
                    <Copy size={12} />
                    <span>Copiar Seg-Sex</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '6px 8px',
                      fontSize: '0.7rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px dashed var(--border-subtle)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleCopyWeekend(day.index)}
                  >
                    <Copy size={12} />
                    <span>Copiar Sáb-Dom</span>
                  </button>
                </div>
              </div>
            )}

            {/* Turnos Livres no Dia */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '8px',
                marginTop: '8px',
                fontSize: '0.78rem'
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Turnos livres:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
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

      {/* Botão de Reequilibrar a Semana */}
      {onRegenerateSchedule && (
        <div style={{ marginTop: '16px', marginBottom: '24px' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
            onClick={() => {
              onRegenerateSchedule();
              alert('Semana reequilibrada com sucesso de acordo com os novos horários! 🌿');
            }}
          >
            <Sparkles size={18} />
            <span>Reequilibrar Tarefas da Semana Agora</span>
          </button>
        </div>
      )}
    </div>
  );
}
