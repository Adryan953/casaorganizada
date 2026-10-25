import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { TodayScreen } from './screens/TodayScreen';
import { WeekScreen } from './screens/WeekScreen';
import { BalanceScreen } from './screens/BalanceScreen';
import { TasksScreen } from './screens/TasksScreen';
import { AvailabilityScreen } from './screens/AvailabilityScreen';
import { SwapsScreen } from './screens/SwapsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import {
  loadLocalData,
  subscribeToCouple,
  syncSaveData,
  getActiveUserId,
  setActiveUserId,
  getDefaultAppState
} from './services/storageService';
import { generateWeeklySchedule, formatDateKey } from './services/schedulerService';
import { triggerNotification } from './services/notificationService';

export default function App() {
  const [appData, setAppData] = useState(() => loadLocalData());
  const [activeUserId, setActiveUser] = useState(() => getActiveUserId());
  const [activeScreen, setActiveScreen] = useState('today');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('casa_em_paz_theme') || 'light';
  });
  const [syncStatus, setSyncStatus] = useState({ online: false, reason: 'init' });

  // Aplica o tema visual no elemento HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('casa_em_paz_theme', theme);
  }, [theme]);

  // Sincronização em tempo real (Firebase / Local)
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

  // Checagem de lembretes no horário (a cada minuto)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayKey = formatDateKey(now);

      const matchingTasks = (appData.weeklySchedule || []).filter(
        (t) =>
          t.date === todayKey &&
          t.assignedTo === activeUserId &&
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
  }, [appData.weeklySchedule, activeUserId]);

  const activeUser =
    (appData.users || []).find((u) => u.id === activeUserId) || appData.users[0];

  // Alterna usuário ativo no aparelho
  const handleSwitchUser = (userId) => {
    setActiveUser(userId);
    setActiveUserId(userId);
  };

  // Alternar Modo Claro / Escuro
  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Atualizar Status da Tarefa (Concluída ou Aberta)
  const handleUpdateTaskStatus = (instanceId, completed) => {
    const updatedSchedule = (appData.weeklySchedule || []).map((item) => {
      if (item.instanceId === instanceId) {
        return {
          ...item,
          completed,
          completedAt: completed ? new Date().toISOString() : null
        };
      }
      return item;
    });

    const updatedData = { ...appData, weeklySchedule: updatedSchedule };
    setAppData(updatedData);
    syncSaveData(updatedData);
  };

  // Passar Tarefa para o Parceiro (com carinho)
  const handleDelegateTask = (instanceId, toUserId) => {
    const partner = (appData.users || []).find((u) => u.id === toUserId);
    const updatedSchedule = (appData.weeklySchedule || []).map((item) => {
      if (item.instanceId === instanceId) {
        return {
          ...item,
          assignedTo: toUserId
        };
      }
      return item;
    });

    const updatedData = { ...appData, weeklySchedule: updatedSchedule };
    setAppData(updatedData);
    syncSaveData(updatedData);

    alert(`Tarefa passada com amor para ${partner?.name || 'seu parceiro'}! 💖`);
  };

  // Adiar Tarefa para Amanhã (sem culpa)
  const handlePostponeTask = (instanceId) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = formatDateKey(tomorrow);

    const updatedSchedule = (appData.weeklySchedule || []).map((item) => {
      if (item.instanceId === instanceId) {
        return {
          ...item,
          date: tomorrowKey,
          instanceId: `${item.taskId}_${tomorrowKey}`
        };
      }
      return item;
    });

    const updatedData = { ...appData, weeklySchedule: updatedSchedule };
    setAppData(updatedData);
    syncSaveData(updatedData);

    alert('Tarefa transferida para amanhã com tranquilidade! Descanse hoje. ✨');
  };

  // Criar Pedido de Troca
  const handleCreateSwap = (newSwap) => {
    const updatedSwaps = [newSwap, ...(appData.swaps || [])];
    const updatedData = { ...appData, swaps: updatedSwaps };
    setAppData(updatedData);
    syncSaveData(updatedData);
    alert('Pedido de troca enviado com sucesso! 🤝');
  };

  // Aceitar Troca
  const handleAcceptSwap = (swap) => {
    // Transfere a tarefa para quem aceitou
    const updatedSchedule = (appData.weeklySchedule || []).map((item) => {
      if (item.instanceId === swap.taskInstanceId) {
        return {
          ...item,
          assignedTo: swap.toUserId
        };
      }
      return item;
    });

    // Atualiza status do pedido
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
    syncSaveData(updatedData);
    alert('Troca aceita! A tarefa agora está na sua lista com muito carinho. 💖');
  };

  // Recusar Troca com Gentileza
  const handleDeclineSwap = (swapId) => {
    const updatedSwaps = (appData.swaps || []).map((s) => {
      if (s.id === swapId) {
        return { ...s, status: 'declined', resolvedAt: new Date().toISOString() };
      }
      return s;
    });

    const updatedData = { ...appData, swaps: updatedSwaps };
    setAppData(updatedData);
    syncSaveData(updatedData);
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

  // Salvar Código do Casal (Conectar a outro código)
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

  // Contagem de trocas pendentes para o badge
  const pendingSwapsCount = (appData.swaps || []).filter(
    (s) => s.toUserId === activeUserId && s.status === 'pending'
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
      />

      {/* Conteúdo Principal com as 7 Telas */}
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

        {activeScreen === 'availability' && (
          <AvailabilityScreen
            users={appData.users}
            activeUser={activeUser}
            availability={appData.availability}
            onSaveAvailability={handleSaveAvailability}
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
          />
        )}
      </main>

      {/* Navegação Inferior Ergonômica */}
      <BottomNav
        activeScreen={activeScreen}
        onChangeScreen={setActiveScreen}
        pendingSwapsCount={pendingSwapsCount}
      />
    </div>
  );
}
