// Serviço de Armazenamento Local e Sincronização Online (Firebase Firestore)
// Funciona 100% offline via LocalStorage e sincroniza em tempo real online quando configurado.

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

// Gera código legível do casal (ex.: PAZ-4829)
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
  const coupleCode = generateCoupleCode();
  const initialSchedule = generateWeeklySchedule({
    tasks: INITIAL_TASKS,
    availability: INITIAL_AVAILABILITY,
    users: DEFAULT_USERS,
    targetRatio: { user1: 50, user2: 50 }
  });

  return {
    coupleCode,
    users: DEFAULT_USERS,
    tasks: INITIAL_TASKS,
    availability: INITIAL_AVAILABILITY,
    weeklySchedule: initialSchedule.schedule,
    targetRatio: { user1: 50, user2: 50 },
    swaps: [], // Lista de pedidos de trocas
    history: {
      lastWeekHeavyAssignment: initialSchedule.heavyAssignments || {}
    },
    updatedAt: new Date().toISOString()
  };
}

// Recupera credenciais do Firebase salvas no navegador
export function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Erro ao ler configuração do Firebase:', e);
    return null;
  }
}

// Salva credenciais do Firebase
export function saveStoredFirebaseConfig(config) {
  try {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Erro ao salvar configuração do Firebase:', e);
  }
}

// Inicializa Firebase de forma segura
let db = null;
export function initFirebase(config = null) {
  const cfg = config || getStoredFirebaseConfig();
  if (!cfg || !cfg.apiKey || !cfg.projectId) {
    return null;
  }

  try {
    const app = getApps().length === 0 ? initializeApp(cfg) : getApp();
    db = getFirestore(app);

    // Habilita persistência offline do Firestore se suportada
    try {
      enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Persistência offline falhou: múltiplas abas abertas.');
        } else if (err.code === 'unimplemented') {
          console.warn('Navegador atual não suporta IndexedDbPersistence.');
        }
      });
    } catch (e) {
      // Ignora se já estiver inicializado
    }

    return db;
  } catch (error) {
    console.error('Falha ao inicializar Firebase:', error);
    return null;
  }
}

// Carrega os dados locais com fallback seguro
export function loadLocalData() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Garante integridade mínima
      if (parsed && parsed.tasks && parsed.users) {
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
    console.error('Erro ao salvar dados no localStorage:', e);
  }
}

// Usuário ativo no aparelho atual
export function getActiveUserId() {
  try {
    const saved = localStorage.getItem(ACTIVE_USER_KEY);
    return saved || 'user1'; // Padrão "Eu"
  } catch (e) {
    return 'user1';
  }
}

export function setActiveUserId(userId) {
  try {
    localStorage.setItem(ACTIVE_USER_KEY, userId);
  } catch (e) {
    console.error('Erro ao definir usuário ativo:', e);
  }
}

/**
 * Escuta atualizações em tempo real do casal no Firebase
 * Se Firebase não estiver configurado, chama o callback imediatamente com dados locais.
 */
export function subscribeToCouple(coupleCode, onDataReceived, onSyncStatusChange) {
  const local = loadLocalData();
  onDataReceived(local);

  const database = initFirebase();
  if (!database || !coupleCode) {
    if (onSyncStatusChange) onSyncStatusChange({ online: false, reason: 'offline_or_local_only' });
    return () => {};
  }

  if (onSyncStatusChange) onSyncStatusChange({ online: true, reason: 'connecting' });

  try {
    const docRef = doc(database, 'couples', coupleCode.toUpperCase().trim());
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data();
          // Atualiza localStorage
          saveLocalData(remoteData);
          onDataReceived(remoteData);
          if (onSyncStatusChange) onSyncStatusChange({ online: true, reason: 'synced' });
        } else {
          // Se o documento ainda não existe na nuvem, sobe o local
          setDoc(docRef, local, { merge: true }).catch(console.error);
          if (onSyncStatusChange) onSyncStatusChange({ online: true, reason: 'created_remote' });
        }
      },
      (error) => {
        console.warn('Erro na sincronização em tempo real do Firebase:', error);
        if (onSyncStatusChange) onSyncStatusChange({ online: false, reason: 'error', error });
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Falha ao assinar documento do casal:', err);
    if (onSyncStatusChange) onSyncStatusChange({ online: false, reason: 'error', error: err });
    return () => {};
  }
}

/**
 * Salva alterações tanto localmente quanto na nuvem (Firestore)
 */
export async function syncSaveData(data) {
  const updatedData = {
    ...data,
    updatedAt: new Date().toISOString()
  };

  // Salva no LocalStorage imediatamente
  saveLocalData(updatedData);

  // Sincroniza com Firebase se disponível
  const database = initFirebase();
  if (database && updatedData.coupleCode) {
    try {
      const docRef = doc(database, 'couples', updatedData.coupleCode.toUpperCase().trim());
      await setDoc(docRef, updatedData, { merge: true });
      return { success: true, syncedOnline: true };
    } catch (err) {
      console.warn('Salvo localmente, falha ao subir para Firebase:', err);
      return { success: true, syncedOnline: false, error: err };
    }
  }

  return { success: true, syncedOnline: false };
}
