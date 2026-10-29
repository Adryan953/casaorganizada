// Cliente e Serviços do Supabase para o Aplicativo "Casa em Paz"
// Lê as chaves diretamente do arquivo de configuração do código (src/config/supabaseConfig.js).

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabaseConfig';
import { mergeAppState } from './stateMergeService';

// Importa função para obter o usuário ativo do dispositivo (para filtrar eco de atualizações)
let _getActiveUserId = () => 'unknown';
export function setGetActiveUserIdFn(fn) { _getActiveUserId = fn; }

let supabase = null;

// Inicializa o cliente do Supabase diretamente com as chaves do código
export function initSupabase() {
  const url = (SUPABASE_URL || '').trim();
  const key = (SUPABASE_ANON_KEY || '').trim();

  if (!url || !key) {
    supabase = null;
    return null;
  }

  try {
    supabase = createClient(url, key, {
      auth: { persistSession: true },
      realtime: { params: { eventsPerSecond: 10 } }
    });
    return supabase;
  } catch (err) {
    console.warn('Falha ao inicializar Supabase a partir do código:', err);
    supabase = null;
    return null;
  }
}

// Retorna instância ativa do Supabase
export function getSupabase() {
  if (!supabase) {
    return initSupabase();
  }
  return supabase;
}

/**
 * Salva uma nova reclamação/desabafo no Supabase
 */
export async function insertFeedbackSupabase(feedbackItem) {
  const client = getSupabase();
  if (!client) return { success: false, reason: 'no_client' };

  try {
    const { data, error } = await client
      .from('feedbacks')
      .insert([
        {
          id: feedbackItem.id,
          couple_code: feedbackItem.coupleCode || 'CASAL-PAZ',
          from_user_id: feedbackItem.fromUserId,
          to_user_id: feedbackItem.toUserId,
          title: feedbackItem.title,
          description: feedbackItem.description,
          image_url: feedbackItem.image || null,
          severity: feedbackItem.severity || 'gentle',
          status: feedbackItem.status || 'pending',
          response_note: feedbackItem.responseNote || null,
          created_at: feedbackItem.createdAt || new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.warn('Erro ao inserir feedback no Supabase:', err);
    return { success: false, error: err };
  }
}

/**
 * Atualiza status ou resposta de uma reclamação no Supabase
 */
export async function updateFeedbackSupabase(feedbackId, updates) {
  const client = getSupabase();
  if (!client) return { success: false, reason: 'no_client' };

  try {
    const payload = {};
    if (updates.status) payload.status = updates.status;
    if (updates.responseNote) payload.response_note = updates.responseNote;
    if (updates.resolvedAt) payload.resolved_at = updates.resolvedAt;

    const { data, error } = await client
      .from('feedbacks')
      .update(payload)
      .eq('id', feedbackId)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.warn('Erro ao atualizar feedback no Supabase:', err);
    return { success: false, error: err };
  }
}

/**
 * Busca todos os feedbacks salvos no Supabase para a sala do casal
 */
export async function fetchFeedbacksSupabase(coupleCode) {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('feedbacks')
      .select('*')
      .eq('couple_code', coupleCode || 'CASAL-PAZ')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      coupleCode: row.couple_code,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      title: row.title,
      description: row.description,
      image: row.image_url,
      severity: row.severity,
      status: row.status,
      responseNote: row.response_note,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at
    }));
  } catch (err) {
    console.warn('Erro ao carregar feedbacks do Supabase:', err);
    return [];
  }
}

/**
 * Deleta uma reclamação/desabafo no Supabase
 */
export async function deleteFeedbackSupabase(feedbackId) {
  const client = getSupabase();
  if (!client) return { success: false, reason: 'no_client' };

  try {
    const { error } = await client
      .from('feedbacks')
      .delete()
      .eq('id', feedbackId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.warn('Erro ao deletar feedback no Supabase:', err);
    return { success: false, error: err };
  }
}

/**
 * Escuta reclamações em tempo real no Supabase
 */
export function subscribeToSupabaseFeedbacks(coupleCode, onFeedbackChanged) {
  const client = getSupabase();
  if (!client) return () => {};

  try {
    const channel = client
      .channel('feedbacks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedbacks',
          filter: `couple_code=eq.${coupleCode || 'CASAL-PAZ'}`
        },
        (payload) => {
          if (payload && payload.eventType === 'DELETE') {
            const oldId = payload.old ? payload.old.id : null;
            if (oldId) {
              onFeedbackChanged({ eventType: 'DELETE', feedbackId: oldId });
            }
            return;
          }

          if (payload && payload.new) {
            const row = payload.new;
            const mapped = {
              id: row.id,
              coupleCode: row.couple_code,
              fromUserId: row.from_user_id,
              toUserId: row.to_user_id,
              title: row.title,
              description: row.description,
              image: row.image_url,
              severity: row.severity,
              status: row.status,
              responseNote: row.response_note,
              createdAt: row.created_at,
              resolvedAt: row.resolved_at
            };
            onFeedbackChanged({ eventType: payload.eventType, feedback: mapped });
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Erro ao assinar canal realtime do Supabase:', err);
    return () => {};
  }
}

/**
 * Salva o estado completo das tarefas e rotinas do casal no banco de dados Supabase
 * Realiza fusão inteligente e profunda com o banco para garantir que as configurações
 * de nenhum dos parceiros sejam sobrescritas ou perdidas!
 */
export async function saveCoupleStateSupabase(coupleCode, fullState, updatedBy = null) {
  const client = getSupabase();
  if (!client) return { success: false, reason: 'no_client' };

  const code = (coupleCode || 'CASAL-PAZ').toUpperCase().trim();
  // Identifica qual usuário/dispositivo está salvando (para filtrar eco no Realtime)
  // Armazenado dentro do state para não depender de coluna extra no banco
  const senderUserId = updatedBy || _getActiveUserId();
  const stateWithSender = { ...fullState, _updatedBy: senderUserId };

  try {
    // 1. Busca o estado atual gravado no Supabase para fusão segura
    const { data: existingRow } = await client
      .from('couples_state')
      .select('*')
      .eq('couple_code', code)
      .maybeSingle();

    const existingState = existingRow && existingRow.state ? existingRow.state : null;
    const mergedState = existingState ? mergeAppState(existingState, stateWithSender) : stateWithSender;
    // Garante que o _updatedBy do remetente atual sobrescreve o do estado anterior
    mergedState._updatedBy = senderUserId;

    const { data, error } = await client
      .from('couples_state')
      .upsert({
        couple_code: code,
        state: mergedState,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    return { success: true, data, mergedState };
  } catch (err) {
    console.warn('Erro ao sincronizar tarefas no Supabase (couples_state):', err);
    return { success: false, error: err };
  }
}

/**
 * Busca o estado salvo das tarefas do casal na nuvem do Supabase
 */
export async function fetchCoupleStateSupabase(coupleCode) {
  const client = getSupabase();
  if (!client) return null;

  const code = (coupleCode || 'CASAL-PAZ').toUpperCase().trim();
  try {
    const { data, error } = await client
      .from('couples_state')
      .select('*')
      .eq('couple_code', code)
      .maybeSingle();

    if (error) throw error;
    if (data && data.state) {
      return {
        ...data.state,
        updatedAt: data.updated_at || data.state.updatedAt
      };
    }
    return null;
  } catch (err) {
    console.warn('Erro ao carregar tarefas do Supabase:', err);
    return null;
  }
}

/**
 * Assina atualizações em tempo real das tarefas no Supabase para sincronização instantânea
 */
export function subscribeToCoupleStateSupabase(coupleCode, onRemoteStateReceived, onStatusChange) {
  const client = getSupabase();
  if (!client) {
    if (onStatusChange) onStatusChange({ online: false, reason: 'no_client' });
    return () => {};
  }

  const code = (coupleCode || 'CASAL-PAZ').toUpperCase().trim();

  try {
    const channel = client
      .channel(`couple-state-${code}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couples_state',
          filter: `couple_code=eq.${code}`
        },
        (payload) => {
          if (payload && payload.new && payload.new.state) {
            // Ignora eco do próprio dispositivo: lê _updatedBy do state JSON (sem precisar de coluna extra no banco)
            const senderUserId = payload.new.state._updatedBy;
            const myUserId = _getActiveUserId();
            if (senderUserId && senderUserId === myUserId) {
              return; // É o eco do próprio update — ignorar para evitar loop de alternância de cards
            }

            onRemoteStateReceived({
              ...payload.new.state,
              updatedAt: payload.new.updated_at || payload.new.state.updatedAt
            });
            if (onStatusChange) {
              onStatusChange({ online: true, reason: 'synced_remote', mode: 'supabase' });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (onStatusChange) {
            onStatusChange({ online: true, reason: 'connected', mode: 'supabase' });
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          if (onStatusChange) {
            onStatusChange({ online: false, reason: status, mode: 'supabase' });
          }
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Erro ao conectar Realtime de tarefas no Supabase:', err);
    if (onStatusChange) onStatusChange({ online: false, reason: 'error' });
    return () => {};
  }
}

