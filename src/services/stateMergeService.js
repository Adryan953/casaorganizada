// Serviço de Fusão Inteligente e Sincronização Segura de Estado (StateMergeService)
// Garante que 100% das configurações do casal (horários de trabalho, sono, academia, tarefas, divisão e nomes)
// sejam preservadas no banco de dados e NUNCA sejam sobrescritas por snapshots antigos ou incompletos de outro celular.

import {
  DEFAULT_USERS,
  INITIAL_TASKS,
  INITIAL_AVAILABILITY,
  normalizeUserId
} from '../constants/initialData';

export const DEFAULT_COUPLE_CODE = 'CASAL-PAZ';

/**
 * Mescla de forma inteligente e profunda dois estados da aplicação (ex: local vs nuvem ou parceiro A vs parceiro B)
 * Regra: Nenhuma configuração válida de nenhum dos parceiros pode ser descartada ou resetada.
 */
export function mergeAppState(localState, remoteState) {
  if (!remoteState) return localState || {};
  if (!localState) return remoteState;

  // 1. Código do Casal
  const coupleCode = (remoteState.coupleCode || localState.coupleCode || DEFAULT_COUPLE_CODE).toUpperCase().trim();

  // 2. Nomes e Perfis dos Parceiros (Adryan e Kah)
  const users = DEFAULT_USERS.map((def) => {
    const localU = (localState.users || []).find((u) => normalizeUserId(u.id || u.username) === def.id);
    const remoteU = (remoteState.users || []).find((u) => normalizeUserId(u.id || u.username) === def.id);

    // Se qualquer um dos lados personalizou o nome (diferente do id e do padrão), preserva
    let name = def.name;
    if (remoteU?.name && remoteU.name !== def.id && remoteU.name !== def.name) {
      name = remoteU.name;
    } else if (localU?.name && localU.name !== def.id && localU.name !== def.name) {
      name = localU.name;
    } else if (remoteU?.name) {
      name = remoteU.name;
    } else if (localU?.name) {
      name = localU.name;
    }

    return {
      ...def,
      name,
      avatar: remoteU?.avatar || localU?.avatar || def.avatar,
      color: remoteU?.color || localU?.color || def.color,
      role: remoteU?.role || localU?.role || def.role
    };
  });

  // 3. Disponibilidade Profunda por Usuário (workSchedule, sleepSchedule, busySlots e dias 0..6)
  const availability = {};
  ['adryan', 'kah'].forEach((userId) => {
    const baseAvail = INITIAL_AVAILABILITY[userId] || {};
    const localUser = localState.availability?.[userId] || {};
    const remoteUser = remoteState.availability?.[userId] || {};

    // 3a. Horário de Trabalho (workSchedule)
    const localWork = localUser.workSchedule;
    const remoteWork = remoteUser.workSchedule;
    const baseWork = baseAvail.workSchedule || {
      enabled: true,
      start: userId === 'kah' ? '12:00' : '08:00',
      end: userId === 'kah' ? '21:20' : '18:00',
      lunchStart: userId === 'kah' ? '14:10' : '12:00',
      lunchEnd: userId === 'kah' ? '16:10' : '13:00',
      days: userId === 'kah' ? [0, 1, 2, 3, 4, 6] : [1, 2, 3, 4, 5]
    };

    let mergedWork = { ...baseWork };
    if (remoteWork) {
      mergedWork = { ...mergedWork, ...remoteWork };
    }
    if (localWork) {
      // Se local tem dados mais detalhados ou configurados
      mergedWork = { ...mergedWork, ...localWork };
      if (Array.isArray(localWork.days) && localWork.days.length > 0) {
        mergedWork.days = localWork.days;
      } else if (Array.isArray(remoteWork?.days) && remoteWork.days.length > 0) {
        mergedWork.days = remoteWork.days;
      }
    } else if (Array.isArray(remoteWork?.days) && remoteWork.days.length > 0) {
      mergedWork.days = remoteWork.days;
    }

    // 3b. Horário de Sono e Descanso (sleepSchedule)
    const localSleep = localUser.sleepSchedule;
    const remoteSleep = remoteUser.sleepSchedule;
    const baseSleep = baseAvail.sleepSchedule || {
      enabled: true,
      wakeTime: userId === 'adryan' ? '07:20' : '08:00',
      sleepTime: userId === 'adryan' ? '23:00' : '00:00'
    };

    let mergedSleep = { ...baseSleep };
    if (remoteSleep) {
      mergedSleep = { ...mergedSleep, ...remoteSleep };
    }
    if (localSleep) {
      mergedSleep = { ...mergedSleep, ...localSleep };
    }

    // 3c. Horários Ocupados / Fora de Casa (busySlots: academia, plantão, faculdade)
    const localSlots = Array.isArray(localUser.busySlots) ? localUser.busySlots : [];
    const remoteSlots = Array.isArray(remoteUser.busySlots) ? remoteUser.busySlots : [];
    const slotMap = new Map();

    remoteSlots.forEach((slot) => {
      if (slot && slot.id) slotMap.set(slot.id, slot);
    });
    localSlots.forEach((slot) => {
      if (slot && slot.id) {
        const existing = slotMap.get(slot.id);
        slotMap.set(slot.id, { ...(existing || {}), ...slot });
      }
    });
    const mergedBusySlots = Array.from(slotMap.values());

    // 3d. Disponibilidade Personalizada dos Dias da Semana (0 = Domingo a 6 = Sábado)
    const mergedDays = {};
    for (let day = 0; day <= 6; day++) {
      const baseDay = baseAvail[day] || {
        type: 'normal',
        freeMinutes: 120,
        morning: true,
        afternoon: false,
        night: true
      };
      const localDay = localUser[day];
      const remoteDay = remoteUser[day];

      let chosenDay = { ...baseDay };
      if (remoteDay) {
        chosenDay = { ...chosenDay, ...remoteDay };
      }
      if (localDay) {
        // Se local for custom, mantém os horários personalizados
        if (localDay.type === 'custom') {
          chosenDay = { ...chosenDay, ...localDay };
        } else if (remoteDay?.type === 'custom') {
          chosenDay = { ...chosenDay, ...remoteDay };
        } else {
          chosenDay = { ...chosenDay, ...localDay };
        }
      }
      mergedDays[day] = chosenDay;
    }

    availability[userId] = {
      ...mergedDays,
      workSchedule: mergedWork,
      sleepSchedule: mergedSleep,
      busySlots: mergedBusySlots
    };
  });

  // 4. Lista de Tarefas (União Segura por ID e Respeito a Deleções)
  const deletedTaskIds = new Set([
    ...(Array.isArray(localState.deletedTaskIds) ? localState.deletedTaskIds : []),
    ...(Array.isArray(remoteState.deletedTaskIds) ? remoteState.deletedTaskIds : [])
  ]);

  const taskMap = new Map();
  // 4a. Tarefas remotas
  (remoteState.tasks || []).forEach((t) => {
    if (t && t.id && !deletedTaskIds.has(t.id)) {
      taskMap.set(t.id, t);
    }
  });
  // 4b. Tarefas locais
  (localState.tasks || []).forEach((t) => {
    if (t && t.id && !deletedTaskIds.has(t.id)) {
      const existing = taskMap.get(t.id);
      taskMap.set(t.id, { ...(existing || {}), ...t });
    }
  });

  // Se nenhuma tarefa existir após mesclagem, usa padrões
  let tasks = Array.from(taskMap.values());
  if (tasks.length === 0 && deletedTaskIds.size === 0) {
    tasks = [...INITIAL_TASKS];
  }

  // Garante ordenação estável por ID para evitar embaralhamento dos cards a cada sync
  tasks = tasks.sort((a, b) => String(a.id).localeCompare(String(b.id)));

  // 5. Meta de Divisão (targetRatio)
  const targetRatio = remoteState.targetRatio || localState.targetRatio || { user1: 50, user2: 50 };

  // 6. Agenda Semanal (weeklySchedule) - preserva tarefas concluídas
  const schedMap = new Map();
  (remoteState.weeklySchedule || []).forEach((item) => {
    if (item && item.instanceId) {
      schedMap.set(item.instanceId, item);
    }
  });
  (localState.weeklySchedule || []).forEach((item) => {
    if (item && item.instanceId) {
      const remoteItem = schedMap.get(item.instanceId);
      if (remoteItem) {
        const completed = Boolean(item.completed || remoteItem.completed);
        const completedAt = (item.completed ? item.completedAt : null) || (remoteItem.completed ? remoteItem.completedAt : null);
        schedMap.set(item.instanceId, {
          ...remoteItem,
          ...item,
          completed,
          completedAt
        });
      } else {
        schedMap.set(item.instanceId, item);
      }
    }
  });
  // Ordena estavelmente por data ASC, horário ASC, usuário ASC e ID ASC para garantir consistência total dos cards
  const weeklySchedule = Array.from(schedMap.values())
    .sort((a, b) => {
      const dateCmp = String(a.date || '').localeCompare(String(b.date || ''));
      if (dateCmp !== 0) return dateCmp;
      const timeA = a.preferredTime || '09:00';
      const timeB = b.preferredTime || '09:00';
      const timeCmp = timeA.localeCompare(timeB);
      if (timeCmp !== 0) return timeCmp;
      const userCmp = String(a.assignedTo || '').localeCompare(String(b.assignedTo || ''));
      if (userCmp !== 0) return userCmp;
      return String(a.taskId || a.instanceId || '').localeCompare(String(b.taskId || b.instanceId || ''));
    });

  // 7. Trocas e Feedbacks
  const swapMap = new Map();
  (remoteState.swaps || []).forEach((s) => s?.id && swapMap.set(s.id, s));
  (localState.swaps || []).forEach((s) => {
    if (s?.id) {
      const existing = swapMap.get(s.id);
      swapMap.set(s.id, { ...(existing || {}), ...s });
    }
  });

  // IDs de feedbacks explicitamente deletados (evita que o feedback volte após ser apagado)
  const deletedFeedbackIds = new Set([
    ...(Array.isArray(localState.deletedFeedbackIds) ? localState.deletedFeedbackIds : []),
    ...(Array.isArray(remoteState.deletedFeedbackIds) ? remoteState.deletedFeedbackIds : [])
  ]);

  const fbMap = new Map();
  (remoteState.feedbacks || []).forEach((f) => {
    if (f?.id && !deletedFeedbackIds.has(f.id)) fbMap.set(f.id, f);
  });
  (localState.feedbacks || []).forEach((f) => {
    if (f?.id && !deletedFeedbackIds.has(f.id)) {
      const existing = fbMap.get(f.id);
      fbMap.set(f.id, { ...(existing || {}), ...f });
    }
  });

  return {
    coupleCode,
    users,
    tasks,
    deletedTaskIds: Array.from(deletedTaskIds),
    deletedFeedbackIds: Array.from(deletedFeedbackIds),
    availability,
    weeklySchedule,
    targetRatio,
    swaps: Array.from(swapMap.values()),
    feedbacks: Array.from(fbMap.values()),
    history: {
      ...(remoteState.history || {}),
      ...(localState.history || {})
    },
    updatedAt: new Date().toISOString()
  };
}
