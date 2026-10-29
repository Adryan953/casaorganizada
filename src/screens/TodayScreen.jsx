import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Clock,
  HeartHandshake,
  CalendarPlus,
  ArrowRightLeft,
  Sparkles,
  Flame,
  Zap,
  Sprout,
  Calendar,
  Lock,
  Unlock,
  Home,
  Briefcase,
  Moon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { playChimeSound } from '../services/notificationService';
import {
  formatDateKey,
  checkTaskAvailabilityNow,
  isUserBusyOrAway
} from '../services/schedulerService';
import { ENCOURAGING_QUOTES, CATEGORIES, normalizeUserId } from '../constants/initialData';

export function TodayScreen({
  activeUser,
  users = [],
  schedule = [],
  availability = {},
  onUpdateTaskStatus,
  onDelegateTask,
  onPostponeTask,
  onRequestSwap
}) {
  const [filterMode, setFilterMode] = useState('mine'); // 'mine' | 'partner' | 'all'
  const [celebrationMessage, setCelebrationMessage] = useState(null);
  const [showCompleted, setShowCompleted] = useState(true);

  const todayKey = formatDateKey(new Date());
  const myNormalizedId = normalizeUserId(activeUser?.id || activeUser?.username || 'adryan');
  const otherUser = users.find((u) => normalizeUserId(u.id || u.username) !== myNormalizedId) || users[1];
  const otherNormalizedId = otherUser ? normalizeUserId(otherUser.id || otherUser.username) : 'kah';

  // Estado para quando a pessoa chega mais cedo em casa e quer liberar as tarefas manualmente
  const [userOverriddenHome, setUserOverriddenHome] = useState(() => {
    try {
      const saved = localStorage.getItem(`home_override_${todayKey}_${myNormalizedId}`);
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });

  const [unlockedTaskIds, setUnlockedTaskIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`unlocked_tasks_${todayKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const handleToggleHomeOverride = () => {
    const next = !userOverriddenHome;
    setUserOverriddenHome(next);
    try {
      localStorage.setItem(`home_override_${todayKey}_${myNormalizedId}`, String(next));
    } catch (e) {}
    playChimeSound('chime');
  };

  const handleUnlockSingleTask = (instanceId) => {
    setUnlockedTaskIds((prev) => {
      const next = [...new Set([...prev, instanceId])];
      try {
        localStorage.setItem(`unlocked_tasks_${todayKey}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    playChimeSound('chime');
  };

  // Status atual de quem está com o app na mão
  const myBusyStatus = useMemo(() => {
    return isUserBusyOrAway(availability, myNormalizedId, 15);
  }, [availability, myNormalizedId]);

  // Tarefas agendadas para hoje organizadas por horário de início/sugerido (07:30, 08:00, 08:30...)
  const todayTasks = useMemo(() => {
    return (schedule || [])
      .filter((item) => item.date === todayKey)
      .sort((a, b) => {
        const timeA = a.preferredTime || '09:00';
        const timeB = b.preferredTime || '09:00';
        const timeCmp = timeA.localeCompare(timeB);
        if (timeCmp !== 0) return timeCmp;
        return String(a.taskId || a.instanceId || '').localeCompare(String(b.taskId || b.instanceId || ''));
      });
  }, [schedule, todayKey]);

  const myTodayTasks = todayTasks.filter((t) => normalizeUserId(t.assignedTo) === myNormalizedId);
  const partnerTodayTasks = todayTasks.filter((t) => normalizeUserId(t.assignedTo) === otherNormalizedId);

  // Filtragem estritamente estável
  const displayedTasks = filterMode === 'mine'
    ? myTodayTasks
    : filterMode === 'partner'
      ? partnerTodayTasks
      : todayTasks;

  // Classifica as tarefas de hoje entre:
  // 1. Disponíveis agora (pessoa em casa ou tarefa liberada)
  // 2. Bloqueadas até chegar em casa (pessoa no trabalho, sono ou compromisso)
  // 3. Concluídas
  const { availableTasks, lockedTasks, completedTasks } = useMemo(() => {
    const avail = [];
    const locked = [];
    const completed = [];

    displayedTasks.forEach((task) => {
      if (task.completed) {
        completed.push(task);
        return;
      }

      const assignedNorm = normalizeUserId(task.assignedTo);
      const isMe = assignedNorm === myNormalizedId;
      const statusCheck = checkTaskAvailabilityNow({
        task,
        availability,
        unlockedEarlyTaskIds: unlockedTaskIds,
        userOverriddenHome: isMe ? userOverriddenHome : false
      });

      if (statusCheck.isAvailable) {
        avail.push({ ...task, _availInfo: statusCheck });
      } else {
        locked.push({ ...task, _availInfo: statusCheck });
      }
    });

    return { availableTasks: avail, lockedTasks: locked, completedTasks: completed };
  }, [displayedTasks, availability, unlockedTaskIds, userOverriddenHome, myNormalizedId]);

  const completedCount = completedTasks.length;
  const totalCount = displayedTasks.length;

  // Ação de Concluir Tarefa com celebração de confetes e som suave
  const handleCompleteTask = (task) => {
    if (task.completed) {
      onUpdateTaskStatus(task.instanceId, false);
      return;
    }

    try {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.75 },
        colors: ['#10b981', '#34d399', '#f43f5e', '#fbbf24', '#818cf8']
      });
    } catch (e) {}

    playChimeSound('success');

    const quote = ENCOURAGING_QUOTES[Math.floor(Math.random() * ENCOURAGING_QUOTES.length)];
    setCelebrationMessage(quote);
    setTimeout(() => setCelebrationMessage(null), 5000);

    onUpdateTaskStatus(task.instanceId, true);
  };

  const getCategoryInfo = (catId) => {
    return CATEGORIES.find((c) => c.id === catId) || { label: catId, icon: '📋' };
  };

  // Renderizador unificado de Card de Tarefa
  const renderTaskCard = (task, isLocked = false) => {
    const category = getCategoryInfo(task.category);
    const assignedPerson = users.find((u) => u.id === task.assignedTo) || activeUser;
    const isOverloadForMe = (task.overloadsUsers || []).includes(activeUser.id);
    const isOverloadForPartner = otherUser && (task.overloadsUsers || []).includes(otherUser.id);
    const availInfo = task._availInfo;

    return (
      <div
        key={task.instanceId}
        className={`task-card ${task.completed ? 'completed' : ''} ${isLocked ? 'task-card-locked' : ''}`}
        style={isLocked ? {
          border: '1.5px dashed rgba(245, 158, 11, 0.45)',
          background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(245, 158, 11, 0.03) 100%)'
        } : undefined}
      >
        {/* Topo do Card */}
        <div className="task-header">
          <div className="task-meta-left">
            <span className="task-category-badge">
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </span>

            <span className={`task-effort-badge effort-${task.effortLevel}`}>
              {task.effortLevel === 1 && <Sprout size={12} />}
              {task.effortLevel === 2 && <Zap size={12} />}
              {task.effortLevel === 3 && <Flame size={12} />}
              <span>{task.effortLevel === 1 ? 'Leve' : task.effortLevel === 2 ? 'Médio' : 'Pesado'}</span>
            </span>

            {/* Badge de Horário em Casa / Bloqueio */}
            {isLocked ? (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Lock size={11} />
                <span>{availInfo?.badgeText || 'Bloqueada até chegar em casa'}</span>
              </span>
            ) : (
              task.isAdjustedForHome && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={task.homeReason || 'Ajustado para o horário em casa'}
                >
                  <Home size={11} />
                  <span>Em casa</span>
                </span>
              )
            )}

            {/* Badge de Tarefa de Data Única */}
            {(task.isOnce || task.frequency === 'once' || task.frequency === 'specific_date') && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <Calendar size={11} />
                <span>Data Única</span>
              </span>
            )}

            {/* Tag de Sobrecarga Protegida */}
            {task.assignedTo !== activeUser.id && isOverloadForMe && (
              <span className="overload-tag">
                <Sparkles size={11} />
                <span>{assignedPerson.name} te poupou hoje ❤️</span>
              </span>
            )}

            {task.assignedTo === activeUser.id && isOverloadForPartner && (
              <span className="overload-tag" style={{ backgroundColor: 'var(--accent-indigo-light)', color: 'var(--accent-indigo)' }}>
                <HeartHandshake size={11} />
                <span>Cuidando com carinho por {otherUser.name}</span>
              </span>
            )}
          </div>

          <div className="task-assignee">
            <span className="assignee-avatar">{assignedPerson.avatar}</span>
            <span>{assignedPerson.name}</span>
          </div>
        </div>

        {/* Título e Descrição */}
        <div>
          <h3 className="task-title" style={task.completed ? { textDecoration: 'line-through', opacity: 0.7 } : {}}>
            {task.title}
          </h3>
          {task.description && <p className="task-desc">{task.description}</p>}
        </div>

        {/* Informações de Tempo e Horário Inteligente em Casa */}
        <div className="task-footer">
          <div className="task-time-info">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} />
              <span>{task.durationMinutes} min</span>
            </span>
            <span>•</span>
            <span>{task.points} pts de esforço</span>
            <span>•</span>
            <span>
              {task.isAdjustedForHome ? (
                <strong style={{ color: 'var(--accent-primary)' }}>
                  Disponível às {task.preferredTime} (em casa)
                </strong>
              ) : (
                `Horário: ${task.preferredTime}`
              )}
            </span>
          </div>
        </div>

        {/* AVISO E BOTÕES QUANDO A TAREFA ESTÁ BLOQUEADA (FORA DE CASA) */}
        {isLocked && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              borderRadius: 'var(--radius-md)',
              margin: '10px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#b45309', fontWeight: '600' }}>
              <Lock size={14} />
              <span>{availInfo?.reasonTitle || 'Aguardando chegada em casa'}</span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              Esta tarefa ficará liberada automaticamente às{' '}
              <strong>{task.preferredTime || availInfo?.availableAtTime}</strong> quando {assignedPerson.name} estiver em casa.
            </div>

            {/* Botão de desbloqueio antecipado */}
            <button
              className="btn btn-secondary"
              style={{
                marginTop: '4px',
                padding: '6px 10px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: 'var(--text-primary)'
              }}
              onClick={() => handleUnlockSingleTask(task.instanceId)}
            >
              <Unlock size={14} color="#d97706" />
              <span>Já estou em casa (Liberar tarefa agora)</span>
            </button>
          </div>
        )}

        {/* BOTÃO GRANDE DE CONCLUIR (Ativo quando disponível ou concluída) */}
        {!isLocked && (
          <button
            id={`btn-complete-${task.instanceId}`}
            className={`btn btn-action-large ${task.completed ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => handleCompleteTask(task)}
          >
            <CheckCircle2 size={20} />
            <span>{task.completed ? 'Concluída (clique para reabrir)' : 'CONCLUIR TAREFA'}</span>
          </button>
        )}

        {/* AÇÕES DE APOIO MÚTUO (Passar, Adiar, Trocar) - Sem Culpa */}
        {!task.completed && (
          <div className="task-actions-row">
            {otherUser && (
              <button
                className="btn-task-action"
                onClick={() => onDelegateTask(task.instanceId, otherUser.id)}
                title={`Passar com carinho para ${otherUser.name}`}
              >
                <HeartHandshake size={14} />
                <span>Passar p/ {otherUser.name}</span>
              </button>
            )}

            <button
              className="btn-task-action"
              onClick={() => onPostponeTask(task.instanceId)}
              title="Adiar para amanhã sem culpa"
            >
              <CalendarPlus size={14} />
              <span>Adiar p/ amanhã</span>
            </button>

            <button
              className="btn-task-action"
              style={{ gridColumn: otherUser ? 'span 2' : 'span 1' }}
              onClick={() => onRequestSwap(task)}
              title="Pedir para trocar por outra tarefa"
            >
              <ArrowRightLeft size={14} />
              <span>Propor troca amigável</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Banner de Celebração ou Mensagem do Dia */}
      {celebrationMessage ? (
        <div className="harmony-banner animate-pop" style={{ border: '2px solid var(--accent-primary)' }}>
          <div className="harmony-icon">🎉</div>
          <div className="harmony-text" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
            {celebrationMessage}
          </div>
        </div>
      ) : (
        <div className="harmony-banner">
          <div className="harmony-icon">🌿</div>
          <div className="harmony-text">
            <strong>Cuidando do lar com paz e harmonia.</strong>
            <div>As tarefas só ficam disponíveis quando você está em casa, sem pressão.</div>
          </div>
        </div>
      )}

      {/* CARD DE STATUS DE CASA E TRABALHO EM TEMPO REAL */}
      {myBusyStatus.isBusy && !userOverriddenHome && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.08) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            marginBottom: '14px',
            padding: '12px 14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>{myBusyStatus.icon || '💼'}</span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {myBusyStatus.title} (até às {myBusyStatus.end || myBusyStatus.freeAt})
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Suas tarefas da casa liberam automaticamente às {myBusyStatus.alarmTriggerTimeStr} ao chegar em casa.
                </div>
              </div>
            </div>
            <button
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              onClick={handleToggleHomeOverride}
            >
              <Home size={14} color="var(--accent-primary)" />
              <span>Já cheguei em casa</span>
            </button>
          </div>
        </div>
      )}

      {/* BANNER CASO O MODO EM CASA TENHA SIDO ATIVADO ANTECIPADAMENTE */}
      {userOverriddenHome && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            marginBottom: '14px',
            padding: '12px 14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>🏠</span>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Modo Em Casa ativado antecipadamente
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Todas as suas tarefas de hoje foram liberadas para fazer agora!
                </div>
              </div>
            </div>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              onClick={handleToggleHomeOverride}
            >
              Restaurar automático
            </button>
          </div>
        </div>
      )}

      {/* Seletor de Visualização (Minhas / Parceiro / Todas) */}
      <div className="tabs-pill-container">
        <button
          className={`tab-pill ${filterMode === 'mine' ? 'active' : ''}`}
          onClick={() => setFilterMode('mine')}
        >
          <span>{activeUser.avatar}</span>
          <span>Minhas ({myTodayTasks.length})</span>
        </button>

        {otherUser && (
          <button
            className={`tab-pill ${filterMode === 'partner' ? 'active' : ''}`}
            onClick={() => setFilterMode('partner')}
          >
            <span>{otherUser.avatar}</span>
            <span>{otherUser.name} ({partnerTodayTasks.length})</span>
          </button>
        )}

        <button
          className={`tab-pill ${filterMode === 'all' ? 'active' : ''}`}
          onClick={() => setFilterMode('all')}
        >
          <span>🏠</span>
          <span>Todas ({todayTasks.length})</span>
        </button>
      </div>

      {/* Progresso do Dia */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          padding: '0 4px'
        }}
      >
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
          Hoje: {completedCount} de {totalCount} concluídas
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {totalCount > 0 && Math.round((completedCount / totalCount) * 100)}% concluído
        </div>
      </div>

      {/* NENHUMA TAREFA */}
      {displayedTasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>☕</div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>Tudo livre por aqui!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Nenhuma tarefa pendente para esta visualização hoje. Aproveitem para descansar e curtir os gatinhos! 🐱
          </p>
        </div>
      ) : (
        <>
          {/* SEÇÃO 1: TAREFAS DISPONÍVEIS AGORA (EM CASA) */}
          {availableTasks.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px',
                  padding: '0 4px'
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Disponíveis Agora ({availableTasks.length})
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  • Em casa e prontas para realizar
                </span>
              </div>

              {availableTasks.map((task) => renderTaskCard(task, false))}
            </div>
          )}

          {/* SEÇÃO 2: TAREFAS BLOQUEADAS AGUARDANDO CHEGADA EM CASA */}
          {lockedTasks.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px',
                  padding: '0 4px'
                }}
              >
                <Lock size={14} color="#d97706" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#d97706' }}>
                  Liberam ao Chegar em Casa ({lockedTasks.length})
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  • Indisponíveis durante trabalho ou compromisso
                </span>
              </div>

              {lockedTasks.map((task) => renderTaskCard(task, true))}
            </div>
          )}

          {/* SEÇÃO 3: TAREFAS CONCLUÍDAS HOJE */}
          {completedTasks.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                style={{
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '6px 4px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="var(--accent-primary)" />
                  <span>Concluídas Hoje ({completedTasks.length})</span>
                </span>
                {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showCompleted && (
                <div style={{ marginTop: '8px' }}>
                  {completedTasks.map((task) => renderTaskCard(task, false))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
