import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Clock,
  HeartHandshake,
  CalendarPlus,
  ArrowRightLeft,
  Sparkles,
  ShieldAlert,
  Flame,
  Zap,
  Sprout
} from 'lucide-react';
import { playChimeSound } from '../services/notificationService';
import { formatDateKey } from '../services/schedulerService';
import { ENCOURAGING_QUOTES, CATEGORIES, normalizeUserId } from '../constants/initialData';

export function TodayScreen({
  activeUser,
  users = [],
  schedule = [],
  onUpdateTaskStatus,
  onDelegateTask,
  onPostponeTask,
  onRequestSwap
}) {
  const [filterMode, setFilterMode] = useState('mine'); // 'mine' | 'partner' | 'all'
  const [celebrationMessage, setCelebrationMessage] = useState(null);

  const todayKey = formatDateKey(new Date());
  const otherUser = users.find((u) => normalizeUserId(u.id) !== activeUser.id) || users[1];

  // Tarefas agendadas para hoje
  const todayTasks = schedule.filter((item) => item.date === todayKey);

  // Filtragem
  const displayedTasks = todayTasks.filter((item) => {
    const assigned = normalizeUserId(item.assignedTo);
    if (filterMode === 'mine') return assigned === activeUser.id;
    if (filterMode === 'partner') return assigned === otherUser?.id;
    return true; // 'all'
  });

  const completedCount = displayedTasks.filter((t) => t.completed).length;
  const totalCount = displayedTasks.length;

  // Ação de Concluir Tarefa com celebração de confetes e som suave
  const handleCompleteTask = (task) => {
    if (task.completed) {
      onUpdateTaskStatus(task.instanceId, false);
      return;
    }

    // Dispara confetes
    try {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.75 },
        colors: ['#10b981', '#34d399', '#f43f5e', '#fbbf24', '#818cf8']
      });
    } catch (e) {
      // Ignora se não puder disparar
    }

    // Toca som harmonioso
    playChimeSound('success');

    // Mensagem amorosa aleatória
    const quote = ENCOURAGING_QUOTES[Math.floor(Math.random() * ENCOURAGING_QUOTES.length)];
    setCelebrationMessage(quote);
    setTimeout(() => setCelebrationMessage(null), 5000);

    onUpdateTaskStatus(task.instanceId, true);
  };

  const getCategoryInfo = (catId) => {
    return CATEGORIES.find((c) => c.id === catId) || { label: catId, icon: '📋' };
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
            <div>Faça o que estiver ao seu alcance hoje, sem pressa nem cobrança.</div>
          </div>
        </div>
      )}

      {/* Seletor de Visualização */}
      <div className="tabs-pill-container">
        <button
          className={`tab-pill ${filterMode === 'mine' ? 'active' : ''}`}
          onClick={() => setFilterMode('mine')}
        >
          <span>{activeUser.avatar}</span>
          <span>Minhas ({todayTasks.filter((t) => t.assignedTo === activeUser.id).length})</span>
        </button>

        {otherUser && (
          <button
            className={`tab-pill ${filterMode === 'partner' ? 'active' : ''}`}
            onClick={() => setFilterMode('partner')}
          >
            <span>{otherUser.avatar}</span>
            <span>{otherUser.name} ({todayTasks.filter((t) => t.assignedTo === otherUser.id).length})</span>
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

      {/* Lista de Tarefas de Hoje */}
      {displayedTasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>☕</div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>Tudo livre por aqui!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Nenhuma tarefa pendente para esta visualização hoje. Aproveitem para descansar e curtir os gatinhos! 🐱
          </p>
        </div>
      ) : (
        displayedTasks.map((task) => {
          const category = getCategoryInfo(task.category);
          const assignedPerson = users.find((u) => u.id === task.assignedTo) || activeUser;
          const isOverloadForMe = (task.overloadsUsers || []).includes(activeUser.id);
          const isOverloadForPartner = otherUser && (task.overloadsUsers || []).includes(otherUser.id);

          return (
            <div
              key={task.instanceId}
              className={`task-card ${task.completed ? 'completed' : ''}`}
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
                <h3 className="task-title">{task.title}</h3>
                {task.description && <p className="task-desc">{task.description}</p>}
              </div>

              {/* Informações de Tempo */}
              <div className="task-footer">
                <div className="task-time-info">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} />
                    <span>{task.durationMinutes} min</span>
                  </span>
                  <span>•</span>
                  <span>{task.points} pts de esforço</span>
                  <span>•</span>
                  <span>Horário sugerido: {task.preferredTime}</span>
                </div>
              </div>

              {/* BOTÃO GRANDE DE CONCLUIR */}
              <button
                id={`btn-complete-${task.instanceId}`}
                className={`btn btn-action-large ${task.completed ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => handleCompleteTask(task)}
              >
                <CheckCircle2 size={20} />
                <span>{task.completed ? 'Concluída (clique para reabrir)' : 'CONCLUIR TAREFA'}</span>
              </button>

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
        })
      )}
    </div>
  );
}
