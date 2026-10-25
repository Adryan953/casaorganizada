// Serviço de Armazenamento Local e Sincronização em Tempo Real (Zero-Config & Firebase)
// Garante sincronização instantânea entre os dois celulares com ou sem chaves de API!

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import {
  DEFAULT_USERS,
  INITIAL_TASKS,
  INITIAL_AVAILABILITY
} from '../constants/initialData';
import { generateWeeklySchedule } from './schedulerService';

const LOCAL_STORAGE_KEY = 'casa_em_paz_data_v1';
const FIREBASE_CONFIG_KEY = 'casa_em_paz_firebase_cfg';
const ACTIVE_USER_KEY = 'casa_em_paz_active_user';

// Código Padrão Unificado de Fábrica: garante que ambos os celulares já nasçam no mesmo casal!
export const DEFAULT_COUPLE_CODE = 'CASAL-PAZ';

// Gera código legível alternativo se o usuário quiser trocar
export function generateCoupleCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PAZ-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Inicializa estado padrão completo
export function getDefaultAppState() {
  const initialSchedule = generateWeeklySchedule({
    tasks: INITIAL_TASKS,
    availability: INITIAL_AVAILABILITY,
    users: DEFAULT_USERS,
    targetRatio: { user1: 50, user2: 50 }
  });

  return {
    coupleCode: DEFAULT_COUPLE_CODE,
    users: DEFAULT_USERS,
    tasks: INITIAL_TASKS,
    availability: INITIAL_AVAILABILITY,
    weeklySchedule: initialSchedule.schedule,
    targetRatio: { user1: 50, user2: 50 },
    swaps: [],
    feedbacks: [],
    history: {
      lastWeekHeavyAssignment: initialSchedule.heavyAssignments || {}
    },
    updatedAt: new Date().toISOString()
  };
}

// Recupera credenciais opcionais do Firebase
export function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveStoredFirebaseConfig(config) {
  try {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {}
}

// Inicializa Firebase se configurado
let db = null;
export function initFirebase(config = null) {
  const cfg = config || getStoredFirebaseConfig();
  if (!cfg || !cfg.apiKey || !cfg.projectId) return null;

  try {
    const app = getApps().length === 0 ? initializeApp(cfg) : getApp();
    db = getFirestore(app);
    return db;
  } catch (error) {
    console.warn('Firebase opcional não inicializado:', error);
    return null;
  }
}

// Carrega os dados locais do aparelho
export function loadLocalData() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tasks && parsed.users) {
        // Garante que haja um coupleCode válido
        if (!parsed.coupleCode) {
          parsed.coupleCode = DEFAULT_COUPLE_CODE;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler localStorage:', e);
  }

  const defaultData = getDefaultAppState();
  saveLocalData(defaultData);
  return defaultData;
}

// Salva os dados no localStorage
export function saveLocalData(data) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }
}

// Usuário ativo no aparelho atual
export function getActiveUserId() {
  try {
    return localStorage.getItem(ACTIVE_USER_KEY) || 'user1';
  } catch (e) {
    return 'user1';
  }
}

export function setActiveUserId(userId) {
  try {
    localStorage.setItem(ACTIVE_USER_KEY, userId);
  } catch (e) {}
}

// Sanitiza o código do casal para uso em tópico seguro de rede
function getCleanTopic(coupleCode) {
  const code = (coupleCode || DEFAULT_COUPLE_CODE).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `casaempaz_sync_${code}`;
}

/**
 * Publica um evento ou snapshot de sincronização no canal em nuvem em tempo real
 */
export async function broadcastSyncEvent(coupleCode, eventPayload) {
  const topic = getCleanTopic(coupleCode);
  const url = `https://ntfy.sh/${topic}`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Title': 'CasaEmPazSync',
        'Tags': 'sync'
      },
      body: JSON.stringify({
        ...eventPayload,
        clientTimestamp: Date.now()
      })
    });
  } catch (error) {
    console.warn('Falha no broadcast online:', error);
  }
}

/**
 * Motor de Sincronização em Tempo Real (WebSocket + SSE + Polling de segurança)
 * Escuta o canal do casal e atualiza a tela do parceiro automaticamente no mesmo instante!
 */
export function subscribeToCouple(coupleCode, onDataReceived, onSyncStatusChange, onActionReceived) {
  let isClosed = false;
  let ws = null;
  let pollInterval = null;
  const topic = getCleanTopic(coupleCode);

  // 1. Carrega o estado local de imediato
  const local = loadLocalData();
  onDataReceived(local);

  if (onSyncStatusChange) {
    onSyncStatusChange({ online: true, reason: 'connecting', mode: 'realtime' });
  }

  // 2. Função para processar mensagens recebidas do parceiro
  const handleIncomingMessage = (rawMessage) => {
    try {
      const payload = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
      if (!payload || !payload.type) return;

      const current = loadLocalData();

      // Ignora se for eco da própria alteração se houver id do cliente
      const activeUser = getActiveUserId();
      if (payload.senderId && payload.senderId === activeUser && payload.type !== 'REQUEST_FULL_STATE') {
        return;
      }

      let updated = { ...current };

      if (payload.type === 'TASK_STATUS') {
        updated.weeklySchedule = (current.weeklySchedule || []).map((task) => {
          if (task.instanceId === payload.instanceId) {
            return {
              ...task,
              completed: payload.completed,
              completedAt: payload.completed ? (payload.completedAt || new Date().toISOString()) : null
            };
          }
          return task;
        });
      } else if (payload.type === 'TASK_DELEGATE') {
        updated.weeklySchedule = (current.weeklySchedule || []).map((task) => {
          if (task.instanceId === payload.instanceId) {
            return { ...task, assignedTo: payload.toUserId };
          }
          return task;
        });
      } else if (payload.type === 'TASK_POSTPONE') {
        updated.weeklySchedule = (current.weeklySchedule || []).map((task) => {
          if (task.instanceId === payload.instanceId) {
            return { ...task, date: payload.newDate, instanceId: payload.newInstanceId };
          }
          return task;
        });
      } else if (payload.type === 'SWAP_CREATE') {
        const exists = (current.swaps || []).some((s) => s.id === payload.swap.id);
        if (!exists) {
          updated.swaps = [payload.swap, ...(current.swaps || [])];
        }
      } else if (payload.type === 'SWAP_RESOLVE') {
        updated.swaps = (current.swaps || []).map((s) => {
          if (s.id === payload.swapId) {
            return { ...s, status: payload.status, resolvedAt: new Date().toISOString() };
          }
          return s;
        });
        if (payload.status === 'accepted' && payload.taskInstanceId && payload.toUserId) {
          updated.weeklySchedule = (current.weeklySchedule || []).map((t) => {
            if (t.instanceId === payload.taskInstanceId) {
              return { ...t, assignedTo: payload.toUserId };
            }
            return t;
          });
        }
      } else if (payload.type === 'FEEDBACK_CREATE') {
        const exists = (current.feedbacks || []).some((f) => f.id === payload.feedback.id);
        if (!exists) {
          updated.feedbacks = [payload.feedback, ...(current.feedbacks || [])];
        }
      } else if (payload.type === 'FEEDBACK_RESOLVE') {
        updated.feedbacks = (current.feedbacks || []).map((f) => {
          if (f.id === payload.feedbackId) {
            return {
              ...f,
              status: payload.status,
              responseNote: payload.responseNote,
              resolvedAt: payload.resolvedAt || new Date().toISOString()
            };
          }
          return f;
        });
      } else if (payload.type === 'FEEDBACK_CANCEL') {
        updated.feedbacks = (current.feedbacks || []).filter((f) => f.id !== payload.feedbackId);
      } else if (payload.type === 'FULL_STATE_UPDATE') {
        // Atualização completa recebida
        if (payload.data && payload.data.updatedAt) {
          const currentTimestamp = new Date(current.updatedAt || 0).getTime();
          const remoteTimestamp = new Date(payload.data.updatedAt).getTime();
          if (remoteTimestamp >= currentTimestamp) {
            updated = { ...payload.data, coupleCode: current.coupleCode };
          }
        }
      } else if (payload.type === 'REQUEST_FULL_STATE') {
        // O parceiro acabou de entrar e pediu o estado mais recente
        broadcastSyncEvent(coupleCode, {
          type: 'FULL_STATE_UPDATE',
          data: current,
          senderId: activeUser
        });
        return;
      }

      updated.updatedAt = new Date().toISOString();
      saveLocalData(updated);
      onDataReceived(updated);

      if (onSyncStatusChange) {
        onSyncStatusChange({ online: true, reason: 'synced_event', lastEvent: payload.type });
      }

      if (onActionReceived) {
        onActionReceived(payload);
      }
    } catch (e) {
      console.warn('Erro ao processar mensagem do parceiro:', e);
    }
  };

  // 3. Conecta WebSocket em tempo real de latência ultrabaixa
  function connectWebSocket() {
    if (isClosed) return;

    try {
      const wsUrl = `wss://ntfy.sh/${topic}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (onSyncStatusChange) {
          onSyncStatusChange({ online: true, reason: 'connected', mode: 'websocket' });
        }
        // Pede o estado mais recente aos parceiros conectados
        broadcastSyncEvent(coupleCode, {
          type: 'REQUEST_FULL_STATE',
          senderId: getActiveUserId()
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'message' && data.message) {
            handleIncomingMessage(data.message);
          }
        } catch (err) {
          console.warn('Erro ao ler evento do websocket:', err);
        }
      };

      ws.onerror = () => {
        if (onSyncStatusChange) {
          onSyncStatusChange({ online: false, reason: 'ws_reconnecting' });
        }
      };

      ws.onclose = () => {
        if (!isClosed) {
          // Reconecta automaticamente após 2.5s se a rede oscilar
          setTimeout(connectWebSocket, 2500);
        }
      };
    } catch (e) {
      console.warn('Falha ao abrir WebSocket, mantendo polling:', e);
    }
  }

  connectWebSocket();

  // 4. Polling de verificação periódica a cada 4 segundos como segurança extra
  const checkPollMessages = async () => {
    if (isClosed) return;
    try {
      const resp = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=30s`);
      if (resp.ok) {
        const text = await resp.text();
        const lines = text.trim().split('\n');
        for (const line of lines) {
          if (line) {
            try {
              const item = JSON.parse(line);
              if (item.event === 'message' && item.message) {
                handleIncomingMessage(item.message);
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {}
  };

  pollInterval = setInterval(checkPollMessages, 4000);

  // 5. Suporte adicional opcional ao Firebase (se o usuário tiver configurado)
  const firebaseDb = initFirebase();
  let firebaseUnsub = null;
  if (firebaseDb) {
    try {
      const docRef = doc(firebaseDb, 'couples', coupleCode.toUpperCase().trim());
      firebaseUnsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data();
          saveLocalData(remoteData);
          onDataReceived(remoteData);
        }
      });
    } catch (e) {}
  }

  // Retorna função de limpeza
  return () => {
    isClosed = true;
    if (ws) {
      try { ws.close(); } catch (e) {}
    }
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    if (firebaseUnsub) {
      firebaseUnsub();
    }
  };
}

/**
 * Salva localmente e transmite a alteração instantaneamente para o outro celular
 */
export async function syncSaveData(data, specificEvent = null) {
  const updatedData = {
    ...data,
    updatedAt: new Date().toISOString()
  };

  // Salva no LocalStorage do celular atual
  saveLocalData(updatedData);

  // Transmite em tempo real pelo canal do casal
  if (specificEvent) {
    await broadcastSyncEvent(updatedData.coupleCode, {
      ...specificEvent,
      senderId: getActiveUserId()
    });
  } else {
    await broadcastSyncEvent(updatedData.coupleCode, {
      type: 'FULL_STATE_UPDATE',
      data: updatedData,
      senderId: getActiveUserId()
    });
  }

  // Opcional: Se houver Firebase configurado, salva lá também
  const database = initFirebase();
  if (database && updatedData.coupleCode) {
    try {
      const docRef = doc(database, 'couples', updatedData.coupleCode.toUpperCase().trim());
      await setDoc(docRef, updatedData, { merge: true });
    } catch (e) {}
  }

  return { success: true };
}
