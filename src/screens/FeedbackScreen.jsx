import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquareWarning,
  Camera,
  Image as ImageIcon,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  HeartHandshake,
  Trash2,
  X,
  Maximize2,
  Folder,
  RotateCcw,
  Briefcase
} from 'lucide-react';
import { playChimeSound } from '../services/notificationService';
import { isUserInWorkHours, getWorkSchedule, isUserBusyOrAway } from '../services/schedulerService';
import { normalizeUserId } from '../constants/initialData';
import { InAppCamera } from '../components/InAppCamera';

export function FeedbackScreen({
  activeUser,
  users = [],
  feedbacks = [],
  availability = {},
  onCreateFeedback,
  onResolveFeedback,
  onCancelFeedback,
  onTestAlarm,
  onOpenAvailability
}) {

  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent' | 'new'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('gentle'); // 'gentle' | 'warning' | 'urgent'
  const [imageBase64, setImageBase64] = useState(null);
  const [notifyAfterWork, setNotifyAfterWork] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [showInAppCamera, setShowInAppCamera] = useState(false);
  const fileInputRef = useRef(null);

  const otherUser = users.find((u) => normalizeUserId(u.id) !== activeUser.id) || users[1];
  const partnerBusyStatus = isUserBusyOrAway(availability, otherUser?.id, 20);
  const isPartnerWorkingNow = partnerBusyStatus.isBusy;
  const partnerWorkSchedule = getWorkSchedule(availability, otherUser?.id);

  const DRAFT_KEY = `feedback_draft_${activeUser?.id || 'default'}`;

  // Restaura rascunho salvo do formulário (evita perder texto se o app reiniciar ao escolher foto)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.title) setTitle(draft.title);
        if (draft.description) setDescription(draft.description);
        if (draft.severity) setSeverity(draft.severity);
        if (draft.imageBase64) setImageBase64(draft.imageBase64);
        if (draft.notifyAfterWork !== undefined) setNotifyAfterWork(draft.notifyAfterWork);
      }
    } catch (e) {}
  }, [DRAFT_KEY]);

  // Salva rascunho automaticamente
  useEffect(() => {
    try {
      if (title || description || imageBase64) {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            title,
            description,
            severity,
            imageBase64,
            notifyAfterWork,
            updatedAt: Date.now()
          })
        );
      }
    } catch (e) {}
  }, [title, description, severity, imageBase64, notifyAfterWork, DRAFT_KEY]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {}
    setTitle('');
    setDescription('');
    setImageBase64(null);
    setSeverity('gentle');
    setNotifyAfterWork(false);
  };

  // Reclamações que eu recebi do meu parceiro
  const receivedFeedbacks = feedbacks.filter((f) => normalizeUserId(f.toUserId) === activeUser.id);
  // Reclamações que eu enviei para o meu parceiro
  const sentFeedbacks = feedbacks.filter((f) => normalizeUserId(f.fromUserId) === activeUser.id);

  // Compressão e carregamento da foto via Câmera/Galeria
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Redimensiona para max 640px para garantir envio ultrarrápido em rede móvel
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 640;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Gera JPEG otimizado em qualidade 0.7
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setImageBase64(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Por favor, informe o assunto da reclamação.');
      return;
    }

    setIsSubmitting(true);

    const shouldWaitAfterBusy = notifyAfterWork && partnerBusyStatus.isBusy;

    const newFeedback = {
      id: `feedback_${Date.now()}`,
      fromUserId: activeUser.id,
      toUserId: otherUser.id,
      title: title.trim(),
      description: description.trim(),
      image: imageBase64,
      severity,
      status: 'pending', // 'pending' | 'resolving' | 'resolved'
      notifyAfterWork: Boolean(notifyAfterWork),
      delivered: !shouldWaitAfterBusy,
      scheduledFor: shouldWaitAfterBusy && partnerBusyStatus.targetDate ? partnerBusyStatus.targetDate.toISOString() : null,
      scheduledTimeStr: shouldWaitAfterBusy ? partnerBusyStatus.alarmTriggerTimeStr : null,
      busyTitle: shouldWaitAfterBusy ? partnerBusyStatus.title : null,
      createdAt: new Date().toISOString(),
      responseNote: null,
      resolvedAt: null
    };

    onCreateFeedback(newFeedback);

    setTitle('');
    setDescription('');
    setImageBase64(null);
    setSeverity('gentle');
    setNotifyAfterWork(false);
    setIsSubmitting(false);
    setActiveTab('sent');

    if (shouldWaitAfterBusy) {
      alert(`Desabafo guardado com muito carinho! 🕊️\n\nComo ${otherUser.name} está em: ${partnerBusyStatus.title} (até ${partnerBusyStatus.freeAt}), a notificação com som de alarme tocará no celular às ${partnerBusyStatus.alarmTriggerTimeStr} (exatamente 20 minutos após o horário vago/livre, dando tempo de chegar em casa com calma).`);
    } else {
      alert(`Reclamação enviada com sucesso para ${otherUser.name}! Vai chamar a atenção no celular agora. 🕊️`);
    }
  };

  const handleQuickResponse = (feedback, responseText, markResolved = false) => {
    playChimeSound('success');
    onResolveFeedback(feedback.id, {
      status: markResolved ? 'resolved' : 'resolving',
      responseNote: responseText,
      resolvedAt: markResolved ? new Date().toISOString() : null
    });
  };

  const getSeverityBadge = (sev) => {
    if (sev === 'urgent') {
      return (
        <span className="task-effort-badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
          🚨 Urgente / Chateado(a)
        </span>
      );
    }
    if (sev === 'warning') {
      return (
        <span className="task-effort-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
          ⚠️ Precisa de Atenção
        </span>
      );
    }
    return (
      <span className="task-effort-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
        💬 Toque Carinhoso
      </span>
    );
  };

  return (
    <div>
      {/* Topo do Módulo */}
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquareWarning size={20} color="var(--accent-rose)" />
          <span>Cantinho do Desabafo</span>
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Seu espaço seguro para pontuar incômodos com fotos, sem brigas e com diálogo aberto.
        </p>
      </div>

      {/* Abas: Recebidas | Enviadas | Nova Reclamação */}
      <div className="tabs-pill-container" style={{ marginBottom: '16px' }}>
        <button
          className={`tab-pill ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          <span>Para Mim ({receivedFeedbacks.filter((f) => f.status !== 'resolved').length})</span>
        </button>
        <button
          className={`tab-pill ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          <span>Minhas ({sentFeedbacks.length})</span>
        </button>
        <button
          className={`tab-pill ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
          style={{ backgroundColor: activeTab === 'new' ? 'var(--accent-rose)' : 'transparent', color: activeTab === 'new' ? 'white' : 'inherit' }}
        >
          <span>+ Reclamar</span>
        </button>
      </div>

      {/* ABA 1: FORMULÁRIO DE NOVA RECLAMAÇÃO COM FOTO */}
      {activeTab === 'new' && (
        <div className="card" style={{ borderColor: 'var(--accent-rose)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '8px' }}>
            Enviar Reclamação / Observação para {otherUser.name}
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Vai chegar no celular de {otherUser.name} em tempo real com a foto anexada.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Qual é o incômodo?</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Louça na pia, Areia dos gatos, Toalha molhada..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Explique com carinho o que aconteceu</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Ex: Amor, você esqueceu de passar pano no quarto hoje e o gatinho sujou as patinhas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* SELEÇÃO DO TOM / GRAVIDADE */}
            <div className="form-group">
              <label className="form-label">Tom do recado:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {[
                  { id: 'gentle', label: 'Toque Leve', icon: '💬' },
                  { id: 'warning', label: 'Atenção', icon: '⚠️' },
                  { id: 'urgent', label: 'Desabafo', icon: '🚨' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSeverity(item.id)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-md)',
                      border: severity === item.id ? '2px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
                      backgroundColor: severity === item.id ? 'var(--accent-rose-light)' : 'var(--bg-app)',
                      color: severity === item.id ? 'var(--accent-rose)' : 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{item.icon} {item.label}</span>
                  </button>
                ))}
              </div>

              {/* Explicação do Alarme de Atenção Contínuo */}
              {(severity === 'warning' || severity === 'urgent') && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    lineHeight: '1.4'
                  }}
                >
                  🚨 <strong>Modo Atenção Ativo:</strong> Abrirá cobrindo a tela do celular de {otherUser.name} com som de alarme contínuo que só desliga quando tocar em <strong>Parar</strong>!
                </div>
              )}

              {onTestAlarm && (
                <button
                  type="button"
                  onClick={onTestAlarm}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--accent-rose)',
                    backgroundColor: 'transparent',
                    color: 'var(--accent-rose)',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>🔊 Testar Som e Tela de Atenção Agora</span>
                </button>
              )}
            </div>

            {/* UPLOAD / CÂMERA PRÓPRIA DO APP / ESCOLHER ARQUIVO */}
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Foto do Incômodo (Opcional):</span>
                {imageBase64 && (
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700' }}>
                    ✓ Foto anexada com sucesso
                  </span>
                )}
              </label>

              {/* Input escondido para galeria tradicional */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageChange}
              />

              {!imageBase64 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                  {/* Botão 1: CÂMERA PRÓPRIA DO APP */}
                  <button
                    type="button"
                    onClick={() => setShowInAppCamera(true)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '16px 12px',
                      border: '2px solid var(--accent-rose)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--accent-rose-light)',
                      color: 'var(--accent-rose)',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <Camera size={26} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '800' }}>
                      📸 Câmera do App
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      Tira foto sem sair do app
                    </span>
                  </button>

                  {/* Botão 2: ESCOLHER ARQUIVO DA GALERIA */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '16px 12px',
                      border: '2px dashed var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <Folder size={26} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                      📁 Galeria / Arquivo
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      Escolher foto salva
                    </span>
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid var(--accent-rose)' }}>
                  <img
                    src={imageBase64}
                    alt="Foto do incômodo"
                    style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }}
                  />

                  {/* Barra de ações sobre a foto */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedImage(imageBase64)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Maximize2 size={14} /> <span>Ver Grande</span>
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setShowInAppCamera(true)}
                        style={{
                          background: 'rgba(255,255,255,0.15)',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'white',
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                      >
                        <RotateCcw size={12} /> <span>Trocar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageBase64(null)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.3)',
                          border: '1px solid #ef4444',
                          borderRadius: '6px',
                          color: '#fca5a5',
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={12} /> <span>Remover</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal da Câmera Interna do App */}
            {showInAppCamera && (
              <InAppCamera
                onCapture={(compressedDataUrl) => {
                  setImageBase64(compressedDataUrl);
                  setShowInAppCamera(false);
                }}
                onClose={() => setShowInAppCamera(false)}
              />
            )}

            {/* Opção de Notificar Somente Fora do Horário de Trabalho */}
            <div
              style={{
                marginTop: '14px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color="var(--accent-primary)" />
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>
                      Notificar só quando {otherUser.name} estiver livre
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: '700' }}>
                      Dispara 20 minutos após o horário vago/saída
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyAfterWork}
                  onChange={(e) => setNotifyAfterWork(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </label>

              {/* Informações detalhadas do status configurado de otherUser */}
              <div
                style={{
                  fontSize: '0.74rem',
                  color: isPartnerWorkingNow ? '#f59e0b' : 'var(--text-muted)',
                  lineHeight: '1.4',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  paddingTop: '6px',
                  borderTop: '1px dashed var(--border-subtle)'
                }}
              >
                {partnerBusyStatus.isBusy ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: '800' }}>
                      <span>{partnerBusyStatus.icon}</span>
                      <span>{otherUser.name} está em: {partnerBusyStatus.title} (até {partnerBusyStatus.freeAt})</span>
                    </div>
                    <div style={{ padding: '6px 8px', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#b45309', fontSize: '0.73rem' }}>
                      ⏳ <strong>Respiro de 20 Minutos:</strong> Se marcado, o alarme e som tocarão às <strong>{partnerBusyStatus.alarmTriggerTimeStr}</strong> (+20m após o horário vago), dando tempo para chegar em casa com tranquilidade!
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: '700' }}>
                    <span>🟢</span>
                    <span>{otherUser.name} está livre no momento. O aviso e o alarme sonoro chegarão de imediato.</span>
                  </div>
                )}

                {onOpenAvailability && (
                  <button
                    type="button"
                    onClick={onOpenAvailability}
                    style={{
                      marginTop: '6px',
                      alignSelf: 'flex-start',
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    ⚙️ Ajustar horários de trabalho e fora de casa de {otherUser.name}
                  </button>
                )}
              </div>
            </div>


            {/* Botões de Ação: Enviar e Cancelar Desabafo */}
            <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary btn-action-large"
                style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' }}
                disabled={isSubmitting}
              >
                <Send size={18} />
                <span>{isSubmitting ? 'Enviando ao celular...' : `Enviar Reclamação para ${otherUser.name}`}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (title.trim() || description.trim() || imageBase64) {
                    if (!confirm('Deseja cancelar e limpar este desabafo?')) return;
                  }
                  clearDraft();
                  setActiveTab('received');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <X size={16} />
                <span>Cancelar Desabafo</span>
              </button>
            </div>
          </form>
        </div>
      )}


      {/* ABA 2: RECLAMAÇÕES RECEBIDAS DO PARCEIRO */}
      {activeTab === 'received' && (
        <div>
          {receivedFeedbacks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px 16px' }}>
              <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🥰</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Paz e Harmonia!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {otherUser.name} não enviou nenhuma reclamação no momento. Vocês estão em sintonia! 💖
              </p>
            </div>
          ) : (
            receivedFeedbacks.map((item) => (
              <div
                key={item.id}
                className="card"
                style={{
                  borderLeft: `5px solid ${item.status === 'resolved' ? 'var(--accent-primary)' : 'var(--accent-rose)'}`,
                  marginBottom: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      {getSeverityBadge(item.severity)}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        De: {otherUser.name}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {item.title}
                    </h3>
                  </div>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: item.status === 'resolved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                      color: item.status === 'resolved' ? 'var(--accent-primary)' : 'var(--accent-rose)'
                    }}
                  >
                    {item.status === 'resolved' ? 'Resolvido ✅' : 'Pendente ⏳'}
                  </span>
                </div>

                {item.description && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '8px 0', lineHeight: '1.4' }}>
                    "{item.description}"
                  </p>
                )}

                {/* Exibição da Foto com clique para ampliar */}
                {item.image && (
                  <div style={{ margin: '10px 0', position: 'relative' }}>
                    <img
                      src={item.image}
                      alt="Foto anexada"
                      style={{
                        width: '100%',
                        maxHeight: '200px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: '1px solid var(--border-subtle)'
                      }}
                      onClick={() => setExpandedImage(item.image)}
                    />
                    <button
                      type="button"
                      onClick={() => setExpandedImage(item.image)}
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <Maximize2 size={12} />
                      <span>Ampliar</span>
                    </button>
                  </div>
                )}

                {/* Resposta Atual se houver */}
                {item.responseNote && (
                  <div
                    style={{
                      backgroundColor: 'var(--accent-primary-light)',
                      border: '1px solid var(--accent-primary)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      color: 'var(--accent-primary)',
                      fontWeight: '600',
                      margin: '8px 0'
                    }}
                  >
                    Sua resposta: "{item.responseNote}"
                  </div>
                )}

                {/* Botões de Resposta Rápida com Amor */}
                {item.status !== 'resolved' && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Responder para {otherUser.name}:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                      <button
                        type="button"
                        className="btn-task-action"
                        onClick={() => handleQuickResponse(item, 'Já estou resolvendo agora mesmo! 🏃💨', false)}
                      >
                        🏃 Já estou resolvendo!
                      </button>
                      <button
                        type="button"
                        className="btn-task-action"
                        onClick={() => handleQuickResponse(item, 'Amor, desculpa! Passou batido, vou arrumar 💖', false)}
                      >
                        💖 Desculpa, vou arrumar
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '9px', fontSize: '0.85rem' }}
                      onClick={() => handleQuickResponse(item, 'Problema resolvido com carinho! ✨', true)}
                    >
                      <CheckCircle2 size={16} />
                      <span>Marcar como Resolvido</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ABA 3: MINHAS RECLAMAÇÕES ENVIADAS */}
      {activeTab === 'sent' && (
        <div>
          {sentFeedbacks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px 16px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Você ainda não enviou nenhuma observação ou reclamação para {otherUser.name}.
              </p>
            </div>
          ) : (
            sentFeedbacks.map((item) => (
              <div key={item.id} className="card" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>{item.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Enviado para {otherUser.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: item.status === 'resolved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                      color: item.status === 'resolved' ? 'var(--accent-primary)' : 'var(--accent-rose)'
                    }}
                  >
                    {item.status === 'resolved' ? 'Resolvido ✅' : 'Aguardando resposta'}
                  </span>
                </div>

                {item.description && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    {item.description}
                  </p>
                )}

                {item.image && (
                  <img
                    src={item.image}
                    alt="Foto enviada"
                    style={{
                      width: '100%',
                      maxHeight: '140px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                      marginTop: '8px'
                    }}
                  />
                )}

                {item.notifyAfterWork && !item.delivered && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '0.74rem',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Clock size={14} />
                    <span>Aguardando {otherUser.name} sair do trabalho para disparar a notificação.</span>
                  </div>
                )}

                {item.responseNote && (
                  <div
                    style={{
                      backgroundColor: 'var(--bg-app)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      color: 'var(--text-primary)',
                      marginTop: '8px',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <strong>Resposta de {otherUser.name}:</strong> "{item.responseNote}"
                  </div>
                )}

                {/* Opção de Cancelar Desabafo */}
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Deseja cancelar este desabafo sobre "${item.title}"? Ele será removido e o alarme no celular de ${otherUser.name} será desligado imediatamente.`)) {
                        if (onCancelFeedback) {
                          onCancelFeedback(item.id);
                        }
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      color: '#ef4444',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Cancelar Desabafo</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal para visualizar imagem ampliada */}
      {expandedImage && (
        <div className="modal-overlay" onClick={() => setExpandedImage(null)}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={expandedImage}
              alt="Foto ampliada"
              style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 'var(--radius-lg)' }}
            />
            <button
              onClick={() => setExpandedImage(null)}
              style={{
                position: 'absolute',
                top: '-14px',
                right: '-14px',
                backgroundColor: 'white',
                color: 'black',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-lg)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
