import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  Clock,
  CheckCircle2,
  ChevronRight,
  Flame,
  Zap,
  Sprout,
  RefreshCw
} from 'lucide-react';
import { DAYS_OF_WEEK } from '../constants/initialData';
import { formatDateKey, getStartOfWeek } from '../services/schedulerService';

export function WeekScreen({
  users = [],
  schedule = [],
  onRegenerateWeek,
  onUpdateTaskStatus
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay());
  const [isGenerating, setIsGenerating] = useState(false);

  const startOfWeek = getStartOfWeek(new Date());

  // Agrupa tarefas por dia da semana
  const dayItems = (DAYS_OF_WEEK || []).map((dayDef) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + dayDef.index);
    const dateKey = formatDateKey(d);
    const tasksForDay = schedule.filter((item) => item.date === dateKey);
    const completedForDay = tasksForDay.filter((t) => t.completed).length;

    const totalMinutes = tasksForDay.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
    const totalPoints = tasksForDay.reduce((acc, t) => acc + (t.points || 0), 0);

    return {
      ...dayDef,
      dateKey,
      dateFormatted: `${d.getDate()}/${d.getMonth() + 1}`,
      tasks: tasksForDay,
      completedCount: completedForDay,
      totalMinutes,
      totalPoints
    };
  });

  const currentSelectedDay = dayItems.find((d) => d.index === selectedDayIndex) || dayItems[0];

  const handleRegenerateClick = () => {
    if (confirm('Deseja regerar a divisão semanal? O algoritmo recalculará as tarefas de acordo com a disponibilidade e alternará as tarefas pesadas.')) {
      setIsGenerating(true);
      setTimeout(() => {
        onRegenerateWeek();
        setIsGenerating(false);
      }, 400);
    }
  };

  return (
    <div>
      {/* Botão de Destaque: Regerar Agenda Semanal Inteligente */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--accent-primary-light) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={18} color="var(--accent-primary)" />
              <span>Divisão Automática Semanal</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Alterna tarefas pesadas, compensa esforço e alivia sobrecargas.
            </p>
          </div>
          <button
            id="btn-regenerate-week"
            className="btn btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={handleRegenerateClick}
            disabled={isGenerating}
          >
            <RefreshCw size={15} className={isGenerating ? 'animate-spin' : ''} />
            <span>{isGenerating ? 'Gerando...' : 'Reorganizar'}</span>
          </button>
        </div>
      </div>

      {/* Carrossel / Seletor dos 7 Dias da Semana */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '6px',
          marginBottom: '16px'
        }}
      >
        {dayItems.map((day) => {
          const isSelected = day.index === selectedDayIndex;
          const isToday = day.index === new Date().getDay();

          return (
            <button
              key={day.index}
              onClick={() => setSelectedDayIndex(day.index)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 2px',
                borderRadius: 'var(--radius-md)',
                border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                backgroundColor: isSelected ? 'var(--accent-primary-light)' : 'var(--bg-card)',
                color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '0.7rem', fontWeight: '600', color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                {day.short}
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', margin: '2px 0' }}>
                {day.dateFormatted}
              </span>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: day.tasks.length > 0 ? (day.completedCount === day.tasks.length ? 'var(--accent-primary)' : 'var(--accent-warm)') : 'transparent'
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Título do Dia Selecionado */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          padding: '0 4px'
        }}
      >
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
          {currentSelectedDay.label} ({currentSelectedDay.dateFormatted})
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {currentSelectedDay.totalMinutes} min totais • {currentSelectedDay.totalPoints} pts
        </span>
      </div>

      {/* Lista de Tarefas do Dia Selecionado */}
      {currentSelectedDay.tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 16px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🍃</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Nenhuma tarefa cadastrada para {currentSelectedDay.label}. Dia de descanso!
          </p>
        </div>
      ) : (
        currentSelectedDay.tasks.map((task) => {
          const assignee = users.find((u) => u.id === task.assignedTo) || { name: 'Alguém', avatar: '👤' };

          return (
            <div
              key={task.instanceId}
              className={`task-card ${task.completed ? 'completed' : ''}`}
              style={{ padding: '14px' }}
            >
              <div className="task-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`task-effort-badge effort-${task.effortLevel}`}>
                    {task.effortLevel === 1 && <Sprout size={12} />}
                    {task.effortLevel === 2 && <Zap size={12} />}
                    {task.effortLevel === 3 && <Flame size={12} />}
                    <span>{task.effortLevel === 1 ? 'Leve' : task.effortLevel === 2 ? 'Médio' : 'Pesado'}</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    <span>{task.durationMinutes}m ({task.preferredTime})</span>
                  </span>
                </div>

                <div className="task-assignee">
                  <span className="assignee-avatar">{assignee.avatar}</span>
                  <span style={{ fontSize: '0.82rem' }}>{assignee.name}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <h4 className="task-title" style={{ fontSize: '0.95rem' }}>{task.title}</h4>
                <button
                  className="btn-icon-subtle"
                  onClick={() => onUpdateTaskStatus(task.instanceId, !task.completed)}
                  title={task.completed ? 'Marcar como não feita' : 'Marcar como concluída'}
                >
                  <CheckCircle2
                    size={20}
                    color={task.completed ? 'var(--accent-primary)' : 'var(--text-muted)'}
                  />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
