// Motor de Divisão Automática e Equilíbrio Semanal — "Casa em Paz"
// Focado em EVITAR SOBRECARGA, respeitar disponibilidades e promover harmonia no casal.

import { DAYS_OF_WEEK, normalizeUserId } from '../constants/initialData.js';

/**
 * Calcula a pontuação de esforço de uma tarefa: tempo × desgaste
 */
export function calculateTaskEffort(task) {
  const duration = Number(task.durationMinutes) || 10;
  const effort = Number(task.effortLevel) || 1;
  return duration * effort;
}

/**
 * Retorna o início da semana atual (Domingo ou Segunda)
 */
export function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Domingo como início
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Formata data ISO simples YYYY-MM-DD
 */
export function formatDateKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Algoritmo Principal de Divisão Semanal Justa
 *
 * @param {Array} tasks - Lista de tarefas cadastradas
 * @param {Object} availability - Disponibilidade semanal dos usuários
 * @param {Array} users - Usuários do casal ['user1', 'user2']
 * @param {Object} history - Histórico recente (ex: quem fez tarefas pesadas na semana passada)
 * @param {Object} targetRatio - Proporção alvo (ex: { user1: 50, user2: 50 })
 * @param {Date} weekStartDate - Data de início da semana
 */
export function generateWeeklySchedule({
  tasks = [],
  availability = {},
  users = [],
  history = {},
  targetRatio = { user1: 50, user2: 50 },
  weekStartDate = getStartOfWeek()
}) {
  const u1 = users[0]?.id || 'user1';
  const u2 = users[1]?.id || 'user2';

  // Acumuladores de pontuação e tempo na semana para calibrar equilíbrio
  const stats = {
    [u1]: { points: 0, minutes: 0, heavyCount: 0 },
    [u2]: { points: 0, minutes: 0, heavyCount: 0 }
  };

  // Histórico de tarefas pesadas da semana anterior para garantir alternância
  const lastWeekHeavyAssignment = history.lastWeekHeavyAssignment || {};
  const currentWeekHeavyAssignment = {};

  const schedule = []; // Lista de instâncias agendadas da semana

  // Processamos para cada um dos 7 dias da semana
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDate = new Date(weekStartDate);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    const dayIndex = currentDate.getDay(); // 0 a 6
    const dateKey = formatDateKey(currentDate);

    // Identificar quais tarefas ocorrem neste dia da semana
    const dayTasks = tasks.filter((task) => {
      if (task.frequency === 'daily') return true;
      if (task.frequency === 'every_2_days') {
        // Alterna por dia da semana
        return dayIndex % 2 === 0;
      }
      if (task.frequency === '2x_week') {
        const preferred = task.preferredDays || [2, 5]; // Terça e Sexta por padrão
        return preferred.includes(dayIndex);
      }
      if (task.frequency === '1x_week') {
        const preferred = task.preferredDays || [6]; // Sábado por padrão
        return preferred.includes(dayIndex);
      }
      if (task.frequency === 'every_15_days') {
        // Sábado a cada 15 dias (baseado no número da semana do ano)
        const weekNum = Math.floor(currentDate.getDate() / 7);
        return dayIndex === 6 && weekNum % 2 === 0;
      }
      // Frequência Personalizada: de X em X dias
      if (task.frequency === 'custom_interval' || task.frequency === 'every_x_days') {
        const interval = Math.max(1, Number(task.customIntervalDays) || 3);
        const baseDate = task.startDate ? new Date(task.startDate) : new Date(2026, 0, 1);
        const curUtc = Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const baseUtc = Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
        const dayDiff = Math.round(Math.abs(curUtc - baseUtc) / (1000 * 60 * 60 * 24));
        return dayDiff % interval === 0;
      }
      // Frequência Personalizada: dia específico do mês
      if (task.frequency === 'monthly_day' || task.frequency === 'custom_month_day') {
        const targetDay = Math.min(31, Math.max(1, Number(task.customMonthDay) || 1));
        const dayOfMonth = currentDate.getDate();
        const daysInCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const effectiveDay = Math.min(targetDay, daysInCurrentMonth);
        return dayOfMonth === effectiveDay;
      }
      // Frequência Personalizada: Data Específica no Calendário (Uma única vez - não recorrente)
      if (task.frequency === 'once' || task.frequency === 'specific_date' || task.frequency === 'custom_date') {
        const targetDateKey = task.specificDate || task.date;
        return dateKey === targetDateKey;
      }
      return false;
    });

    // Ordenamos as tarefas do dia para agendar primeiro as pesadas, depois médias e leves
    const sortedDayTasks = [...dayTasks].sort((a, b) => b.effortLevel - a.effortLevel);

    for (const task of sortedDayTasks) {
      const taskEffort = calculateTaskEffort(task);
      const isHeavy = task.effortLevel === 3;
      const period = task.period || 'morning';

      // Checa disponibilidade no dia e período
      const u1Avail = availability[u1]?.[dayIndex] || { freeMinutes: 120, [period]: true };
      const u2Avail = availability[u2]?.[dayIndex] || { freeMinutes: 120, [period]: true };

      const u1Can = (u1Avail[period] ?? true) && u1Avail.freeMinutes >= task.durationMinutes;
      const u2Can = (u2Avail[period] ?? true) && u2Avail.freeMinutes >= task.durationMinutes;

      let assignedUser = null;

      // REGRA 4: SOBRECARGA
      // Se a tarefa está marcada como "sobrecarrega" alguém, priorizar alívio absoluto de forma determinística
      const overloadsU1 = (task.overloadsUsers || []).some((id) => normalizeUserId(id) === u1);
      const overloadsU2 = (task.overloadsUsers || []).some((id) => normalizeUserId(id) === u2);

      // REGRA 2: TAREFAS PESADAS (alternar sem repetir mesma pessoa em semanas seguidas)
      if (isHeavy) {
        const lastAssignee = normalizeUserId(lastWeekHeavyAssignment[task.id]);
        if (lastAssignee === u1 && u2Can) {
          assignedUser = u2;
        } else if (lastAssignee === u2 && u1Can) {
          assignedUser = u1;
        }
      }

      // Se não foi resolvida pela alternância pesada:
      // Alívio de sobrecarga direto e 100% determinístico (SEM Math.random para evitar alternância de cards)
      if (!assignedUser) {
        if (overloadsU2 && !overloadsU1) {
          assignedUser = u1Can ? u1 : (u2Can ? u2 : u1);
        } else if (overloadsU1 && !overloadsU2) {
          assignedUser = u2Can ? u2 : (u1Can ? u1 : u2);
        }
      }

      // Se ainda não escolheu, busca o equilíbrio conforme a meta (ratio) e disponibilidade
      if (!assignedUser) {
        if (u1Can && !u2Can) {
          assignedUser = u1;
        } else if (!u1Can && u2Can) {
          assignedUser = u2;
        } else {
          // Ambos podem: escolher quem está com menor proporção acumulada frente à meta
          const totalPointsSoFar = stats[u1].points + stats[u2].points || 1;
          const u1CurrentRatio = (stats[u1].points / totalPointsSoFar) * 100;
          const u1TargetRatio = targetRatio[u1] || 50;

          // REGRA 3: Compensar quem fez pesado recentemente
          const u1HeavyPenalty = stats[u1].heavyCount * 15;
          const u2HeavyPenalty = stats[u2].heavyCount * 15;

          if (u1CurrentRatio + u1HeavyPenalty > u1TargetRatio + u2HeavyPenalty) {
            assignedUser = u2;
          } else {
            assignedUser = u1;
          }
        }
      }

      // Fallback de segurança se nenhum puder
      if (!assignedUser) {
        assignedUser = stats[u1].points <= stats[u2].points ? u1 : u2;
      }

      // Atualiza estatísticas da semana
      stats[assignedUser].points += taskEffort;
      stats[assignedUser].minutes += task.durationMinutes;
      if (isHeavy) {
        stats[assignedUser].heavyCount += 1;
        currentWeekHeavyAssignment[task.id] = assignedUser;
      }

      // Ajuste inteligente: encontra o horário ideal para a tarefa dentro dos horários em que a pessoa ESTÁ EM CASA
      // (evita deixar disponível quando o usuário estiver no trabalho, dormindo ou em compromisso fora)
      const homeAdj = findBestHomeTimeForTask(task, assignedUser, availability, dayIndex);
      const effectiveTime = homeAdj.effectiveTime;

      // Cria a instância agendada com IDs seguros visíveis apenas internamente
      const safeTaskId = task.id || `task_${task.title ? task.title.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'item'}`;
      schedule.push({
        instanceId: `${safeTaskId}_${dateKey}`,
        taskId: safeTaskId,
        title: task.title,
        category: task.category,
        effortLevel: task.effortLevel,
        durationMinutes: task.durationMinutes,
        points: taskEffort,
        preferredTime: effectiveTime,
        originalPreferredTime: task.preferredTime || '09:00',
        homeReason: homeAdj.homeReason,
        isAdjustedForHome: homeAdj.isAdjustedForHome,
        homeWindowLabel: homeAdj.homeWindowLabel,
        period: task.period || 'morning',
        date: dateKey,
        dayOfWeek: dayIndex,
        assignedTo: assignedUser,
        completed: false,
        completedAt: null,
        overloadsUsers: task.overloadsUsers || [],
        isHeavy,
        frequency: task.frequency || 'daily',
        specificDate: task.specificDate || null,
        isOnce: task.frequency === 'once' || task.frequency === 'specific_date' || task.frequency === 'custom_date',
        description: task.description || ''
      });
    }
  }

  // Ordenação determinística estrita: por data ASC, depois horário preferido ASC, depois usuário, depois ID
  schedule.sort((a, b) => {
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

  return {
    weekStart: formatDateKey(weekStartDate),
    schedule,
    stats,
    heavyAssignments: currentWeekHeavyAssignment
  };
}

/**
 * Calcula o percentual de equilíbrio de esforço e tempo entre os dois parceiros
 */
export function calculateBalanceMetrics(schedule = [], users = []) {
  const u1 = users[0]?.id || 'user1';
  const u2 = users[1]?.id || 'user2';

  let u1Points = 0;
  let u2Points = 0;
  let u1Minutes = 0;
  let u2Minutes = 0;
  let u1CompletedPoints = 0;
  let u2CompletedPoints = 0;

  schedule.forEach((item) => {
    const pts = item.points || calculateTaskEffort(item);
    const mins = item.durationMinutes || 0;

    if (item.assignedTo === u1) {
      u1Points += pts;
      u1Minutes += mins;
      if (item.completed) u1CompletedPoints += pts;
    } else if (item.assignedTo === u2) {
      u2Points += pts;
      u2Minutes += mins;
      if (item.completed) u2CompletedPoints += pts;
    }
  });

  const totalPoints = u1Points + u2Points;
  const totalMinutes = u1Minutes + u2Minutes;

  const u1PointsPercent = totalPoints > 0 ? Math.round((u1Points / totalPoints) * 100) : 50;
  const u2PointsPercent = totalPoints > 0 ? 100 - u1PointsPercent : 50;

  const u1MinutesPercent = totalMinutes > 0 ? Math.round((u1Minutes / totalMinutes) * 100) : 50;
  const u2MinutesPercent = totalMinutes > 0 ? 100 - u1MinutesPercent : 50;

  // Mensagem amigável e acolhedora
  let friendlyMessage = '';
  const diff = Math.abs(u1PointsPercent - 50);

  if (diff <= 5) {
    friendlyMessage = `Esta semana está com um equilíbrio incrível: ${u1PointsPercent}% / ${u2PointsPercent}%. Vocês formam um time harmonioso! 💖`;
  } else if (diff <= 12) {
    friendlyMessage = `Equilíbrio muito saudável (${u1PointsPercent}% / ${u2PointsPercent}%). Ajustando com carinho as tarefas do dia a dia. 🌿`;
  } else {
    friendlyMessage = `Esta semana ficou em ${u1PointsPercent}% / ${u2PointsPercent}%. Lembrem-se que nas semanas de folga um compensa o outro naturalmente. ✨`;
  }

  return {
    totalPoints,
    totalMinutes,
    [u1]: {
      points: u1Points,
      minutes: u1Minutes,
      pointsPercent: u1PointsPercent,
      minutesPercent: u1MinutesPercent,
      completedPoints: u1CompletedPoints
    },
    [u2]: {
      points: u2Points,
      minutes: u2Minutes,
      pointsPercent: u2PointsPercent,
      minutesPercent: u2MinutesPercent,
      completedPoints: u2CompletedPoints
    },
    friendlyMessage
  };
}

/**
 * Retorna a configuração de horário de trabalho do usuário com defaults seguros
 */
export function getWorkSchedule(availability = {}, userId) {
  const defaultSchedule = {
    enabled: true,
    start: '08:00',
    end: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    days: [1, 2, 3, 4, 5] // Seg a Sex
  };

  if (!userId) return defaultSchedule;
  const userAvail = availability?.[userId];
  const custom = userAvail?.workSchedule;
  if (!custom) return defaultSchedule;

  return {
    enabled: custom.enabled ?? true,
    start: custom.start || '08:00',
    end: custom.end || '18:00',
    lunchStart: custom.lunchStart || '12:00',
    lunchEnd: custom.lunchEnd || '13:00',
    days: Array.isArray(custom.days) ? custom.days : [1, 2, 3, 4, 5]
  };
}

/**
 * Verifica se um usuário está em horário de trabalho agora
 * Considera: workSchedule personalizado (dias da semana, início, fim e almoço)
 */
export function isUserInWorkHours(availability = {}, userId) {
  if (!userId) return false;
  const now = new Date();
  const dayIndex = now.getDay(); // 0 = Dom, 1 = Seg ... 6 = Sab
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const userAvail = availability?.[userId];
  const workSchedule = userAvail?.workSchedule;

  if (workSchedule) {
    if (workSchedule.enabled === false) {
      return false; // Usuário marcou que não trabalha / está de folga
    }

    const workDays = Array.isArray(workSchedule.days) ? workSchedule.days : [1, 2, 3, 4, 5];
    if (!workDays.includes(dayIndex)) {
      return false; // Hoje não é dia de trabalho
    }

    const start = workSchedule.start || '08:00';
    const end = workSchedule.end || '18:00';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + (sm || 0);
    const endMin = eh * 60 + (em || 0);

    // Verifica intervalo de almoço
    if (workSchedule.lunchStart && workSchedule.lunchEnd) {
      const [lsh, lsm] = workSchedule.lunchStart.split(':').map(Number);
      const [leh, lem] = workSchedule.lunchEnd.split(':').map(Number);
      const lunchStartMin = lsh * 60 + (lsm || 0);
      const lunchEndMin = leh * 60 + (lem || 0);
      if (currentMinutes >= lunchStartMin && currentMinutes < lunchEndMin) {
        return false; // Está no intervalo de almoço = livre
      }
    }

    // Suporte a turnos noturnos que viram a meia-noite (ex: 22:00 às 06:00)
    if (endMin < startMin) {
      return currentMinutes >= startMin || currentMinutes < endMin;
    }

    return currentMinutes >= startMin && currentMinutes < endMin;
  }

  // Fallback padrão: Seg a Sex, 08:00 às 18:00
  if (dayIndex === 0 || dayIndex === 6) {
    return false;
  }
  return currentMinutes >= 480 && currentMinutes < 1080;
}

/**
 * Retorna a configuração de horário de sono/descanso do usuário com defaults seguros
 * (Hora que dorme e hora que acorda)
 */
export function getSleepSchedule(availability = {}, userId) {
  const defaultSchedule = {
    enabled: true,
    wakeTime: '07:00', // hora que acorda
    sleepTime: '23:00' // hora que dorme
  };

  if (!userId) return defaultSchedule;
  const userAvail = availability?.[userId];
  const custom = userAvail?.sleepSchedule;
  if (!custom) return defaultSchedule;

  return {
    enabled: custom.enabled ?? true,
    wakeTime: custom.wakeTime || '07:00',
    sleepTime: custom.sleepTime || '23:00'
  };
}

/**
 * Verifica se um determinado horário "HH:MM" cai dentro do intervalo de sono do usuário
 */
export function isTimeInSleepHours(timeStr, sleepSchedule) {
  if (!sleepSchedule || sleepSchedule.enabled === false || !timeStr) return false;
  const [h, m] = timeStr.split(':').map(Number);
  const targetMin = h * 60 + (m || 0);

  const [sh, sm] = (sleepSchedule.sleepTime || '23:00').split(':').map(Number);
  const [wh, wm] = (sleepSchedule.wakeTime || '07:00').split(':').map(Number);
  const sleepMin = sh * 60 + (sm || 0);
  const wakeMin = wh * 60 + (wm || 0);

  if (wakeMin < sleepMin) {
    // Dorme antes da meia-noite (ex: 23:00) e acorda depois (ex: 07:00)
    return targetMin >= sleepMin || targetMin < wakeMin;
  } else {
    // Turnos diurnos de sono (ex: dorme 08:00 e acorda 16:00)
    return targetMin >= sleepMin && targetMin < wakeMin;
  }
}

/**
 * Categorias de Horários Ocupados / Fora de Casa
 */
export const BUSY_CATEGORIES = [
  { id: 'gym', label: 'Academia / Treino', icon: '🏋️' },
  { id: 'shift', label: 'Plantão / Turno Extra', icon: '🏥' },
  { id: 'study', label: 'Faculdade / Curso', icon: '🎓' },
  { id: 'sports', label: 'Futebol / Esporte', icon: '⚽' },
  { id: 'traffic', label: 'Trânsito / Deslocamento', icon: '🚗' },
  { id: 'church', label: 'Igreja / Espiritual', icon: '⛪' },
  { id: 'other', label: 'Outro Compromisso', icon: '📌' }
];

/**
 * Retorna os horários ocupados / fora de casa cadastrados para o usuário
 */
export function getBusySlots(availability = {}, userId) {
  if (!userId) return [];
  const userAvail = availability?.[userId];
  return Array.isArray(userAvail?.busySlots) ? userAvail.busySlots : [];
}

/**
 * Verifica se um usuário está ocupado ou fora de casa no momento (Sono, Trabalho, Academia, Plantão, etc.)
 * e calcula o horário inteligente exato em que ele ficará livre + a margem de 20 minutos de respiro!
 *
 * @param {Object} availability
 * @param {string} userId
 * @param {number} bufferMinutes - Minutos adicionais após ficar livre (padrão: 20 min)
 */
export function isUserBusyOrAway(availability = {}, userId, bufferMinutes = 20, checkDate = new Date()) {
  if (!userId) {
    return {
      isBusy: false,
      reason: 'free',
      title: 'Livre / Em Casa',
      icon: '🟢',
      freeAt: null,
      alarmTriggerTimeStr: null,
      targetDate: null
    };
  }

  const now = checkDate instanceof Date ? checkDate : new Date();
  const dayIndex = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const sleepSchedule = getSleepSchedule(availability, userId);
  const workSchedule = getWorkSchedule(availability, userId);

  // 1. PRIORIDADE MÁXIMA: Horário de Sono / Descanso
  // Se o parceiro estiver dormindo, NUNCA tocar alarmes de madrugada!
  if (sleepSchedule.enabled !== false && isTimeInSleepHours(currentTimeStr, sleepSchedule)) {
    const [wh, wm] = (sleepSchedule.wakeTime || '07:00').split(':').map(Number);
    const wakeMin = wh * 60 + (wm || 0);
    const triggerMinutes = (wakeMin + bufferMinutes) % (24 * 60);
    const triggerH = String(Math.floor(triggerMinutes / 60)).padStart(2, '0');
    const triggerM = String(triggerMinutes % 60).padStart(2, '0');

    const [sh, sm] = (sleepSchedule.sleepTime || '23:00').split(':').map(Number);
    const sleepMin = sh * 60 + (sm || 0);

    const targetDate = new Date(now);
    // Se ainda está na noite anterior (ex: 23:30), acorda no dia seguinte
    if (currentMinutes >= sleepMin) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    targetDate.setHours(Math.floor(triggerMinutes / 60), triggerMinutes % 60, 0, 0);

    return {
      isBusy: true,
      reason: 'sleep',
      title: 'Dormindo / Horário de Sono',
      icon: '😴',
      start: sleepSchedule.sleepTime,
      end: sleepSchedule.wakeTime,
      freeAt: sleepSchedule.wakeTime,
      bufferMinutes,
      alarmTriggerTimeStr: `${triggerH}:${triggerM}`,
      targetDate
    };
  }

  // 2. Horário de Trabalho
  if (workSchedule.enabled !== false && (workSchedule.days || [1, 2, 3, 4, 5]).includes(dayIndex)) {
    const [sh, sm] = (workSchedule.start || '08:00').split(':').map(Number);
    const [eh, em] = (workSchedule.end || '18:00').split(':').map(Number);
    const startMin = sh * 60 + (sm || 0);
    const endMin = eh * 60 + (em || 0);

    let isAtWork = false;
    if (endMin < startMin) {
      isAtWork = currentMinutes >= startMin || currentMinutes < endMin;
    } else {
      isAtWork = currentMinutes >= startMin && currentMinutes < endMin;
    }

    // Se estiver no almoço, não está no foco do trabalho
    if (isAtWork && workSchedule.lunchStart && workSchedule.lunchEnd) {
      const [lsh, lsm] = workSchedule.lunchStart.split(':').map(Number);
      const [leh, lem] = workSchedule.lunchEnd.split(':').map(Number);
      const lunchStartMin = lsh * 60 + (lsm || 0);
      const lunchEndMin = leh * 60 + (lem || 0);
      if (currentMinutes >= lunchStartMin && currentMinutes < lunchEndMin) {
        isAtWork = false;
      }
    }

    if (isAtWork) {
      let triggerMinutes = (endMin + bufferMinutes) % (24 * 60);
      let triggerH = String(Math.floor(triggerMinutes / 60)).padStart(2, '0');
      let triggerM = String(triggerMinutes % 60).padStart(2, '0');

      let targetDate = new Date(now);
      if (endMin < currentMinutes) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      targetDate.setHours(Math.floor(triggerMinutes / 60), triggerMinutes % 60, 0, 0);

      // CÁLCULO INTELIGENTE: Se o horário de saída + 20min cair no horário de sono da pessoa,
      // adia inteligentemente para 20min após ela acordar no dia seguinte!
      if (sleepSchedule.enabled !== false && isTimeInSleepHours(`${triggerH}:${triggerM}`, sleepSchedule)) {
        const [wh, wm] = (sleepSchedule.wakeTime || '07:00').split(':').map(Number);
        const wakeMin = wh * 60 + (wm || 0);
        triggerMinutes = (wakeMin + bufferMinutes) % (24 * 60);
        triggerH = String(Math.floor(triggerMinutes / 60)).padStart(2, '0');
        triggerM = String(triggerMinutes % 60).padStart(2, '0');

        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(Math.floor(triggerMinutes / 60), triggerMinutes % 60, 0, 0);
      }

      return {
        isBusy: true,
        reason: 'work',
        title: 'No Trabalho / Expediente',
        icon: '💼',
        start: workSchedule.start,
        end: workSchedule.end,
        freeAt: workSchedule.end,
        bufferMinutes,
        alarmTriggerTimeStr: `${triggerH}:${triggerM}`,
        targetDate
      };
    }
  }

  // 3. Horários Ocupados / Fora de Casa (Academia, Plantão, Faculdade, etc.)
  const busySlots = getBusySlots(availability, userId);
  for (const slot of busySlots) {
    if (slot.enabled === false) continue;
    const days = Array.isArray(slot.days) ? slot.days : [0, 1, 2, 3, 4, 5, 6];
    if (!days.includes(dayIndex)) continue;

    const [sh, sm] = (slot.start || '19:00').split(':').map(Number);
    const [eh, em] = (slot.end || '20:30').split(':').map(Number);
    const startMin = sh * 60 + (sm || 0);
    const endMin = eh * 60 + (em || 0);

    let isSlotActive = false;
    if (endMin < startMin) {
      isSlotActive = currentMinutes >= startMin || currentMinutes < endMin;
    } else {
      isSlotActive = currentMinutes >= startMin && currentMinutes < endMin;
    }

    if (isSlotActive) {
      const cat = BUSY_CATEGORIES.find((c) => c.id === slot.category) || { icon: '📌', label: 'Compromisso' };
      let triggerMinutes = (endMin + bufferMinutes) % (24 * 60);
      let triggerH = String(Math.floor(triggerMinutes / 60)).padStart(2, '0');
      let triggerM = String(triggerMinutes % 60).padStart(2, '0');

      let targetDate = new Date(now);
      if (endMin < currentMinutes) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      targetDate.setHours(Math.floor(triggerMinutes / 60), triggerMinutes % 60, 0, 0);

      // CÁLCULO INTELIGENTE: Se o término do compromisso + 20min cair no sono, transfere para a manhã
      if (sleepSchedule.enabled !== false && isTimeInSleepHours(`${triggerH}:${triggerM}`, sleepSchedule)) {
        const [wh, wm] = (sleepSchedule.wakeTime || '07:00').split(':').map(Number);
        const wakeMin = wh * 60 + (wm || 0);
        triggerMinutes = (wakeMin + bufferMinutes) % (24 * 60);
        triggerH = String(Math.floor(triggerMinutes / 60)).padStart(2, '0');
        triggerM = String(triggerMinutes % 60).padStart(2, '0');

        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(Math.floor(triggerMinutes / 60), triggerMinutes % 60, 0, 0);
      }

      return {
        isBusy: true,
        reason: 'away',
        title: slot.title || cat.label,
        icon: cat.icon,
        category: slot.category,
        start: slot.start,
        end: slot.end,
        freeAt: slot.end,
        bufferMinutes,
        alarmTriggerTimeStr: `${triggerH}:${triggerM}`,
        targetDate
      };
    }
  }

  // 4. Usuário está Livre / Em Casa
  return {
    isBusy: false,
    reason: 'free',
    title: 'Livre / Em Casa',
    icon: '🟢',
    freeAt: null,
    alarmTriggerTimeStr: null,
    targetDate: null
  };
}

/**
 * Converte string 'HH:MM' para total de minutos desde 00:00 (0..1439)
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = String(timeStr).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converte minutos para string 'HH:MM'
 */
export function minutesToTime(totalMin) {
  const m = ((Math.round(totalMin) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function getHomeWindowLabel(startMin, endMin) {
  if (startMin < 720 && endMin <= 780) return 'Manhã em casa';
  if (startMin >= 720 && startMin < 1080) return 'Tarde em casa';
  return 'Noite em casa';
}

/**
 * Retorna os blocos de horário em que o usuário está EM CASA e acordado no dia da semana.
 * Desconta sono, trabalho (fora de casa) e compromissos cadastrados.
 */
export function getUserHomeWindows(availability = {}, userId, dayIndex) {
  const normId = normalizeUserId(userId);
  const sleepSchedule = getSleepSchedule(availability, normId);
  const workSchedule = getWorkSchedule(availability, normId);
  const busySlots = getBusySlots(availability, normId);
  const userAvail = availability?.[normId];
  const dayAvail = userAvail?.[dayIndex];

  // Matriz de 1440 minutos para marcar onde o usuário está em casa (1) ou fora/dormindo (0)
  const isHomeMinute = new Uint8Array(1440);
  isHomeMinute.fill(1);

  // 1. Sono / Descanso
  if (sleepSchedule.enabled !== false) {
    const sleepMin = timeToMinutes(sleepSchedule.sleepTime || '23:00');
    const wakeMin = timeToMinutes(sleepSchedule.wakeTime || '07:00');
    if (wakeMin < sleepMin) {
      for (let m = sleepMin; m < 1440; m++) isHomeMinute[m] = 0;
      for (let m = 0; m < wakeMin; m++) isHomeMinute[m] = 0;
    } else {
      for (let m = sleepMin; m < wakeMin; m++) isHomeMinute[m] = 0;
    }
  }

  // 2. Trabalho
  const workDays = Array.isArray(workSchedule.days) ? workSchedule.days : [1, 2, 3, 4, 5];
  if (workSchedule.enabled !== false && workDays.includes(dayIndex)) {
    const startMin = timeToMinutes(workSchedule.start || '08:00');
    const endMin = timeToMinutes(workSchedule.end || '18:00');
    // Buffer de 15 min de deslocamento para chegar em casa após o trabalho
    const effectiveArrival = (endMin + 15) % 1440;

    let lunchStartMin = -1;
    let lunchEndMin = -1;
    if (workSchedule.lunchStart && workSchedule.lunchEnd) {
      lunchStartMin = timeToMinutes(workSchedule.lunchStart);
      lunchEndMin = timeToMinutes(workSchedule.lunchEnd);
    }

    if (endMin < startMin) {
      for (let m = startMin; m < 1440; m++) isHomeMinute[m] = 0;
      for (let m = 0; m < effectiveArrival; m++) isHomeMinute[m] = 0;
    } else {
      for (let m = startMin; m < effectiveArrival && m < 1440; m++) {
        // Se tiver almoço em casa com mais de 30 min, libera esse intervalo como em casa
        if (lunchStartMin >= 0 && lunchEndMin >= 0 && m >= (lunchStartMin + 5) && m < (lunchEndMin - 5)) {
          continue;
        }
        isHomeMinute[m] = 0;
      }
    }
  }

  // 3. Compromissos e horários ocupados fora de casa (academia, etc)
  for (const slot of busySlots) {
    if (slot.enabled === false) continue;
    const slotDays = Array.isArray(slot.days) ? slot.days : [0, 1, 2, 3, 4, 5, 6];
    if (!slotDays.includes(dayIndex)) continue;

    const sMin = timeToMinutes(slot.start || '19:00');
    const eMin = timeToMinutes(slot.end || '20:30');
    const effEnd = (eMin + 15) % 1440;
    if (eMin < sMin) {
      for (let m = sMin; m < 1440; m++) isHomeMinute[m] = 0;
      for (let m = 0; m < effEnd; m++) isHomeMinute[m] = 0;
    } else {
      for (let m = sMin; m < effEnd && m < 1440; m++) isHomeMinute[m] = 0;
    }
  }

  // 4. Se o usuário marcou período específico ou desligou manhã/tarde/noite no dia
  if (dayAvail) {
    if (dayAvail.customMode === 'range' && dayAvail.startTime && dayAvail.endTime) {
      const rStart = timeToMinutes(dayAvail.startTime);
      const rEnd = timeToMinutes(dayAvail.endTime);
      for (let m = 0; m < 1440; m++) {
        const inRange = rEnd >= rStart ? (m >= rStart && m < rEnd) : (m >= rStart || m < rEnd);
        if (!inRange) isHomeMinute[m] = 0;
      }
    }
    if (dayAvail.morning === false) {
      for (let m = 360; m < 720; m++) isHomeMinute[m] = 0; // 06:00 - 12:00
    }
    if (dayAvail.afternoon === false) {
      for (let m = 720; m < 1080; m++) isHomeMinute[m] = 0; // 12:00 - 18:00
    }
    if (dayAvail.night === false) {
      for (let m = 1080; m < 1440; m++) isHomeMinute[m] = 0; // 18:00 - 24:00
    }
  }

  // Agrupa os minutos contínuos em janelas de tempo em casa
  const windows = [];
  let currentStart = null;

  for (let m = 0; m < 1440; m++) {
    if (isHomeMinute[m] === 1 && currentStart === null) {
      currentStart = m;
    } else if (isHomeMinute[m] === 0 && currentStart !== null) {
      const dur = m - currentStart;
      if (dur >= 10) {
        windows.push({
          startMin: currentStart,
          endMin: m,
          start: minutesToTime(currentStart),
          end: minutesToTime(m),
          durationMinutes: dur,
          label: getHomeWindowLabel(currentStart, m)
        });
      }
      currentStart = null;
    }
  }

  if (currentStart !== null) {
    const dur = 1440 - currentStart;
    if (dur >= 10) {
      windows.push({
        startMin: currentStart,
        endMin: 1440,
        start: minutesToTime(currentStart),
        end: '23:59',
        durationMinutes: dur,
        label: getHomeWindowLabel(currentStart, 1440)
      });
    }
  }

  return windows;
}

/**
 * Encontra o horário ideal para a tarefa dentro dos horários em que o usuário está EM CASA.
 */
export function findBestHomeTimeForTask(task, assignedUser, availability = {}, dayIndex) {
  const normId = normalizeUserId(assignedUser);
  const preferred = task.preferredTime || '09:00';
  const duration = Math.max(5, Number(task.durationMinutes) || 15);
  const prefMin = timeToMinutes(preferred);

  const homeWindows = getUserHomeWindows(availability, normId, dayIndex);

  // Se não tem nenhuma restrição ou janela detectada, usa o horário preferido original
  if (homeWindows.length === 0) {
    return {
      effectiveTime: preferred,
      homeReason: 'Horário padrão',
      isAdjustedForHome: false,
      homeWindowLabel: 'Em casa'
    };
  }

  // 1. Verifica se o horário preferido já cai em uma janela em casa com tempo suficiente
  const matchingWindow = homeWindows.find((w) => {
    return prefMin >= w.startMin && (prefMin + duration) <= w.endMin;
  });

  if (matchingWindow) {
    return {
      effectiveTime: preferred,
      homeReason: 'Usuário em casa no horário preferido',
      isAdjustedForHome: false,
      homeWindowLabel: matchingWindow.label
    };
  }

  // 2. O horário preferido cai quando a pessoa está fora (trabalho, academia, sono).
  // Ajustamos inteligentemente para o melhor momento em que ela ESTÁ EM CASA.
  const period = task.period || (prefMin < 720 ? 'morning' : prefMin < 1080 ? 'afternoon' : 'night');

  let chosenWindow = null;

  if (period === 'morning') {
    // Procura primeira janela na parte da manhã que caiba a tarefa
    chosenWindow = homeWindows.find((w) => w.startMin < 720 && w.durationMinutes >= duration);
  } else if (period === 'afternoon') {
    // Procura janela da tarde que caiba
    chosenWindow = homeWindows.find((w) => w.startMin >= 720 && w.startMin < 1080 && w.durationMinutes >= duration);
  } else if (period === 'night') {
    // Procura janela da noite
    chosenWindow = homeWindows.find((w) => w.startMin >= 1080 && w.durationMinutes >= duration);
  }

  // Se não encontrou janela específica do período (ex: trabalha o dia todo e a tarefa era da manhã),
  // pega a janela mais viável disponível em casa (normalmente ao chegar do trabalho à noite)
  if (!chosenWindow) {
    const viableWindows = homeWindows.filter((w) => w.durationMinutes >= duration);
    if (viableWindows.length > 0) {
      // Prefere a janela mais próxima após o término do trabalho / após prefMin
      const afterWindows = viableWindows.filter((w) => w.startMin >= prefMin);
      chosenWindow = afterWindows.length > 0 ? afterWindows[0] : viableWindows[0];
    } else {
      chosenWindow = [...homeWindows].sort((a, b) => b.durationMinutes - a.durationMinutes)[0];
    }
  }

  if (chosenWindow) {
    let suggestedMin = Math.max(chosenWindow.startMin, prefMin);
    if (suggestedMin + duration > chosenWindow.endMin) {
      suggestedMin = chosenWindow.startMin;
    }

    const effectiveTime = minutesToTime(suggestedMin);
    return {
      effectiveTime,
      homeReason: `Ajustado para quando estiver em casa (${chosenWindow.label})`,
      isAdjustedForHome: effectiveTime !== preferred,
      homeWindowLabel: chosenWindow.label
    };
  }

  return {
    effectiveTime: preferred,
    homeReason: 'Horário padrão',
    isAdjustedForHome: false,
    homeWindowLabel: 'Em casa'
  };
}

/**
 * Verifica o status de disponibilidade em tempo real da tarefa para o dia de hoje.
 * Retorna se está liberada para conclusão ou bloqueada aguardando o usuário chegar em casa.
 */
export function checkTaskAvailabilityNow({
  task,
  availability = {},
  unlockedEarlyTaskIds = [],
  userOverriddenHome = false,
  checkDate = new Date()
}) {
  if (!task) return { isAvailable: true, status: 'available', badgeText: 'Disponível', reasonTitle: 'Livre' };

  // Se o usuário liberou manualmente ("Já estou em casa")
  const isManuallyUnlocked = userOverriddenHome || (Array.isArray(unlockedEarlyTaskIds) && unlockedEarlyTaskIds.includes(task.instanceId));
  if (isManuallyUnlocked) {
    return {
      isAvailable: true,
      status: 'unlocked_manually',
      badgeText: 'Liberada (Em casa agora)',
      reasonTitle: 'Você liberou a tarefa antecipadamente'
    };
  }

  // Se a tarefa já está concluída, não precisa de bloqueio
  if (task.completed) {
    return {
      isAvailable: true,
      status: 'completed',
      badgeText: 'Concluída',
      reasonTitle: 'Tarefa já realizada'
    };
  }

  const assignedUser = normalizeUserId(task.assignedTo);
  const now = checkDate;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const taskMinutes = timeToMinutes(task.preferredTime || '09:00');

  // Verifica se o usuário responsável está ocupado agora (sono, trabalho, academia, etc.)
  const busyStatus = isUserBusyOrAway(availability, assignedUser, 15, now);

  if (busyStatus.isBusy) {
    const isWork = busyStatus.reason === 'work';
    const isSleep = busyStatus.reason === 'sleep';
    const isAway = busyStatus.reason === 'away';

    let label = '';
    if (isWork) {
      label = `Disponível às ${task.preferredTime || busyStatus.alarmTriggerTimeStr} (ao chegar do trabalho)`;
    } else if (isSleep) {
      label = `Disponível às ${task.preferredTime || busyStatus.alarmTriggerTimeStr} (ao acordar)`;
    } else if (isAway) {
      label = `Disponível às ${task.preferredTime || busyStatus.alarmTriggerTimeStr} (ao voltar para casa)`;
    } else {
      label = `Disponível às ${task.preferredTime || busyStatus.alarmTriggerTimeStr}`;
    }

    return {
      isAvailable: false,
      status: busyStatus.reason,
      busyInfo: busyStatus,
      badgeText: label,
      reasonTitle: `${busyStatus.icon} ${busyStatus.title}`,
      availableAtTime: task.preferredTime || busyStatus.alarmTriggerTimeStr
    };
  }

  return {
    isAvailable: true,
    status: 'available',
    badgeText: 'Disponível agora',
    reasonTitle: 'Livre em casa',
    availableAtTime: task.preferredTime
  };
}

