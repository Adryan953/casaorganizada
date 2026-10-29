import React, { useState, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  Flame,
  Zap,
  Sprout,
  Heart,
  X,
  Check,
  AlertCircle,
  Calendar,
  Repeat,
  Home,
  CalendarDays,
  ListFilter,
  User
} from 'lucide-react';
import { CATEGORIES, DAYS_OF_WEEK, normalizeUserId } from '../constants/initialData';

export function getFrequencyLabel(task) {
  if (!task) return '';
  if (task.frequency === 'daily') return 'Todo dia';
  if (task.frequency === 'every_2_days') return 'A cada 2 dias';
  if (task.frequency === '2x_week') return '2x por semana';
  if (task.frequency === '1x_week') return '1x por semana';
  if (task.frequency === 'every_15_days') return 'A cada 15 dias';
  if (task.frequency === 'once' || task.frequency === 'specific_date' || task.frequency === 'custom_date') {
    if (!task.specificDate) return '📅 Uma única vez';
    const [year, month, day] = task.specificDate.split('-');
    return `📅 Uma vez em ${day}/${month}/${year}`;
  }
  if (task.frequency === 'custom_interval') {
    return `A cada ${task.customIntervalDays || 3} dias`;
  }
  if (task.frequency === 'monthly_day') {
    return `Todo dia ${task.customMonthDay || 5} do mês`;
  }
  return 'Personalizada';
}

export function TasksScreen({
  tasks = [],
  users = [],
  schedule = [],
  availability = {},
  onSaveTask,
  onDeleteTask
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'category'
  const [selectedDayTab, setSelectedDayTab] = useState(() => new Date().getDay()); // 0..6 ou 'all'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Helper para obter a data de hoje no formato YYYY-MM-DD
  const getTodayDateStr = () => new Date().toISOString().split('T')[0];

  // Estado do formulário
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    category: 'limpeza',
    frequency: 'daily',
    specificDate: getTodayDateStr(),
    customIntervalDays: 3,
    customMonthDay: 5,
    preferredTime: '09:00',
    durationMinutes: 20,
    effortLevel: 2,
    overloadsUsers: [],
    description: ''
  });

  const openNewTaskModal = () => {
    setEditingTask(null);
    setFormData({
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: '',
      category: 'limpeza',
      frequency: 'daily',
      specificDate: getTodayDateStr(),
      customIntervalDays: 3,
      customMonthDay: 5,
      preferredTime: '09:00',
      durationMinutes: 20,
      effortLevel: 2,
      overloadsUsers: [],
      description: '',
      createdAt: new Date().toISOString()
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setFormData({
      id: task.id,
      title: task.title,
      category: task.category || 'limpeza',
      frequency: task.frequency || 'daily',
      specificDate: task.specificDate || getTodayDateStr(),
      customIntervalDays: task.customIntervalDays || 3,
      customMonthDay: task.customMonthDay || 5,
      preferredTime: task.preferredTime || '09:00',
      durationMinutes: task.durationMinutes || 20,
      effortLevel: task.effortLevel || 2,
      overloadsUsers: task.overloadsUsers || [],
      description: task.description || ''
    });
    setIsModalOpen(true);
  };

  const handleToggleOverload = (userId) => {
    setFormData((prev) => {
      const exists = prev.overloadsUsers.includes(userId);
      return {
        ...prev,
        overloadsUsers: exists
          ? prev.overloadsUsers.filter((id) => id !== userId)
          : [...prev.overloadsUsers, userId]
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Por favor, informe o nome da tarefa.');
      return;
    }

    const isOnce = formData.frequency === 'once' || formData.frequency === 'specific_date' || formData.frequency === 'custom_date';

    onSaveTask({
      ...formData,
      specificDate: isOnce
        ? (formData.specificDate || getTodayDateStr())
        : undefined,
      customIntervalDays: formData.frequency === 'custom_interval'
        ? Math.max(1, Number(formData.customIntervalDays) || 3)
        : undefined,
      customMonthDay: formData.frequency === 'monthly_day'
        ? Math.min(31, Math.max(1, Number(formData.customMonthDay) || 5))
        : undefined,
      durationMinutes: Number(formData.durationMinutes) || 15,
      effortLevel: Number(formData.effortLevel) || 1
    });

    setIsModalOpen(false);
  };

  // Desduplicar e ordenar tasks de forma estável com useMemo para evitar re-renders desnecessários
  const uniqueTasks = useMemo(() => {
    const map = new Map();
    (tasks || []).forEach((t) => {
      if (t && t.id) map.set(t.id, t);
    });
    return Array.from(map.values()).sort((a, b) => {
      // Ordena por data de criação (mais antigas primeiro) e por id como desempate
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return uniqueTasks.filter((t) => {
      if (selectedCategoryFilter === 'all') return true;
      return t.category === selectedCategoryFilter;
    });
  }, [uniqueTasks, selectedCategoryFilter]);
  // Mapeamento e agrupamento de tarefas por dia da semana
  const tasksByDay = useMemo(() => {
    return (DAYS_OF_WEEK || []).map((dayDef) => {
      const dayIdx = dayDef.index;

      // 1. Instâncias da agenda semanal calculadas com horários em casa e divisão justa
      const scheduledForDay = (schedule || [])
        .filter((item) => item.dayOfWeek === dayIdx)
        .sort((a, b) => {
          const timeA = a.preferredTime || '09:00';
          const timeB = b.preferredTime || '09:00';
          const timeCmp = timeA.localeCompare(timeB);
          if (timeCmp !== 0) return timeCmp;
          return String(a.taskId || a.instanceId || '').localeCompare(String(b.taskId || b.instanceId || ''));
        });

      if (scheduledForDay.length > 0) {
        const totalMinutes = scheduledForDay.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
        const totalPoints = scheduledForDay.reduce((acc, t) => acc + (t.points || 0), 0);
        return {
          ...dayDef,
          tasks: scheduledForDay,
          totalMinutes,
          totalPoints
        };
      }

      // Fallback a partir do cadastro direto de tarefas
      const matchingTasks = uniqueTasks.filter((t) => {
        if (t.frequency === 'daily') return true;
        if (t.frequency === 'every_2_days') return dayIdx % 2 === 0;
        if (t.frequency === '2x_week') return (t.preferredDays || [2, 5]).includes(dayIdx);
        if (t.frequency === '1x_week') return (t.preferredDays || [6]).includes(dayIdx);
        if (t.frequency === 'every_15_days') return dayIdx === 6;
        return false;
      });

      const totalMinutes = matchingTasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
      const totalPoints = matchingTasks.reduce((acc, t) => acc + ((t.durationMinutes || 0) * (t.effortLevel || 1)), 0);

      return {
        ...dayDef,
        tasks: matchingTasks,
        totalMinutes,
        totalPoints
      };
    });
  }, [schedule, uniqueTasks]);

  // Dias a serem exibidos de acordo com a aba selecionada (ou todos)
  const displayedDays = useMemo(() => {
    if (selectedDayTab === 'all') return tasksByDay;
    return tasksByDay.filter((d) => d.index === Number(selectedDayTab));
  }, [tasksByDay, selectedDayTab]);

  return (
    <div>
      {/* Topo com botão Adicionar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Tarefas da Casa</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {uniqueTasks.length} tarefas cadastradas na rotina
          </p>
        </div>
        <button
          id="btn-add-task"
          className="btn btn-primary"
          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          onClick={openNewTaskModal}
        >
          <Plus size={16} />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* SELETOR DE MODO DE VISUALIZAÇÃO: POR DIA DA SEMANA OU POR CATEGORIA */}
      <div className="tabs-pill-container" style={{ marginBottom: '14px' }}>
        <button
          className={`tab-pill ${viewMode === 'day' ? 'active' : ''}`}
          onClick={() => setViewMode('day')}
        >
          <CalendarDays size={15} />
          <span>Por Dia da Semana</span>
        </button>

        <button
          className={`tab-pill ${viewMode === 'category' ? 'active' : ''}`}
          onClick={() => setViewMode('category')}
        >
          <ListFilter size={15} />
          <span>Por Categoria</span>
        </button>
      </div>

      {/* VISUALIZAÇÃO 1: ORGANIZADA POR DIA DA SEMANA */}
      {viewMode === 'day' && (
        <div>
          {/* Seletor de Dias da Semana (Dom, Seg, Ter... ou Todos) */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '10px',
              marginBottom: '14px'
            }}
          >
            <button
              className={`tab-pill ${selectedDayTab === 'all' ? 'active' : ''}`}
              style={{ whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setSelectedDayTab('all')}
            >
              Todos os Dias
            </button>
            {DAYS_OF_WEEK.map((d) => {
              const isToday = d.index === new Date().getDay();
              const isSelected = selectedDayTab === d.index;
              const dayTasksCount = tasksByDay.find((td) => td.index === d.index)?.tasks.length || 0;

              return (
                <button
                  key={d.index}
                  className={`tab-pill ${isSelected ? 'active' : ''}`}
                  style={{ whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => setSelectedDayTab(d.index)}
                >
                  <span>{d.short}</span>
                  <span style={{ opacity: 0.75, fontSize: '0.72rem' }}>({dayTasksCount})</span>
                  {isToday && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', marginLeft: '2px' }} />}
                </button>
              );
            })}
          </div>

          {/* Cards agrupados por dia */}
          {displayedDays.map((dayGroup) => {
            const isToday = dayGroup.index === new Date().getDay();

            return (
              <div key={dayGroup.index} style={{ marginBottom: '22px' }}>
                {/* Cabeçalho do Dia */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    padding: '6px 4px',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: '700', color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      {dayGroup.label}
                    </span>
                    {isToday && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          backgroundColor: 'var(--accent-primary-light)',
                          color: 'var(--accent-primary)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)'
                        }}
                      >
                        Hoje
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {dayGroup.tasks.length} {dayGroup.tasks.length === 1 ? 'tarefa' : 'tarefas'} • {dayGroup.totalMinutes} min totais
                  </div>
                </div>

                {/* Lista de tarefas do dia */}
                {dayGroup.tasks.length === 0 ? (
                  <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Nenhuma tarefa agendada para {dayGroup.label.toLowerCase()}. Dia de descanso! ☕
                  </div>
                ) : (
                  dayGroup.tasks.map((taskItem) => {
                    // Localiza a tarefa original para editar ou excluir
                    const originalTask = uniqueTasks.find((t) => t.id === (taskItem.taskId || taskItem.id)) || taskItem;
                    const cat = CATEGORIES.find((c) => c.id === taskItem.category) || { label: 'Geral', icon: '🧹' };
                    const assignedPerson = users.find((u) => u.id === taskItem.assignedTo);

                    return (
                      <div key={taskItem.instanceId || `${taskItem.id}_${dayGroup.index}`} className="card" style={{ marginBottom: '10px', padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                              <span className="task-category-badge">
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                              </span>

                              <span className={`task-effort-badge effort-${taskItem.effortLevel}`}>
                                {taskItem.effortLevel === 1 && <Sprout size={12} />}
                                {taskItem.effortLevel === 2 && <Zap size={12} />}
                                {taskItem.effortLevel === 3 && <Flame size={12} />}
                                <span>{taskItem.effortLevel === 1 ? 'Leve' : taskItem.effortLevel === 2 ? 'Médio' : 'Pesado'}</span>
                              </span>

                              {/* Indicação de Horário em Casa */}
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
                              >
                                <Home size={11} />
                                <span>Disponível às {taskItem.preferredTime} (em casa)</span>
                              </span>
                            </div>

                            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                              {taskItem.title}
                            </h3>

                            {taskItem.description && (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {taskItem.description}
                              </p>
                            )}

                            {/* Responsável pela tarefa neste dia */}
                            {assignedPerson && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Responsável:</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: '600' }}>
                                  <span>{assignedPerson.avatar}</span>
                                  <span>{assignedPerson.name}</span>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Ações de Edição e Exclusão */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              className="btn-icon-subtle"
                              onClick={() => openEditModal(originalTask)}
                              title="Editar tarefa"
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              className="btn-icon-subtle"
                              style={{ color: 'var(--text-muted)' }}
                              onClick={() => {
                                if (confirm(`Deseja remover "${originalTask.title}" da lista de tarefas?`)) {
                                  onDeleteTask(originalTask.id);
                                }
                              }}
                              title="Excluir tarefa"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </div>

                        {/* Rodapé com detalhes de duração e frequência */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderTop: '1px solid var(--border-subtle)',
                            marginTop: '10px',
                            paddingTop: '8px',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            flexWrap: 'wrap',
                            gap: '4px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <Clock size={13} />
                            <span>{taskItem.durationMinutes} min</span>
                            <span>•</span>
                            <span
                              style={{
                                backgroundColor: 'var(--accent-primary-light)',
                                color: 'var(--accent-primary)',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: '700',
                                fontSize: '0.72rem'
                              }}
                            >
                              {getFrequencyLabel(originalTask)}
                            </span>
                          </div>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {(taskItem.durationMinutes || 0) * (taskItem.effortLevel || 1)} pts
                          </strong>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VISUALIZAÇÃO 2: POR CATEGORIA (LISTA TRADICIONAL) */}
      {viewMode === 'category' && (
        <div>
          {/* Filtro por Categoria */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '10px',
              marginBottom: '12px'
            }}
          >
            <button
              className={`tab-pill ${selectedCategoryFilter === 'all' ? 'active' : ''}`}
              style={{ whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setSelectedCategoryFilter('all')}
            >
              Todas ({uniqueTasks.length})
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`tab-pill ${selectedCategoryFilter === cat.id ? 'active' : ''}`}
                style={{ whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => setSelectedCategoryFilter(cat.id)}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Lista de Tarefas por Categoria */}
          {filteredTasks.map((task) => {
            const cat = CATEGORIES.find((c) => c.id === task.category) || { label: 'Geral', icon: '🧹' };
            const points = (task.durationMinutes || 0) * (task.effortLevel || 1);

            return (
              <div key={task.id} className="card" style={{ marginBottom: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span className="task-category-badge">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>

                      <span className={`task-effort-badge effort-${task.effortLevel}`}>
                        {task.effortLevel === 1 && <Sprout size={12} />}
                        {task.effortLevel === 2 && <Zap size={12} />}
                        {task.effortLevel === 3 && <Flame size={12} />}
                        <span>{task.effortLevel === 1 ? 'Leve (1x)' : task.effortLevel === 2 ? 'Médio (2x)' : 'Pesado (3x)'}</span>
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
                      {task.title}
                    </h3>

                    {task.description && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {task.description}
                      </p>
                    )}

                    {/* Sobrecargas */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {users.map((u) => {
                        const isOverloaded = (task.overloadsUsers || []).includes(u.id);
                        if (!isOverloaded) return null;
                        return (
                          <span
                            key={u.id}
                            className="overload-tag"
                            style={{ fontSize: '0.7rem' }}
                          >
                            <Heart size={11} />
                            <span>Sobrecarrega {u.name} (prioridade de alívio)</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ações de Edição e Exclusão */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      className="btn-icon-subtle"
                      onClick={() => openEditModal(task)}
                      title="Editar tarefa"
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="btn-icon-subtle"
                      style={{ color: 'var(--text-muted)' }}
                      onClick={() => {
                        if (confirm(`Deseja remover "${task.title}" da lista de tarefas?`)) {
                          onDeleteTask(task.id);
                        }
                      }}
                      title="Excluir tarefa"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                {/* Rodapé do Card com tempo, frequência e esforço */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-subtle)',
                    marginTop: '10px',
                    paddingTop: '8px',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    flexWrap: 'wrap',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <Clock size={13} />
                    <span>{task.durationMinutes} min</span>
                    <span>•</span>
                    <span>{task.preferredTime}</span>
                    <span>•</span>
                    <span
                      style={{
                        backgroundColor: 'var(--accent-primary-light)',
                        color: 'var(--accent-primary)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: '700',
                        fontSize: '0.72rem'
                      }}
                    >
                      {getFrequencyLabel(task)}
                    </span>
                  </div>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {points} pts de esforço
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Bottom Sheet para Adicionar ou Editar Tarefa */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>
                {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h3>
              <button className="btn-icon-subtle" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome da Tarefa</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Ração dos gatos, Limpar banheiro, Trocar areia..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Frequência</label>
                  <select
                    className="form-select"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  >
                    <option value="daily">Todo dia</option>
                    <option value="every_2_days">A cada 2 dias</option>
                    <option value="2x_week">2x por semana</option>
                    <option value="1x_week">1x por semana</option>
                    <option value="every_15_days">A cada 15 dias</option>
                    <option value="once">📅 Uma única vez (Escolher data no calendário)</option>
                    <option value="custom_interval">⚙️ Personalizado: De X em X dias (Recorrente)</option>
                    <option value="monthly_day">🗓️ Personalizado: Dia específico do mês (Recorrente)</option>
                  </select>
                </div>
              </div>

              {/* OPÇÃO PERSONALIZADA: Data específica no Calendário (Uma única vez - não recorrente) */}
              {(formData.frequency === 'once' || formData.frequency === 'specific_date' || formData.frequency === 'custom_date') && (
                <div
                  style={{
                    marginBottom: '14px',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-app)',
                    border: '2px solid #6366f1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '0.88rem', color: '#6366f1' }}>
                      <Calendar size={18} />
                      <span>Escolha o Dia no Calendário:</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        color: '#6366f1'
                      }}
                    >
                      ✨ Apenas 1 Vez
                    </span>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Data Selecionada:
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.specificDate || getTodayDateStr()}
                      onChange={(e) => setFormData({ ...formData, specificDate: e.target.value })}
                      required
                      style={{
                        fontWeight: '800',
                        fontSize: '1rem',
                        padding: '10px',
                        color: 'var(--text-primary)',
                        borderColor: '#6366f1'
                      }}
                    />
                  </div>

                  {/* Atalhos Rápidos de Datas */}
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
                      Atalhos Rápidos de Datas:
                    </span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { label: '📌 Hoje', days: 0 },
                        { label: '🌅 Amanhã', days: 1 },
                        { label: '⏩ Depois de amanhã', days: 2 },
                        { label: '🗓️ Sábado', targetDay: 6 },
                        { label: '🗓️ Domingo', targetDay: 0 }
                      ].map((item, idx) => {
                        let dateStr = '';
                        if (item.days !== undefined) {
                          const d = new Date();
                          d.setDate(d.getDate() + item.days);
                          const y = d.getFullYear();
                          const m = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          dateStr = `${y}-${m}-${day}`;
                        } else if (item.targetDay !== undefined) {
                          const d = new Date();
                          const cur = d.getDay();
                          let diff = item.targetDay - cur;
                          if (diff <= 0) diff += 7;
                          d.setDate(d.getDate() + diff);
                          const y = d.getFullYear();
                          const m = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          dateStr = `${y}-${m}-${day}`;
                        }
                        const isSelected = formData.specificDate === dateStr;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormData({ ...formData, specificDate: dateStr })}
                            style={{
                              fontSize: '0.72rem',
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: isSelected ? '1.5px solid #6366f1' : '1px solid var(--border-subtle)',
                              backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
                              color: isSelected ? '#6366f1' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontWeight: '700'
                            }}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: '1.4' }}>
                    💡 <strong>Não recorrente:</strong> Esta tarefa aparecerá exclusivamente no dia selecionado ({(() => {
                      if (!formData.specificDate) return '';
                      const [y, m, d] = formData.specificDate.split('-');
                      return `${d}/${m}/${y}`;
                    })()}). Ao ser concluída, não voltará a se repetir automaticamente.
                  </p>
                </div>
              )}

              {/* OPÇÃO PERSONALIZADA 1: De X em X dias */}
              {formData.frequency === 'custom_interval' && (
                <div
                  style={{
                    marginBottom: '14px',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-app)',
                    border: '1.5px solid var(--accent-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                      <Repeat size={16} />
                      <span>Repetir de quantos em quantos dias?</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
                      A cada {formData.customIntervalDays || 3} dias
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      className="form-input"
                      style={{ width: '90px', fontWeight: '700', fontSize: '1rem', textAlign: 'center' }}
                      value={formData.customIntervalDays || 3}
                      onChange={(e) => setFormData({ ...formData, customIntervalDays: Math.max(1, Number(e.target.value)) })}
                      required
                    />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      dias corridos de intervalo
                    </span>
                  </div>

                  {/* Atalhos Rápidos */}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '2px' }}>
                    {[2, 3, 4, 5, 7, 10, 15, 20, 30].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({ ...formData, customIntervalDays: num })}
                        style={{
                          fontSize: '0.72rem',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: formData.customIntervalDays === num ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                          backgroundColor: formData.customIntervalDays === num ? 'var(--accent-primary-light)' : 'var(--bg-card)',
                          color: formData.customIntervalDays === num ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        {num} dias
                      </button>
                    ))}
                  </div>

                  <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.3' }}>
                    💡 Exemplo: Com 3 dias, se cair hoje ela voltará automaticamente daqui a 3 dias.
                  </p>
                </div>
              )}

              {/* OPÇÃO PERSONALIZADA 2: Dia específico do mês */}
              {formData.frequency === 'monthly_day' && (
                <div
                  style={{
                    marginBottom: '14px',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-app)',
                    border: '1.5px solid var(--accent-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                      <Calendar size={16} />
                      <span>Em qual dia de cada mês?</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
                      Todo dia {formData.customMonthDay || 5}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      className="form-input"
                      style={{ width: '90px', fontWeight: '700', fontSize: '1rem', textAlign: 'center' }}
                      value={formData.customMonthDay || 5}
                      onChange={(e) => setFormData({ ...formData, customMonthDay: Math.min(31, Math.max(1, Number(e.target.value))) })}
                      required
                    />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      de cada mês
                    </span>
                  </div>

                  {/* Atalhos Rápidos */}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '2px' }}>
                    {[1, 5, 10, 15, 20, 25, 28, 30].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({ ...formData, customMonthDay: num })}
                        style={{
                          fontSize: '0.72rem',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: formData.customMonthDay === num ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                          backgroundColor: formData.customMonthDay === num ? 'var(--accent-primary-light)' : 'var(--bg-card)',
                          color: formData.customMonthDay === num ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        Dia {num}
                      </button>
                    ))}
                  </div>

                  <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.3' }}>
                    💡 Exemplo: Se colocar dia 5, a tarefa será agendada todo dia 5 de cada mês (contas, dedetização, etc).
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Tempo Estimado (min)</label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    className="form-input"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Horário Personalizado</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.preferredTime}
                    onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                  />
                  {/* Atalhos rápidos de horário */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {['08:00', '12:00', '14:30', '19:00', '21:30'].map((timeStr) => (
                      <button
                        key={timeStr}
                        type="button"
                        onClick={() => setFormData({ ...formData, preferredTime: timeStr })}
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 6px',
                          borderRadius: 'var(--radius-sm)',
                          border: formData.preferredTime === timeStr ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                          backgroundColor: formData.preferredTime === timeStr ? 'var(--accent-primary-light)' : 'var(--bg-app)',
                          color: formData.preferredTime === timeStr ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        {timeStr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nível de Desgaste (1 a 3) */}
              <div className="form-group">
                <label className="form-label">Nível de Desgaste Físico</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { level: 1, label: 'Leve (1x)', icon: Sprout, class: 'effort-1' },
                    { level: 2, label: 'Médio (2x)', icon: Zap, class: 'effort-2' },
                    { level: 3, label: 'Pesado (3x)', icon: Flame, class: 'effort-3' }
                  ].map((eff) => {
                    const isSelected = Number(formData.effortLevel) === eff.level;
                    const IconComp = eff.icon;
                    return (
                      <button
                        key={eff.level}
                        type="button"
                        onClick={() => setFormData({ ...formData, effortLevel: eff.level })}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '10px 4px',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                          backgroundColor: isSelected ? 'var(--accent-primary-light)' : 'var(--bg-app)',
                          cursor: 'pointer'
                        }}
                      >
                        <IconComp size={18} />
                        <span style={{ fontSize: '0.78rem', fontWeight: '700' }}>{eff.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Pontuação total = {formData.durationMinutes} min × {formData.effortLevel}x = {formData.durationMinutes * formData.effortLevel} pts
                </div>
              </div>

              {/* Sobrecarga da Tarefa */}
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Heart size={14} color="var(--accent-rose)" />
                  <span>Esta tarefa sobrecarrega alguém?</span>
                </label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  O algoritmo dará peso extra e priorizará o outro parceiro para assumi-la com mais frequência.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {users.map((u) => {
                    const isChecked = formData.overloadsUsers.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleToggleOverload(u.id)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '10px',
                          borderRadius: 'var(--radius-md)',
                          border: isChecked ? '2px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
                          backgroundColor: isChecked ? 'var(--accent-rose-light)' : 'var(--bg-app)',
                          color: isChecked ? 'var(--accent-rose)' : 'var(--text-primary)',
                          fontWeight: '600',
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        <span>{u.avatar}</span>
                        <span>Sobrecarrega {u.name}</span>
                        {isChecked && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observações / Detalhes</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Ex: Usar esponja azul para não riscar..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary btn-action-large">
                  <Check size={18} />
                  <span>{editingTask ? 'Salvar Alterações' : 'Cadastrar Tarefa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
