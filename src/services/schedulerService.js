// Motor de Divisão Automática e Equilíbrio Semanal — "Casa em Paz"
// Focado em EVITAR SOBRECARGA, respeitar disponibilidades e promover harmonia no casal.

import { DAYS_OF_WEEK } from '../constants/initialData';

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
      // Se a tarefa está marcada como "sobrecarrega" alguém, priorizar alívio absoluto
      const overloadsU1 = (task.overloadsUsers || []).includes(u1);
      const overloadsU2 = (task.overloadsUsers || []).includes(u2);

      // REGRA 2: TAREFAS PESADAS (alternar sem repetir mesma pessoa em semanas seguidas)
      if (isHeavy) {
        const lastAssignee = lastWeekHeavyAssignment[task.id];
        if (lastAssignee === u1 && u2Can) {
          assignedUser = u2;
        } else if (lastAssignee === u2 && u1Can) {
          assignedUser = u1;
        }
      }

      // Se não foi resolvida pela alternância pesada:
      if (!assignedUser) {
        if (overloadsU2 && !overloadsU1 && u1Can) {
          // Kassandra se sobrecarrega com essa tarefa: 85% de probabilidade de ir para Eu
          assignedUser = Math.random() < 0.85 ? u1 : (u2Can ? u2 : u1);
        } else if (overloadsU1 && !overloadsU2 && u2Can) {
          // Eu me sobrecarrego: 85% de ir para Kassandra
          assignedUser = Math.random() < 0.85 ? u2 : (u1Can ? u1 : u2);
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

      // Cria a instância agendada
      schedule.push({
        instanceId: `${task.id}_${dateKey}`,
        taskId: task.id,
        title: task.title,
        category: task.category,
        effortLevel: task.effortLevel,
        durationMinutes: task.durationMinutes,
        points: taskEffort,
        preferredTime: task.preferredTime || '09:00',
        period: task.period || 'morning',
        date: dateKey,
        dayOfWeek: dayIndex,
        assignedTo: assignedUser,
        completed: false,
        completedAt: null,
        overloadsUsers: task.overloadsUsers || [],
        isHeavy,
        description: task.description || ''
      });
    }
  }

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
