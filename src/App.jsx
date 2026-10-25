import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { TodayScreen } from './screens/TodayScreen';
import { WeekScreen } from './screens/WeekScreen';
import { BalanceScreen } from './screens/BalanceScreen';
import { TasksScreen } from './screens/TasksScreen';
import { AvailabilityScreen } from './screens/AvailabilityScreen';
import { SwapsScreen } from './screens/SwapsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';
import { LoginScreen } from './screens/LoginScreen';
import {
  loadLocalData,
  subscribeToCouple,
  syncSaveData,
  getActiveUserId,
  setActiveUserId,
  getDefaultAppState
} from './services/storageService';
import { generateWeeklySchedule, formatDateKey, isUserInWorkHours } from './services/schedulerService';
import {
  triggerNotification,
  playChimeSound,
  startAttentionAlarmLoop,
  stopAttentionAlarmLoop
} from './services/notificationService';
import { getCurrentAuthUser, logout } from './services/authService';
import { normalizeUserId, DEFAULT_USERS } from './constants/initialData';
import {
  insertFeedbackSupabase,
  updateFeedbackSupabase,
  deleteFeedbackSupabase,
  initSupabase,
  fetchFeedbacksSupabase,
  subscribeToSupabaseFeedbacks,
  saveCoupleStateSupabase,
  fetchCoupleStateSupabase,
  subscribeToCoupleStateSupabase
} from './services/supabaseService';
import { AttentionAlarmModal } from './components/AttentionAlarmModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentAuthUser());
  const [appData, setAppData] = useState(() => loadLocalData());
  const [activeScreen, setActiveScreen] = useState('today');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('casa_em_paz_theme') || 'light';
  });
  const [syncStatus, setSyncStatus] = useState({ online: true, reason: 'connecting', mode: 'realtime' });
  const [activeAttentionAlarm, setActiveAttentionAlarm] = useState(null);

  // Inicializa Supabase e sincroniza tarefas e feedbacks do banco de forma segura
  useEffect(() => {
    try {
      initSupabase();

      // 1. Carrega tarefas salvas na nuvem do Supabase (couples_state)
      fetchCoupleStateSupabase(appData.coupleCode)
        .then((cloudState) => {
          if (cloudState && cloudState.tasks && cloudState.tasks.length > 0) {
            setAppData((prev) => {
              const localTime = new Date(prev.updatedAt || 0).getTime();
              const cloudTime = new Date(cloudState.updatedAt || 0).getTime();
              if (cloudTime >= localTime) {
                return { ...prev, ...cloudState };
              } else {
                saveCoupleStateSupabase(prev.coupleCode, prev).catch(() => {});
                return prev;
              }
            });
            setSyncStatus({ online: true, reason: 'connected', mode: 'supabase' });
          } else {
            // Salva tarefas iniciais no Supabase na primeira conexão
            saveCoupleStateSupabase(appData.coupleCode, appData).then(() => {
              setSyncStatus({ online: true, reason: 'connected', mode: 'supabase' });
            });
          }
        })
        .catch((err) => {
          console.warn('Busca de tarefas do Supabase avisou:', err);
        });

      // 2. Escuta tarefas do casal em tempo real via Supabase Realtime
      const unsubCoupleState = subscribeToCoupleStateSupabase(
        appData.coupleCode,
        (remoteState) => {
          if (remoteState && remoteState.tasks) {
            setAppData((prev) => {
              const localTime = new Date(prev.updatedAt || 0).getTime();
              const remoteTime = new Date(remoteState.updatedAt || 0).getTime();
              if (remoteTime > localTime) {
                return { ...prev, ...remoteState };
              }
              return prev;
            });
            setSyncStatus({ online: true, reason: 'synced_remote', mode: 'supabase' });
          }
        },
        (status) => {
          if (status.online) {
            setSyncStatus({ online: true, reason: 'connected', mode: 'supabase' });
          }
        }
      );

      // 3. Carrega feedbacks salvos na nuvem
      fetchFeedbacksSupabase(appData.coupleCode)
        .then((cloudFeedbacks) => {
          if (cloudFeedbacks && cloudFeedbacks.length > 0) {
            setAppData((prev) => {
              const existingIds = new Set((prev.feedbacks || []).map((f) => f.id));
              const toAdd = cloudFeedbacks.filter((cf) => !existingIds.has(cf.id));
              if (toAdd.length === 0) return prev;
              return { ...prev, feedbacks: [...toAdd, ...(prev.feedbacks || [])] };
            });
          }
        })
        .catch((err) => {
          console.warn('Busca de feedbacks do Supabase avisou (offline/conexao):', err);
        });

      // 4. Escuta novos feedbacks em tempo real via Supabase Realtime
      const unsubFeedbacks = subscribeToSupabaseFeedbacks(appData.coupleCode, ({ eventType, feedback, feedbackId }) => {
        if (eventType === 'DELETE' && feedbackId) {
          setAppData((prev) => ({
            ...prev,
            feedbacks: (prev.feedbacks || []).filter((f) => f.id !== feedbackId)
          }));
          setActiveAttentionAlarm((currentAlarm) => {
            if (currentAlarm?.id === feedbackId) {
              stopAttentionAlarmLoop();
              return null;
            }
            return currentAlarm;
          });
          return;
        }

        if (!feedback) return;
        setAppData((prev) => {
          let updatedList = [...(prev.feedbacks || [])];
          if (eventType === 'INSERT') {
            if (!updatedList.some((f) => f.id === feedback.id)) {
              updatedList = [feedback, ...updatedList];
              const myId = normalizeUserId(currentUser?.id || currentUser?.username || getActiveUserId());
              const fromId = normalizeUserId(feedback.fromUserId);
              const toId = normalizeUserId(feedback.toUserId);

              // Alarme e notificação só disparam se foi enviado PELO PARCEIRO e É PARA MIM!
              if (fromId !== myId && toId === myId) {
                const isWorking = isUserInWorkHours(prev.availability, myId);
                const shouldHoldForAfterWork = feedback.notifyAfterWork && !feedback.delivered && isWorking;

                if (!shouldHoldForAfterWork) {
                  if (feedback.severity === 'warning' || feedback.severity === 'urgent') {
                    const partner = (prev.users || []).find((u) => normalizeUserId(u.id) === fromId);
                    startAttentionAlarmLoop();
                    setActiveAttentionAlarm({
                      ...feedback,
                      fromUserName: partner?.name || (fromId === 'kah' ? 'Kah' : 'Adryan')
                    });
                  } else {
                    try { playChimeSound(); } catch (e) {}
                  }
                }
              }
            }
          } else if (eventType === 'UPDATE') {
            updatedList = updatedList.map((f) => (f.id === feedback.id ? { ...f, ...feedback } : f));
          }
          return { ...prev, feedbacks: updatedList };
        });
      });

      // 5. Monitora status de conexão da internet do celular
      const handleOnline = () => setSyncStatus({ online: true, reason: 'connected', mode: 'online' });
      const handleOffline = () => setSyncStatus({ online: false, reason: 'offline', mode: 'offline' });
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        if (unsubCoupleState) unsubCoupleState();
        if (unsubFeedbacks) unsubFeedbacks();
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } catch (err) {
      console.warn('Erro ao inicializar servicos de nuvem:', err);
    }
  }, [appData.coupleCode, currentUser]);

  // Aplica o tema visual no elemento HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('casa_em_paz_theme', theme);
  }, [theme]);

  // Sincronização em tempo real (Canal P2P auxiliar)
  useEffect(() => {
    const unsubscribe = subscribeToCouple(
      appData.coupleCode,
      (remoteData) => {
        if (remoteData) {
          setAppData(remoteData);
        }
      },
      (status) => {
        // Só atualiza se o status for positivo ou se o Supabase não estiver conectado
        if (status.online) {
          setSyncStatus(status);
        }
      },
      (actionPayload) => {
        if (!actionPayload) return;
        const myId = normalizeUserId(currentUser?.id || currentUser?.username || getActiveUserId());

        // Parceiro cancelou o desabafo: interrompe o alarme imediatamente se estiver tocando
        if (actionPayload.type === 'FEEDBACK_CANCEL' && actionPayload.feedbackId) {
          setActiveAttentionAlarm((currentAlarm) => {
            if (currentAlarm?.id === actionPayload.feedbackId) {
              stopAttentionAlarmLoop();
              return null;
            }
            return currentAlarm;
          });
          return;
        }

        if (actionPayload.type === 'FEEDBACK_CREATE' && actionPayload.feedback) {
          const fb = actionPayload.feedback;
          const fromId = normalizeUserId(fb.fromUserId);
          const toId = normalizeUserId(fb.toUserId);

          if (fromId !== myId && toId === myId) {
            const isWorking = isUserInWorkHours(appData.availability, myId);
            const shouldHoldForAfterWork = fb.notifyAfterWork && !fb.delivered && isWorking;

            if (!shouldHoldForAfterWork && (fb.severity === 'warning' || fb.severity === 'urgent')) {
              const partner = (appData.users || []).find((u) => normalizeUserId(u.id) === fromId);
              startAttentionAlarmLoop();
              setActiveAttentionAlarm({
                ...fb,
                fromUserName: partner?.name || (fromId === 'kah' ? 'Kah' : 'Adryan')
              });
            }
          }
        }
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [appData.coupleCode, appData.availability, currentUser]);

  // Se o usuário logou, garante que o activeUserId é o dele
  useEffect(() => {
    if (currentUser && currentUser.id) {
      setActiveUserId(currentUser.id);
    }
  }, [currentUser]);

  // Checagem de lembretes no horário (a cada minuto)
  useEffect(() => {
    const checkReminders = () => {
      if (!currentUser) return;
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayKey = formatDateKey(now);

      const matchingTasks = (appData.weeklySchedule || []).filter(
        (t) =>
          t.date === todayKey &&
          t.assignedTo === currentUser.id &&
          !t.completed &&
          t.preferredTime === currentTimeStr
      );

      matchingTasks.forEach((task) => {
        triggerNotification(`Hora da tarefa: ${task.title} 🌿`, {
          body: `Tempo estimado: ${task.durationMinutes} min. No seu ritmo e com calma!`
        });
      });

      // Checa desabafos agendados para quando o parceiro sair do trabalho
      const isWorkingNow = isUserInWorkHours(appData.availability, currentUser.id);
      if (!isWorkingNow) {
        const pendingAfterWorkFeedbacks = (appData.feedbacks || []).filter(
          (f) => f.toUserId === currentUser.id && f.notifyAfterWork && !f.delivered
        );

        if (pendingAfterWorkFeedbacks.length > 0) {
          const updatedFeedbacks = (appData.feedbacks || []).map((f) => {
            if (f.toUserId === currentUser.id && f.notifyAfterWork && !f.delivered) {
              return { ...f, delivered: true };
            }
            return f;
          });

          setAppData((prev) => ({ ...prev, feedbacks: updatedFeedbacks }));

          pendingAfterWorkFeedbacks.forEach((fb) => {
            const partner = (appData.users || []).find((u) => u.id === fb.fromUserId);
            const partnerName = partner?.name || 'Seu Parceiro';

            triggerNotification(`Recado de ${partnerName}: ${fb.title} 🕊️`, {
              body: fb.description || 'Abra o app para conversar com tranquilidade.'
            });

            if (fb.severity === 'warning' || fb.severity === 'urgent') {
              startAttentionAlarmLoop();
              setActiveAttentionAlarm({
                ...fb,
                fromUserName: partnerName
              });
            } else {
              try { playChimeSound(); } catch (e) {}
            }
          });
        }
      }
    };

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [appData.weeklySchedule, appData.feedbacks, appData.availability, currentUser]);

  const activeId = normalizeUserId(currentUser?.id || currentUser?.username || getActiveUserId());

  const activeUser =
    (appData.users || []).find((u) => normalizeUserId(u.id || u.username) === activeId) || {
      id: activeId,
      username: activeId === 'kah' ? 'Kah' : 'Adryan',
      name: activeId === 'kah' ? 'Kah' : 'Adryan',
      avatar: activeId === 'kah' ? '👩‍🦰' : '🧔‍♂️',
      color: activeId === 'kah' ? '#ec4899' : '#3b82f6',
      role: activeId === 'kah' ? 'Parceira' : 'Parceiro'
    };

  const partnerId = activeId === 'adryan' ? 'kah' : 'adryan';

  const otherUser =
    (appData.users || []).find((u) => normalizeUserId(u.id || u.username) === partnerId) || {
      id: partnerId,
      username: partnerId === 'kah' ? 'Kah' : 'Adryan',
      name: partnerId === 'kah' ? 'Kah' : 'Adryan',
      avatar: partnerId === 'kah' ? '👩‍🦰' : '🧔‍♂️',
      color: partnerId === 'kah' ? '#ec4899' : '#3b82f6',
      role: partnerId === 'kah' ? 'Parceira' : 'Parceiro'
    };

  const coupleUsers = [
    (appData.users || []).find((u) => normalizeUserId(u.id) === 'adryan') || {
      id: 'adryan',
      username: 'Adryan',
      name: 'Adryan',
      avatar: '🧔‍♂️',
      color: '#3b82f6',
      role: 'Parceiro'
    },
    (appData.users || []).find((u) => normalizeUserId(u.id) === 'kah') || {
      id: 'kah',
      username: 'Kah',
      name: 'Kah',
      avatar: '👩‍🦰',
      color: '#ec4899',
      role: 'Parceira'
    }
  ];

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
  };

  // Alternar Modo Claro / Escuro
  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Concluir / Reabrir Tarefa
  const handleUpdateTaskStatus = (instanceId, completed) => {
    const completedAt = completed ? new Date().toISOString() : null;
    const updatedSchedule = (appData.weeklySchedule || []).map((item) => {
      if (item.instanceId === instanceId) {
        return { ...item, completed, completedAt };
      }
      return item;
    });

    const updatedData = { ...appData, weeklySchedule: updatedSchedule };
    setAppData(updatedData);

    syncSaveData(updatedData, {
      type: 'TASK_STATUS',
      instanceId,
      completed,
      completedAt
    });
  };

  // Passar Tarefa para o Parceiro
  const handleDelegateTask = (instanceId, toUserId) => {
    const partner = (appData.users || []).find((u) => u.id === toUserId);
    const updatedSchedule = (appData.weeklySchedule || []).map((item) => {
      if (item.instanceId === instanceId) {
        return { ...item, assignedTo: toUserId };
      }
      return item;
    });

    const updatedData = { ...appData, weeklySchedule: updatedSchedule };
    setAppData(updatedData);

    syncSaveData(updatedData, {
      type: 'TASK_DELEGATE',
      instanceId,
      toUserId
    });

    alert(`Tarefa passada com amor para ${partner?.name || 'seu parceiro'}! 💖`);
  };

  // Adiar Tarefa para Amanhã
  const handlePostponeTask = (instanceId) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = formatDateKey(tomorrow);
    let newInstanceId = instanceId;

    const updatedSchedule = (appData.weeklySchedule || []).map((item) => {
      if (item.instanceId === instanceId) {
        newInstanceId = `${item.taskId}_${tomorrowKey}`;
        return { ...item, date: tomorrowKey, instanceId: newInstanceId };
      }
      return item;
    });

    const updatedData = { ...appData, weeklySchedule: updatedSchedule };
    setAppData(updatedData);

    syncSaveData(updatedData, {
      type: 'TASK_POSTPONE',
      instanceId,
      newDate: tomorrowKey,
      newInstanceId
    });

    alert('Tarefa transferida para amanhã com tranquilidade! Descanse hoje. ✨');
  };

  // Criar Pedido de Troca
  const handleCreateSwap = (newSwap) => {
    const updatedSwaps = [newSwap, ...(appData.swaps || [])];
    const updatedData = { ...appData, swaps: updatedSwaps };
    setAppData(updatedData);

    syncSaveData(updatedData, {
      type: 'SWAP_CREATE',
      swap: newSwap
    });

    alert('Pedido de troca enviado com sucesso! 🤝');
  };

  // Aceitar Troca
  const handleAcceptSwap = (swap) => {
    const updatedSchedule = (appData.weeklySchedule || []).map((item) => {
      if (item.instanceId === swap.taskInstanceId) {
        return { ...item, assignedTo: swap.toUserId };
      }
      return item;
    });

    const updatedSwaps = (appData.swaps || []).map((s) => {
      if (s.id === swap.id) {
        return { ...s, status: 'accepted', resolvedAt: new Date().toISOString() };
      }
      return s;
    });

    const updatedData = {
      ...appData,
      weeklySchedule: updatedSchedule,
      swaps: updatedSwaps
    };

    setAppData(updatedData);

    syncSaveData(updatedData, {
      type: 'SWAP_RESOLVE',
      swapId: swap.id,
      status: 'accepted',
      taskInstanceId: swap.taskInstanceId,
      toUserId: swap.toUserId
    });

    alert('Troca aceita! A tarefa agora está na sua lista com muito carinho. 💖');
  };

  // Recusar Troca
  const handleDeclineSwap = (swapId) => {
    const updatedSwaps = (appData.swaps || []).map((s) => {
      if (s.id === swapId) {
        return { ...s, status: 'declined', resolvedAt: new Date().toISOString() };
      }
      return s;
    });

    const updatedData = { ...appData, swaps: updatedSwaps };
    setAppData(updatedData);

    syncSaveData(updatedData, {
      type: 'SWAP_RESOLVE',
      swapId,
      status: 'declined'
    });
  };

  // Criar Reclamação / Desabafo com Foto
  const handleCreateFeedback = (newFeedback) => {
    const updatedFeedbacks = [newFeedback, ...(appData.feedbacks || [])];
    const updatedData = { ...appData, feedbacks: updatedFeedbacks };
    setAppData(updatedData);

    // Envia evento em tempo real pelo canal do casal
    syncSaveData(updatedData, {
      type: 'FEEDBACK_CREATE',
      feedback: newFeedback
    });

    // Envia ao Supabase se configurado
    insertFeedbackSupabase({
      ...newFeedback,
      coupleCode: appData.coupleCode
    });
  };

  // Responder ou Resolver Reclamação
  const handleResolveFeedback = (feedbackId, updates) => {
    const updatedFeedbacks = (appData.feedbacks || []).map((f) => {
      if (f.id === feedbackId) {
        return { ...f, ...updates };
      }
      return f;
    });

    const updatedData = { ...appData, feedbacks: updatedFeedbacks };
    setAppData(updatedData);

    syncSaveData(updatedData, {
      type: 'FEEDBACK_RESOLVE',
      feedbackId,
      ...updates
    });

    // Atualiza no Supabase se configurado
    updateFeedbackSupabase(feedbackId, updates);
  };

  // Cancelar e Excluir Reclamação / Desabafo
  const handleCancelFeedback = (feedbackId) => {
    const updatedFeedbacks = (appData.feedbacks || []).filter((f) => f.id !== feedbackId);
    const updatedData = { ...appData, feedbacks: updatedFeedbacks };
    setAppData(updatedData);

    syncSaveData(updatedData, {
      type: 'FEEDBACK_CANCEL',
      feedbackId
    });

    deleteFeedbackSupabase(feedbackId);

    setActiveAttentionAlarm((currentAlarm) => {
      if (currentAlarm?.id === feedbackId) {
        stopAttentionAlarmLoop();
        return null;
      }
      return currentAlarm;
    });

    alert('Desabafo cancelado e excluído com sucesso!');
  };

  // Salvar Tarefa (Criar ou Editar)
  const handleSaveTask = (task) => {
    const exists = (appData.tasks || []).some((t) => t.id === task.id);
    let updatedTasks = [];

    if (exists) {
      updatedTasks = appData.tasks.map((t) => (t.id === task.id ? task : t));
    } else {
      updatedTasks = [...(appData.tasks || []), task];
    }

    // Regera a agenda semanal para incluir a tarefa imediatamente nos dias certos
    const result = generateWeeklySchedule({
      tasks: updatedTasks,
      availability: appData.availability,
      users: coupleUsers,
      history: appData.history,
      targetRatio: appData.targetRatio || { user1: 50, user2: 50 }
    });

    // Preserva tarefas que já foram concluídas na semana
    const completedMap = new Map();
    (appData.weeklySchedule || []).forEach((item) => {
      if (item.completed) {
        completedMap.set(`${item.taskId}_${item.date}`, {
          completed: true,
          completedAt: item.completedAt
        });
      }
    });

    const newSchedule = result.schedule.map((item) => {
      const done = completedMap.get(`${item.taskId}_${item.date}`);
      if (done) {
        return { ...item, completed: true, completedAt: done.completedAt };
      }
      return item;
    });

    const updatedData = {
      ...appData,
      tasks: updatedTasks,
      weeklySchedule: newSchedule
    };

    setAppData(updatedData);
    syncSaveData(updatedData);
  };

  // Excluir Tarefa
  const handleDeleteTask = (taskId) => {
    const updatedTasks = (appData.tasks || []).filter((t) => t.id !== taskId);
    const updatedSchedule = (appData.weeklySchedule || []).filter((item) => item.taskId !== taskId);

    const updatedData = {
      ...appData,
      tasks: updatedTasks,
      weeklySchedule: updatedSchedule
    };

    setAppData(updatedData);
    syncSaveData(updatedData);
  };

  // Regerar Divisão Semanal com Algoritmo Anti-Sobrecarga
  const handleRegenerateWeek = () => {
    const result = generateWeeklySchedule({
      tasks: appData.tasks,
      availability: appData.availability,
      users: appData.users,
      history: appData.history,
      targetRatio: appData.targetRatio || { user1: 50, user2: 50 }
    });

    const updatedData = {
      ...appData,
      weeklySchedule: result.schedule,
      history: {
        ...appData.history,
        lastWeekHeavyAssignment: result.heavyAssignments
      }
    };

    setAppData(updatedData);
    syncSaveData(updatedData);
  };

  // Salvar Disponibilidade
  const handleSaveAvailability = (newAvailability) => {
    const updatedData = { ...appData, availability: newAvailability };
    setAppData(updatedData);
    syncSaveData(updatedData);
  };

  // Salvar Código do Casal
  const handleUpdateCoupleCode = (newCode) => {
    const updatedData = { ...appData, coupleCode: newCode };
    setAppData(updatedData);
    syncSaveData(updatedData);
  };

  // Salvar Nomes dos Parceiros
  const handleUpdateUsers = (newUsers) => {
    const updatedData = { ...appData, users: newUsers };
    setAppData(updatedData);
    syncSaveData(updatedData);
  };

  // Salvar Meta de Divisão
  const handleUpdateTargetRatio = (newRatio) => {
    const updatedData = { ...appData, targetRatio: newRatio };
    setAppData(updatedData);
    syncSaveData(updatedData);
  };

  // Restaurar Padrões da Casa
  const handleResetToDefaults = () => {
    const defaults = getDefaultAppState();
    setAppData(defaults);
    syncSaveData(defaults);
    alert('Tarefas e rotina restauradas com sucesso para o padrão da casa! 🌿');
  };

  // Parar Alarme de Atenção Contínuo
  const handleStopAttentionAlarm = () => {
    stopAttentionAlarmLoop();
    setActiveAttentionAlarm(null);
  };

  // Testar Alarme de Atenção
  const handleTestAttentionAlarm = () => {
    startAttentionAlarmLoop();
    const other = (appData.users || []).find((u) => u.id !== activeUser.id);
    setActiveAttentionAlarm({
      title: '🚨 Teste de Alerta de Atenção da Casa',
      description: 'O som contínuo e a tela cheia estão ativos! O som só irá parar quando você clicar no botão abaixo.',
      fromUserName: other?.name || 'Seu Parceiro',
      severity: 'warning',
      createdAt: new Date().toISOString()
    });
  };

  // Se não estiver logado, exibe tela de login elegante
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // Contadores de badges individuais para quem está com o celular
  const pendingSwapsCount = (appData.swaps || []).filter(
    (s) => normalizeUserId(s.toUserId) === activeId && s.status === 'pending'
  ).length;

  const unreadFeedbacksCount = (appData.feedbacks || []).filter(
    (f) => normalizeUserId(f.toUserId) === activeId && f.status !== 'resolved'
  ).length;

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        activeUser={activeUser}
        users={coupleUsers}
        syncStatus={syncStatus}
        coupleCode={appData.coupleCode}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setActiveScreen('settings')}
        onLogout={handleLogout}
      />

      {/* Conteúdo Principal com as 8 Telas */}
      <main className="app-content">
        {activeScreen === 'today' && (
          <TodayScreen
            activeUser={activeUser}
            users={coupleUsers}
            schedule={appData.weeklySchedule}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onDelegateTask={handleDelegateTask}
            onPostponeTask={handlePostponeTask}
            onRequestSwap={(task) => {
              setActiveScreen('swaps');
            }}
          />
        )}

        {activeScreen === 'week' && (
          <WeekScreen
            users={coupleUsers}
            schedule={appData.weeklySchedule}
            onRegenerateWeek={handleRegenerateWeek}
            onUpdateTaskStatus={handleUpdateTaskStatus}
          />
        )}

        {activeScreen === 'balance' && (
          <BalanceScreen
            users={coupleUsers}
            schedule={appData.weeklySchedule}
            targetRatio={appData.targetRatio}
          />
        )}

        {activeScreen === 'tasks' && (
          <TasksScreen
            tasks={appData.tasks}
            users={coupleUsers}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeScreen === 'feedbacks' && (
          <FeedbackScreen
            activeUser={activeUser}
            users={coupleUsers}
            feedbacks={appData.feedbacks || []}
            availability={appData.availability}
            onCreateFeedback={handleCreateFeedback}
            onResolveFeedback={handleResolveFeedback}
            onCancelFeedback={handleCancelFeedback}
            onTestAlarm={handleTestAttentionAlarm}
          />
        )}

        {activeScreen === 'availability' && (
          <AvailabilityScreen
            users={coupleUsers}
            activeUser={activeUser}
            availability={appData.availability}
            onSaveAvailability={handleSaveAvailability}
            onRegenerateSchedule={handleRegenerateWeek}
          />
        )}

        {activeScreen === 'swaps' && (
          <SwapsScreen
            activeUser={activeUser}
            users={coupleUsers}
            swaps={appData.swaps}
            onAcceptSwap={handleAcceptSwap}
            onDeclineSwap={handleDeclineSwap}
            onCreateSwap={handleCreateSwap}
            schedule={appData.weeklySchedule}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsScreen
            users={coupleUsers}
            activeUser={activeUser}
            coupleCode={appData.coupleCode}
            targetRatio={appData.targetRatio}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onUpdateCoupleCode={handleUpdateCoupleCode}
            onUpdateUsers={handleUpdateUsers}
            onUpdateTargetRatio={handleUpdateTargetRatio}
            onResetToDefaults={handleResetToDefaults}
            syncStatus={syncStatus}
            onLogout={handleLogout}
            onTestAlarm={handleTestAttentionAlarm}
          />
        )}
      </main>

      {/* Navegação Inferior Ergonômica */}
      <BottomNav
        activeScreen={activeScreen}
        onChangeScreen={setActiveScreen}
        pendingSwapsCount={pendingSwapsCount}
        unreadFeedbacksCount={unreadFeedbacksCount}
      />

      {/* Alarme de Atenção / Urgência em Tela Cheia com Som Contínuo */}
      <AttentionAlarmModal
        alarmData={activeAttentionAlarm}
        onStop={handleStopAttentionAlarm}
      />
    </div>
  );
}
