import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Heart,
  Check,
  X,
  Clock,
  Sparkles,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { playChimeSound } from '../services/notificationService';

export function SwapsScreen({
  activeUser,
  users = [],
  swaps = [],
  onAcceptSwap,
  onDeclineSwap,
  onCreateSwap,
  schedule = []
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskInstanceId, setSelectedTaskInstanceId] = useState('');
  const [swapNote, setSwapNote] = useState('');

  const otherUser = users.find((u) => u.id !== activeUser.id) || users[1];

  // Minhas tarefas que posso pedir para trocar
  const myPendingTasks = schedule.filter(
    (t) => t.assignedTo === activeUser.id && !t.completed
  );

  const pendingForMe = swaps.filter(
    (s) => s.toUserId === activeUser.id && s.status === 'pending'
  );

  const myOutgoingRequests = swaps.filter(
    (s) => s.fromUserId === activeUser.id && s.status === 'pending'
  );

  const historySwaps = swaps.filter((s) => s.status !== 'pending');

  const handleOpenModal = () => {
    if (myPendingTasks.length > 0) {
      setSelectedTaskInstanceId(myPendingTasks[0].instanceId);
    }
    setSwapNote('');
    setIsModalOpen(true);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!selectedTaskInstanceId) {
      alert('Selecione uma tarefa para propor a troca.');
      return;
    }

    const task = myPendingTasks.find((t) => t.instanceId === selectedTaskInstanceId);
    if (!task) return;

    onCreateSwap({
      id: `swap_${Date.now()}`,
      taskInstanceId: task.instanceId,
      taskTitle: task.title,
      durationMinutes: task.durationMinutes,
      effortLevel: task.effortLevel,
      points: task.points,
      fromUserId: activeUser.id,
      toUserId: otherUser.id,
      note: swapNote.trim() || 'Poderia me dar uma forcinha com essa hoje?',
      createdAt: new Date().toISOString(),
      status: 'pending'
    });

    setIsModalOpen(false);
  };

  const handleAccept = (swap) => {
    playChimeSound('success');
    onAcceptSwap(swap);
  };

  return (
    <div>
      {/* Topo com Botão Solicitar Troca */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Trocas do Casal</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Apoio mútuo e flexibilidade sem nenhuma cobrança.
          </p>
        </div>
        <button
          id="btn-new-swap"
          className="btn btn-primary"
          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          onClick={handleOpenModal}
        >
          <ArrowLeftRight size={16} />
          <span>Pedir Troca</span>
        </button>
      </div>

      {/* Pedidos Recebidos Pendentes */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} color="var(--accent-primary)" />
          <span>Pedidos para você ({pendingForMe.length})</span>
        </h3>

        {pendingForMe.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nenhum pedido de troca pendente para você no momento. ✨
            </p>
          </div>
        ) : (
          pendingForMe.map((swap) => {
            const sender = users.find((u) => u.id === swap.fromUserId) || { name: 'Seu Amor', avatar: '💖' };

            return (
              <div key={swap.id} className="card" style={{ borderColor: 'var(--accent-primary)', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.4rem' }}>{sender.avatar}</span>
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>{sender.name} pediu ajuda:</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {swap.durationMinutes} min • {swap.points} pts de esforço
                      </div>
                    </div>
                  </div>
                  <span className="task-category-badge" style={{ backgroundColor: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
                    Pendente
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-app)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    margin: '10px 0',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {swap.taskTitle}
                  </div>
                  {swap.note && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                      "{swap.note}"
                    </div>
                  )}
                </div>

                {/* Botões Aceitar ou Recusar */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '10px', fontSize: '0.85rem' }}
                    onClick={() => handleAccept(swap)}
                  >
                    <Check size={16} />
                    <span>Aceitar com carinho 💖</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ padding: '10px', fontSize: '0.85rem' }}
                    onClick={() => onDeclineSwap(swap.id)}
                  >
                    <X size={16} />
                    <span>Hoje não consigo ☕</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Meus Pedidos Enviados */}
      {myOutgoingRequests.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '10px' }}>
            Seus pedidos enviados ({myOutgoingRequests.length})
          </h3>
          {myOutgoingRequests.map((swap) => (
            <div key={swap.id} className="card" style={{ opacity: 0.85, marginBottom: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{swap.taskTitle}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Aguardando resposta de {otherUser.name}...
                  </div>
                </div>
                <span className="task-category-badge">Enviado</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Histórico Recente de Trocas */}
      {historySwaps.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '10px', color: 'var(--text-secondary)' }}>
            Histórico Recente
          </h3>
          {historySwaps.slice(0, 5).map((swap) => (
            <div key={swap.id} className="card" style={{ padding: '10px 14px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span>{swap.taskTitle}</span>
                <span style={{ color: swap.status === 'accepted' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '600' }}>
                  {swap.status === 'accepted' ? 'Aceita 🤝' : 'Adiada'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Sheet para Propor Troca */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '12px' }}>
              Propor Troca com {otherUser.name}
            </h3>

            {myPendingTasks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                Você não possui nenhuma tarefa pendente agendada para pedir troca agora!
              </p>
            ) : (
              <form onSubmit={handleCreateSubmit}>
                <div className="form-group">
                  <label className="form-label">Qual tarefa você deseja passar?</label>
                  <select
                    className="form-select"
                    value={selectedTaskInstanceId}
                    onChange={(e) => setSelectedTaskInstanceId(e.target.value)}
                  >
                    {myPendingTasks.map((t) => (
                      <option key={t.instanceId} value={t.instanceId}>
                        {t.title} ({t.durationMinutes}m • {t.preferredTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Recadinho carinhoso (opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Tive um dia super puxado no trabalho..."
                    value={swapNote}
                    onChange={(e) => setSwapNote(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary btn-action-large">
                    <ArrowLeftRight size={18} />
                    <span>Enviar Pedido de Troca</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
