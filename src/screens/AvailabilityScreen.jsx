import React, { useState, useEffect } from 'react';
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
  ChevronUp,
  Dumbbell,
  Trash2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { DAYS_OF_WEEK, normalizeUserId } from '../constants/initialData';
import {
  getWorkSchedule,
  isUserInWorkHours,
  getBusySlots,
  isUserBusyOrAway,
  BUSY_CATEGORIES,
  getSleepSchedule,
  isTimeInSleepHours
} from '../services/schedulerService';

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
  onRegenerateSchedule,
  onBack
}) {

  const [selectedUserId, setSelectedUserId] = useState(() => normalizeUserId(activeUser?.id));
  const [localAvail, setLocalAvail] = useState(availability);
  const [expandedDay, setExpandedDay] = useState(null); // dia aberto para edição de horário detalhado
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    if (availability) {
      setLocalAvail(availability);
    }
  }, [availability]);

  const normId = normalizeUserId(selectedUserId);
  const selectedUser = users.find((u) => normalizeUserId(u.id) === normId) || users[0];
  const userDays = localAvail[normId] || {};
  const workSchedule = getWorkSchedule(localAvail, normId);
  const busySlots = getBusySlots(localAvail, normId);
  const busyStatus = isUserBusyOrAway(localAvail, normId, 20);

  // Estado para cadastro de novo horário ocupado / fora de casa
  const [isAddingBusySlot, setIsAddingBusySlot] = useState(false);
  const [newSlotData, setNewSlotData] = useState({
    title: '',
    category: 'gym',
    start: '19:00',
    end: '20:30',
    days: [1, 3, 5]
  });

  // Atualiza disponibilidade e salva garantindo que todas as configurações persistam
  const updateAndSave = (updatedDays) => {
    const safeUserDays = {
      ...userDays,
      ...updatedDays,
      workSchedule: updatedDays.workSchedule || userDays.workSchedule || workSchedule,
      sleepSchedule: updatedDays.sleepSchedule || userDays.sleepSchedule || sleepSchedule,
      busySlots: Array.isArray(updatedDays.busySlots)
        ? updatedDays.busySlots
        : (Array.isArray(userDays.busySlots) ? userDays.busySlots : (busySlots || []))
    };

    const newAvail = {
      ...localAvail,
      [normId]: safeUserDays
    };
    setLocalAvail(newAvail);
    onSaveAvailability(newAvail);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleUpdateWorkSchedule = (patch) => {
    const updatedSchedule = {
      ...workSchedule,
      ...patch
    };
    const updatedUserDays = {
      ...userDays,
      workSchedule: updatedSchedule
    };
    updateAndSave(updatedUserDays);
  };

  const sleepSchedule = getSleepSchedule(localAvail, normId);
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isSleepingNow = sleepSchedule.enabled !== false && isTimeInSleepHours(currentTimeStr, sleepSchedule);

  // Gerenciamento de Horário de Sono (Hora de dormir e de acordar)
  const handleUpdateSleepSchedule = (patch) => {
    const updatedSleep = {
      ...sleepSchedule,
      ...patch
    };
    const updatedUserDays = {
      ...userDays,
      sleepSchedule: updatedSleep
    };
    updateAndSave(updatedUserDays);
  };

  // Gerenciamento de Horários Ocupados / Fora de Casa
  const handleSaveNewBusySlot = (e) => {
    e?.preventDefault();
    if (!newSlotData.title?.trim()) {
      alert('Por favor, informe o nome do compromisso (ex: Academia, Plantão).');
      return;
    }

    const newSlot = {
      id: `busy_${Date.now()}`,
      title: newSlotData.title.trim(),
      category: newSlotData.category || 'other',
      start: newSlotData.start || '19:00',
      end: newSlotData.end || '20:30',
      days: newSlotData.days?.length ? newSlotData.days : [1, 3, 5],
      enabled: true
    };

    const currentSlots = Array.isArray(userDays.busySlots) ? userDays.busySlots : [];
    const updatedUserDays = {
      ...userDays,
      busySlots: [...currentSlots, newSlot]
    };

    updateAndSave(updatedUserDays);
    setIsAddingBusySlot(false);
    setNewSlotData({
      title: '',
      category: 'gym',
      start: '19:00',
      end: '20:30',
      days: [1, 3, 5]
    });
  };

  const handleRemoveBusySlot = (slotId) => {
    const currentSlots = Array.isArray(userDays.busySlots) ? userDays.busySlots : [];
    const updatedUserDays = {
      ...userDays,
      busySlots: currentSlots.filter((s) => s.id !== slotId)
    };
    updateAndSave(updatedUserDays);
  };

  const handleToggleBusySlot = (slotId) => {
    const currentSlots = Array.isArray(userDays.busySlots) ? userDays.busySlots : [];
    const updatedUserDays = {
      ...userDays,
      busySlots: currentSlots.map((s) => s.id === slotId ? { ...s, enabled: !s.enabled } : s)
    };
    updateAndSave(updatedUserDays);
  };

  const handleToggleWorkDay = (dayIndex) => {
    const currentDays = workSchedule.days || [1, 2, 3, 4, 5];
    let nextDays;
    if (currentDays.includes(dayIndex)) {
      nextDays = currentDays.filter((d) => d !== dayIndex);
    } else {
      nextDays = [...currentDays, dayIndex].sort((a, b) => a - b);
    }
    handleUpdateWorkSchedule({ days: nextDays });
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
      {/* Botão Voltar */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '12px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <span>← Voltar para Ajustes</span>
        </button>
      )}

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
              <Check size={14} /> Salvo no Banco de Dados! ☁️
            </span>
          )}
        </div>

        {/* Alternador de Perfil */}
        <div className="tabs-pill-container" style={{ marginTop: '12px' }}>
          {users.map((u) => {
            const uNormId = normalizeUserId(u.id);
            const isSelected = uNormId === normId;
            return (
              <button
                key={u.id}
                className={`tab-pill ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedUserId(uNormId);
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

      {/* CARD PRINCIPAL: HORÁRIO DE TRABALHO / EXPEDIENTE */}
      <div
        className="card"
        style={{
          marginBottom: '16px',
          padding: '16px',
          border: '2px solid var(--accent-primary)',
          background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(16, 185, 129, 0.05) 100%)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={22} color="var(--accent-primary)" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                Horário de Trabalho de {selectedUser.name}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Define o expediente para adiar notificações de desabafo e respeitar o foco profissional.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: busyStatus.isBusy ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: busyStatus.isBusy ? '#f59e0b' : '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}
            >
              {busyStatus.icon} {busyStatus.title} {busyStatus.freeAt ? `(até ${busyStatus.freeAt})` : ''}
            </span>
            {busyStatus.alarmTriggerTimeStr && (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                ⏰ Alarme tocará às {busyStatus.alarmTriggerTimeStr} (+20m respiro)
              </span>
            )}
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={workSchedule.enabled}
            onChange={(e) => handleUpdateWorkSchedule({ enabled: e.target.checked })}
            style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            {selectedUser.name} tem horário fixo de trabalho
          </span>
        </label>

        {workSchedule.enabled && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  ⏰ Entrada no Trabalho:
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={workSchedule.start}
                  onChange={(e) => handleUpdateWorkSchedule({ start: e.target.value })}
                  style={{ fontWeight: '700', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  🏁 Saída do Trabalho:
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={workSchedule.end}
                  onChange={(e) => handleUpdateWorkSchedule({ end: e.target.value })}
                  style={{ fontWeight: '700', fontSize: '0.95rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  🍽️ Início do Almoço (opcional):
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={workSchedule.lunchStart}
                  onChange={(e) => handleUpdateWorkSchedule({ lunchStart: e.target.value })}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  🍽️ Fim do Almoço (opcional):
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={workSchedule.lunchEnd}
                  onChange={(e) => handleUpdateWorkSchedule({ lunchEnd: e.target.value })}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  📅 Dias em que trabalha:
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleUpdateWorkSchedule({ days: [1, 2, 3, 4, 5] })}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    Seg-Sex
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateWorkSchedule({ days: [1, 2, 3, 4, 5, 6] })}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    Escala 6x1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateWorkSchedule({ days: [0, 1, 2, 3, 4, 5, 6] })}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    Todos
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {DAYS_OF_WEEK.map((d) => {
                  const isSelected = (workSchedule.days || []).includes(d.index);
                  return (
                    <button
                      key={d.index}
                      type="button"
                      onClick={() => handleToggleWorkDay(d.index)}
                      style={{
                        padding: '8px 2px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? 'var(--accent-primary-light)' : 'var(--bg-app)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: '800',
                        fontSize: '0.74rem',
                        cursor: 'pointer'
                      }}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO 2: OUTROS HORÁRIOS OCUPADOS / FORA DE CASA (Academia, Plantão, Faculdade, etc.) */}
      <div
        className="card"
        style={{
          marginBottom: '16px',
          padding: '16px',
          border: '2px solid #8b5cf6',
          background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(139, 92, 246, 0.05) 100%)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Dumbbell size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                Horários Fora de Casa de {selectedUser.name}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Academia, plantões, faculdade, esportes e compromissos externos.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
            onClick={() => setIsAddingBusySlot(!isAddingBusySlot)}
          >
            <span>{isAddingBusySlot ? '✕ Fechar' : '+ Adicionar'}</span>
          </button>
        </div>

        {/* Formulário para Cadastrar Novo Compromisso */}
        {isAddingBusySlot && (
          <form
            onSubmit={handleSaveNewBusySlot}
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-app)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              marginBottom: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Nome do Compromisso:
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Academia SmartFit, Plantão Noturno, Faculdade..."
                value={newSlotData.title}
                onChange={(e) => setNewSlotData({ ...newSlotData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Categoria / Tipo:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {BUSY_CATEGORIES.map((cat) => {
                  const isCatSelected = newSlotData.category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewSlotData({ ...newSlotData, category: cat.id })}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        border: isCatSelected ? '2px solid #8b5cf6' : '1px solid var(--border-subtle)',
                        backgroundColor: isCatSelected ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-card)',
                        color: isCatSelected ? '#8b5cf6' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{cat.icon}</span> <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Início:
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={newSlotData.start}
                  onChange={(e) => setNewSlotData({ ...newSlotData, start: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Fim:
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={newSlotData.end}
                  onChange={(e) => setNewSlotData({ ...newSlotData, end: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Dias da Semana:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {DAYS_OF_WEEK.map((d) => {
                  const isDaySel = (newSlotData.days || []).includes(d.index);
                  return (
                    <button
                      key={d.index}
                      type="button"
                      onClick={() => {
                        const cur = newSlotData.days || [];
                        const next = cur.includes(d.index)
                          ? cur.filter((x) => x !== d.index)
                          : [...cur, d.index].sort();
                        setNewSlotData({ ...newSlotData, days: next });
                      }}
                      style={{
                        padding: '6px 2px',
                        borderRadius: 'var(--radius-sm)',
                        border: isDaySel ? '2px solid #8b5cf6' : '1px solid var(--border-subtle)',
                        backgroundColor: isDaySel ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-card)',
                        color: isDaySel ? '#8b5cf6' : 'var(--text-secondary)',
                        fontWeight: '800',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '6px', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
            >
              <span>✓ Salvar Horário Fora de Casa</span>
            </button>
          </form>
        )}

        {/* Lista dos Horários Ocupados Cadastrados */}
        {busySlots.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0', fontStyle: 'italic' }}>
            Nenhum outro horário fora de casa cadastrado para {selectedUser.name}. Toque em <strong>+ Adicionar</strong> para cadastrar academia, plantão, futebol ou faculdade!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {busySlots.map((slot) => {
              const cat = BUSY_CATEGORIES.find((c) => c.id === slot.category) || { icon: '📌', label: 'Compromisso' };
              const daysStr = (slot.days || [])
                .map((dIdx) => DAYS_OF_WEEK.find((d) => d.index === dIdx)?.short)
                .join(', ');

              return (
                <div
                  key={slot.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: slot.enabled ? 'var(--bg-card)' : 'rgba(0,0,0,0.03)',
                    opacity: slot.enabled ? 1 : 0.6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                          {slot.title}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: '700' }}>
                          {slot.start} às {slot.end}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Dias: {daysStr || 'Todos'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={slot.enabled}
                      onChange={() => handleToggleBusySlot(slot.id)}
                      title="Ativar/Desativar"
                      style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBusySlot(slot.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      title="Excluir compromisso"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nota sobre o Respiro de 20 Minutos */}
        <div
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(139, 92, 246, 0.08)',
            color: 'var(--text-secondary)',
            fontSize: '0.74rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>⏳</span>
          <span>
            <strong>Margem de 20 Minutos:</strong> O alarme de recados/atenção só tocará <strong>20 minutos depois</strong> do término do compromisso, dando tempo para chegar em casa e respirar com calma.
          </span>
        </div>
      </div>

      {/* SEÇÃO 3: HORÁRIO DE SONO & DESCANSO (Hora que dorme e que acorda para cálculo inteligente) */}
      <div
        className="card"
        style={{
          marginBottom: '16px',
          padding: '16px',
          border: '2px solid #6366f1',
          background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.05) 100%)',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Moon size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                Sono & Descanso de {selectedUser.name}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Hora que dorme e acorda para o cálculo inteligente de alarmes e tarefas.
              </p>
            </div>
          </div>

          <span
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: '800',
              backgroundColor: isSleepingNow ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: isSleepingNow ? '#6366f1' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            {isSleepingNow ? `😴 Dormindo (até ${sleepSchedule.wakeTime})` : `☀️ Acordado(a)`}
          </span>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={sleepSchedule.enabled}
            onChange={(e) => handleUpdateSleepSchedule({ enabled: e.target.checked })}
            style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Respeitar sono de {selectedUser.name} nos alarmes e tarefas
          </span>
        </label>

        {sleepSchedule.enabled && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  😴 Hora que Dorme / Deita:
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={sleepSchedule.sleepTime}
                  onChange={(e) => handleUpdateSleepSchedule({ sleepTime: e.target.value })}
                  style={{ fontWeight: '700', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  ☀️ Hora que Acorda / Desperta:
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={sleepSchedule.wakeTime}
                  onChange={(e) => handleUpdateSleepSchedule({ wakeTime: e.target.value })}
                  style={{ fontWeight: '700', fontSize: '0.95rem' }}
                />
              </div>
            </div>

            {/* Presets Rápidos de Sono */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Atalhos Rápidos de Rotina:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleUpdateSleepSchedule({ sleepTime: '22:30', wakeTime: '06:00' })}
                  style={{
                    fontSize: '0.72rem',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-app)',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  🌅 22:30 ➔ 06:00 (Madrugador)
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateSleepSchedule({ sleepTime: '23:00', wakeTime: '07:00' })}
                  style={{
                    fontSize: '0.72rem',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-app)',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  ☕ 23:00 ➔ 07:00 (Padrão)
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateSleepSchedule({ sleepTime: '00:30', wakeTime: '08:30' })}
                  style={{
                    fontSize: '0.72rem',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-app)',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  🌙 00:30 ➔ 08:30 (Noturno)
                </button>
              </div>
            </div>

            {/* Explicação Inteligente do Sono */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                color: 'var(--text-secondary)',
                fontSize: '0.74rem',
                lineHeight: '1.4',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: '#6366f1' }}>
                <span>🧠</span>
                <span>Cálculo Inteligente Ativo:</span>
              </div>
              <div>
                • <strong>Sem alarmes de madrugada:</strong> Se o parceiro enviar um desabafo ou recado enquanto você estiver dormindo, o app <strong>não tocará</strong> para preservar seu descanso.
              </div>
              <div>
                • <strong>Despertar Suave (+20m):</strong> O alarme tocará automaticamente <strong>20 minutos após acordar</strong> (ex: se acorda às {sleepSchedule.wakeTime}, o aviso tocará às {(() => {
                  const [wh, wm] = (sleepSchedule.wakeTime || '07:00').split(':').map(Number);
                  const min = (wh * 60 + (wm || 0) + 20) % (24 * 60);
                  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
                })()}), dando tempo para despertar em paz.
              </div>
              <div>
                • <strong>Tarefas do Lar:</strong> Nenhuma tarefa terá horário sugerido durante suas horas de sono.
              </div>
            </div>
          </div>
        )}
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
