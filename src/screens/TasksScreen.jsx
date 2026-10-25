import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { CATEGORIES } from '../constants/initialData';

export function TasksScreen({ tasks = [], users = [], onSaveTask, onDeleteTask }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Estado do formulário
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    category: 'limpeza',
    frequency: 'daily',
    preferredTime: '09:00',
    durationMinutes: 20,
    effortLevel: 2,
    overloadsUsers: [],
    description: ''
  });

  const openNewTaskModal = () => {
    setEditingTask(null);
    setFormData({
      id: `task_${Date.now()}`,
      title: '',
      category: 'limpeza',
      frequency: 'daily',
      preferredTime: '09:00',
      durationMinutes: 20,
      effortLevel: 2,
      overloadsUsers: [],
      description: ''
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

    onSaveTask({
      ...formData,
      durationMinutes: Number(formData.durationMinutes) || 15,
      effortLevel: Number(formData.effortLevel) || 1
    });

    setIsModalOpen(false);
  };

  const filteredTasks = tasks.filter((t) => {
    if (selectedCategoryFilter === 'all') return true;
    return t.category === selectedCategoryFilter;
  });

  return (
    <div>
      {/* Topo com botão Adicionar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Tarefas da Casa</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {tasks.length} tarefas cadastradas na rotina
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
          Todas ({tasks.length})
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

      {/* Lista de Tarefas */}
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

            {/* Rodapé do Card com tempo e esforço */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-subtle)',
                marginTop: '10px',
                paddingTop: '8px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} />
                <span>{task.durationMinutes} minutos</span>
                <span>•</span>
                <span>{task.preferredTime}</span>
              </div>
              <strong style={{ color: 'var(--text-primary)' }}>
                {points} pts de esforço
              </strong>
            </div>
          </div>
        );
      })}

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
                  placeholder="Ex: Ração dos gatos, Limpar banheiro..."
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
                  </select>
                </div>
              </div>

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
