// Dados Padrão Iniciais do Aplicativo "Casa em Paz"
// Configurado com base na rotina real da casa (2 quartos, sala, cozinha, quintal com plantas e gatos)

// Função auxiliar para garantir normalização de identificadores (Kah vs Adryan)
export function normalizeUserId(val) {
  if (!val) return 'adryan';
  const s = String(val).trim().toLowerCase();
  if (s === 'kah' || s === 'user2' || s === 'kassandra' || s.includes('kah')) {
    return 'kah';
  }
  return 'adryan';
}

export const DEFAULT_USERS = [
  {
    id: 'adryan',
    username: 'Adryan',
    name: 'Adryan',
    avatar: '🧔‍♂️',
    color: '#3b82f6', // Azul acolhedor
    role: 'Parceiro'
  },
  {
    id: 'kah',
    username: 'Kah',
    name: 'Kah',
    avatar: '👩‍🦰',
    color: '#ec4899', // Rosa afeto
    role: 'Parceira'
  }
];

export const VALID_CREDENTIALS = [
  {
    id: 'adryan',
    username: 'Adryan',
    password: 'Adryan123',
    name: 'Adryan',
    avatar: '🧔‍♂️',
    color: '#3b82f6'
  },
  {
    id: 'kah',
    username: 'Kah',
    password: 'Kah123',
    name: 'Kah',
    avatar: '👩‍🦰',
    color: '#ec4899'
  }
];

export const EFFORT_LEVELS = {
  1: { level: 1, label: 'Leve', multiplier: 1, color: '#10b981', icon: '🌱' },
  2: { level: 2, label: 'Médio', multiplier: 2, color: '#f59e0b', icon: '⚡' },
  3: { level: 3, label: 'Pesado', multiplier: 3, color: '#ef4444', icon: '🔥' }
};

export const CATEGORIES = [
  { id: 'gatos', label: 'Gatos', icon: '🐾', color: '#f97316' },
  { id: 'cozinha', label: 'Cozinha', icon: '🍳', color: '#06b6d4' },
  { id: 'plantas', label: 'Quintal e Plantas', icon: '🌿', color: '#10b981' },
  { id: 'limpeza', label: 'Limpeza Geral', icon: '🧹', color: '#8b5cf6' },
  { id: 'banheiro', label: 'Banheiro', icon: '🚿', color: '#3b82f6' },
  { id: 'roupas', label: 'Lavanderia', icon: '🧺', color: '#ec4899' }
];

export const INITIAL_TASKS = [
  {
    id: 'racao-gatos-manha',
    title: 'Ração dos gatos (Manhã)',
    category: 'gatos',
    frequency: 'daily',
    timesPerDay: 3,
    period: 'morning',
    preferredTime: '07:30',
    durationMinutes: 5,
    effortLevel: 1, // Leve
    overloadsUsers: ['kah'], // Kah marcou como sobrecarga
    description: 'Servir ração fresca e trocar a água das tigelas dos gatinhos.'
  },
  {
    id: 'racao-gatos-tarde',
    title: 'Ração dos gatos (Tarde)',
    category: 'gatos',
    frequency: 'daily',
    timesPerDay: 3,
    period: 'afternoon',
    preferredTime: '13:00',
    durationMinutes: 5,
    effortLevel: 1,
    overloadsUsers: ['kah'],
    description: 'Verificar potinho de ração da tarde.'
  },
  {
    id: 'racao-gatos-noite',
    title: 'Ração dos gatos (Noite)',
    category: 'gatos',
    frequency: 'daily',
    timesPerDay: 3,
    period: 'night',
    preferredTime: '19:30',
    durationMinutes: 5,
    effortLevel: 1,
    overloadsUsers: ['kah'],
    description: 'Última refeição dos bichanos antes de dormir.'
  },
  {
    id: 'limpar-caixa-areia',
    title: 'Limpar caixa de areia dos gatos',
    category: 'gatos',
    frequency: 'daily',
    period: 'morning',
    preferredTime: '08:30',
    durationMinutes: 10,
    effortLevel: 2, // Médio
    overloadsUsers: ['kah'], // Kah marcou como sobrecarga
    description: 'Peneirar areia, remover torrões e repor se necessário.'
  },
  {
    id: 'louca-almoco',
    title: 'Lavar e guardar louça (Almoço)',
    category: 'cozinha',
    frequency: 'daily',
    period: 'afternoon',
    preferredTime: '14:00',
    durationMinutes: 20,
    effortLevel: 2, // Médio
    overloadsUsers: ['kah'], // Kah marcou como sobrecarga
    description: 'Lavar os pratos, talheres, panelas e limpar a pia.'
  },
  {
    id: 'louca-jantar',
    title: 'Lavar e guardar louça (Jantar)',
    category: 'cozinha',
    frequency: 'daily',
    period: 'night',
    preferredTime: '20:30',
    durationMinutes: 20,
    effortLevel: 2, // Médio
    overloadsUsers: ['kah'], // Kah marcou como sobrecarga
    description: 'Deixar a pia limpa e seca para a manhã seguinte.'
  },
  {
    id: 'molhar-plantas',
    title: 'Molhar plantas do quintal',
    category: 'plantas',
    frequency: 'every_2_days',
    period: 'morning',
    preferredTime: '08:00',
    durationMinutes: 15,
    effortLevel: 1, // Leve
    overloadsUsers: [],
    description: 'Regar os vasos e checar folhagens no quintal.'
  },
  {
    id: 'varrer-passar-pano',
    title: 'Varrer e passar pano na casa',
    category: 'limpeza',
    frequency: '2x_week',
    preferredDays: [2, 5],
    period: 'morning',
    preferredTime: '09:00',
    durationMinutes: 45,
    effortLevel: 3, // Pesado
    overloadsUsers: [],
    description: 'Varrer os 2 quartos, sala, cozinha e passar pano com desinfetante suave.'
  },
  {
    id: 'lavar-banheiro',
    title: 'Lavar o banheiro completo',
    category: 'banheiro',
    frequency: '1x_week',
    preferredDays: [6], // Sábado
    period: 'morning',
    preferredTime: '10:00',
    durationMinutes: 40,
    effortLevel: 3, // Pesado
    overloadsUsers: [],
    description: 'Lavar vaso sanitário, box, chão, azulejos e pia.'
  },
  {
    id: 'lavar-roupas-mao',
    title: 'Lavar roupas À MÃO',
    category: 'roupas',
    frequency: '1x_week',
    preferredDays: [0], // Domingo
    period: 'morning',
    preferredTime: '09:30',
    durationMinutes: 60,
    effortLevel: 3, // Pesado
    overloadsUsers: ['kah'], // Kah marcou como sobrecarga
    description: 'Esfregar e enxaguar peças delicadas e toalhas à mão no tanque.'
  },
  {
    id: 'lavar-tapetes-camas',
    title: 'Lavar tapetes e forros de cama',
    category: 'limpeza',
    frequency: 'every_15_days',
    preferredDays: [6], // Sábado alternado
    period: 'afternoon',
    preferredTime: '14:30',
    durationMinutes: 60,
    effortLevel: 3, // Pesado
    overloadsUsers: [],
    description: 'Trocar forros de cama dos quartos, bater e lavar tapetes da sala e cozinha.'
  }
];

export const DAYS_OF_WEEK = [
  { index: 0, key: 'sun', short: 'Dom', label: 'Domingo' },
  { index: 1, key: 'mon', short: 'Seg', label: 'Segunda' },
  { index: 2, key: 'tue', short: 'Ter', label: 'Terça' },
  { index: 3, key: 'wed', short: 'Qua', label: 'Quarta' },
  { index: 4, key: 'thu', short: 'Qui', label: 'Quinta' },
  { index: 5, key: 'fri', short: 'Sex', label: 'Sexta' },
  { index: 6, key: 'sat', short: 'Sáb', label: 'Sábado' }
];

export const INITIAL_AVAILABILITY = {
  adryan: {
    0: { type: 'normal', freeMinutes: 180, morning: true, afternoon: true, night: true },
    1: { type: 'normal', freeMinutes: 120, morning: true, afternoon: false, night: true },
    2: { type: 'normal', freeMinutes: 120, morning: true, afternoon: false, night: true },
    3: { type: 'normal', freeMinutes: 120, morning: true, afternoon: false, night: true },
    4: { type: 'normal', freeMinutes: 120, morning: true, afternoon: false, night: true },
    5: { type: 'normal', freeMinutes: 120, morning: true, afternoon: false, night: true },
    6: { type: 'off', freeMinutes: 300, morning: true, afternoon: true, night: true },
    workSchedule: {
      enabled: true,
      start: '08:00',
      end: '18:00',
      lunchStart: '12:00',
      lunchEnd: '13:00',
      days: [1, 2, 3, 4, 5]
    },
    sleepSchedule: {
      enabled: true,
      wakeTime: '07:20',
      sleepTime: '23:00'
    },
    busySlots: []
  },
  kah: {
    0: { type: 'custom', freeMinutes: 380, startTime: '08:00', endTime: '14:20', morning: true, afternoon: true, night: false, customMode: 'range' },
    1: { type: 'normal', freeMinutes: 120, morning: true, afternoon: false, night: true },
    2: { type: 'normal', freeMinutes: 120, morning: true, afternoon: false, night: true },
    3: { type: 'normal', freeMinutes: 120, morning: true, afternoon: false, night: true },
    4: { type: 'normal', freeMinutes: 120, morning: true, afternoon: false, night: true },
    5: { type: 'normal', freeMinutes: 120, morning: true, afternoon: false, night: true },
    6: { type: 'normal', freeMinutes: 180, morning: true, afternoon: true, night: true },
    workSchedule: {
      enabled: true,
      start: '12:00',
      end: '21:20',
      lunchStart: '14:10',
      lunchEnd: '16:10',
      days: [0, 1, 2, 3, 4, 6]
    },
    sleepSchedule: {
      enabled: true,
      wakeTime: '08:00',
      sleepTime: '00:00'
    },
    busySlots: []
  }
};

export const ENCOURAGING_QUOTES = [
  "Vocês são uma equipe incrível! Cuidar do lar juntos traz leveza à vida. 🌿",
  "Casa limpa e mente em paz. Parabéns pela parceria de hoje! ✨",
  "O equilíbrio faz a rotina fluir com harmonia e muito carinho. 💖",
  "Tarefa concluída! Menos uma preocupação, mais tempo para descansar juntos. ☕",
  "Pequenos gestos constroem um lar acolhedor. Vocês arrasaram! 🏡",
  "Equilíbrio não é perfeição, é cuidar um do outro sem cobranças. 🕊️"
];
