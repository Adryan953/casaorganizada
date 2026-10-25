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
import { generateWeeklySchedule, formatDateKey } from './services/schedulerService';
import { triggerNotification, playChimeSound } from './services/notificationService';
import { getCurrentAuthUser, logout } from './services/authService';
import {
  insertFeedbackSupabase,
  updateFeedbackSupabase,
  initSupabase,
  fetchFeedbacksSupabase,
  subscribeToSupabaseFeedbacks
} from './services/supabaseService';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentAuthUser());
  const [appData, setAppData] = useState(() => loadLocalData());
  const [activeScreen, setActiveScreen] = useState('today');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('casa_em_paz_theme') || 'light';
  });
  const [syncStatus, setSyncStatus] = useState({ online: true, reason: 'connecting', mode: 'realtime' });

  // Inicializa Supabase e sincroniza feedbacks do banco
  useEffect(() => {
    initSupabase();

    // Carrega feedbacks salvos na nuvem
    fetchFeedbacksSupabase(appData.coupleCode).then((cloudFeedbacks) => {
      if (cloudFeedbacks && cloudFeedbacks.length > 0) {
        setAppData((prev) => {
          const existingIds = new Set((prev.feedbacks || []).map((f) => f.id));
          const toAdd = cloudFeedbacks.filter((cf) => !existingIds.has(cf.id));
          if (toAdd.length === 0) return prev;
          return { ...prev, feedbacks: [...toAdd, ...(prev.feedbacks || [])] };
        });
      }
    });

    // Escuta novos feedbacks em tempo real via Supabase Realtime
    const unsubFeedbacks = subscribeToSupabaseFeedbacks(appData.coupleCode, ({ eventType, feedback }) => {
      if (!feedback) return;
      setAppData((prev) => {
        let updatedList = [...(prev.feedbacks || [])];
        if (eventType === 'INSERT') {
          if (!updatedList.some((f) => f.id === feedback.id)) {
            updatedList = [feedback, ...updatedList];
            try { playChimeSound(); } catch (e) {}
          }
        } else if (eventType === 'UPDATE') {
          updatedList = updatedList.map((f) => (f.id === feedback.id ? { ...f, ...feedback } : f));
        }
        return { ...prev, feedbacks: updatedList };
      });
    });

    return () => {
      if (unsubFeedbacks) unsubFeedbacks();
    };
  }, [appData.coupleCode]);

  // Aplica o tema visual no elemento HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('casa_em_paz_theme', theme);
  }, [theme]);

  // Sincronização em tempo real (WebSocket + Nuvem)
  useEffect(() => {
    const unsubscribe = subscribeToCouple(
      appData.coupleCode,
      (remoteData) => {
        if (remoteData) {
          setAppData(remoteData);
        }
      },
      (status) => {
        setSyncStatus(status);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [appData.coupleCode]);

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
    };

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [appData.weeklySchedule, currentUser]);

  const activeUser =
    (appData.users || []).find((u) => u.id === (currentUser?.id || getActiveUserId())) || appData.users[0];

  // Alterna usuário ativo no aparelho
  const handleSwitchUser = (userId) => {
    const targetUser = (appData.users || []).find((u) => u.id === userId);
    if (targetUser) {
      setCurrentUser(targetUser);
      setActiveUserId(userId);
    }
  };

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

  // Salvar Tarefa (Criar ou Editar)
  const handleSaveTask = (task) => {
    const exists = (appData.tasks || []).some((t) => t.id === task.id);
    let updatedTasks = [];

    if (exists) {
      updatedTasks = appData.tasks.map((t) => (t.id === task.id ? task : t));
    } else {
      updatedTasks = [...(appData.tasks || []), task];
    }

    const updatedData = { ...appData, tasks: updatedTasks };
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

  // Se não estiver logado, exibe tela de login elegante
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // Contadores de badges
  const pendingSwapsCount = (appData.swaps || []).filter(
    (s) => s.toUserId === activeUser.id && s.status === 'pending'
  ).length;

  const unreadFeedbacksCount = (appData.feedbacks || []).filter(
    (f) => f.toUserId === activeUser.id && f.status !== 'resolved'
  ).length;

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        activeUser={activeUser}
        users={appData.users}
        onSwitchUser={handleSwitchUser}
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
            users={appData.users}
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
            users={appData.users}
            schedule={appData.weeklySchedule}
            onRegenerateWeek={handleRegenerateWeek}
            onUpdateTaskStatus={handleUpdateTaskStatus}
          />
        )}

        {activeScreen === 'balance' && (
          <BalanceScreen
            users={appData.users}
            schedule={appData.weeklySchedule}
            targetRatio={appData.targetRatio}
          />
        )}

        {activeScreen === 'tasks' && (
          <TasksScreen
            tasks={appData.tasks}
            users={appData.users}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeScreen === 'feedbacks' && (
          <FeedbackScreen
            activeUser={activeUser}
            users={appData.users}
            feedbacks={appData.feedbacks || []}
            onCreateFeedback={handleCreateFeedback}
            onResolveFeedback={handleResolveFeedback}
          />
        )}

        {activeScreen === 'availability' && (
          <AvailabilityScreen
            users={appData.users}
            activeUser={activeUser}
            availability={appData.availability}
            onSaveAvailability={handleSaveAvailability}
            onRegenerateSchedule={handleRegenerateWeek}
          />
        )}

        {activeScreen === 'swaps' && (
          <SwapsScreen
            activeUser={activeUser}
            users={appData.users}
            swaps={appData.swaps}
            onAcceptSwap={handleAcceptSwap}
            onDeclineSwap={handleDeclineSwap}
            onCreateSwap={handleCreateSwap}
            schedule={appData.weeklySchedule}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsScreen
            users={appData.users}
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
    </div>
  );
}
