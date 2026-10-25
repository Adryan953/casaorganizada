// Cliente e Serviços do Supabase para o Aplicativo "Casa em Paz"
// Lê as chaves diretamente do arquivo de configuração do código (src/config/supabaseConfig.js).

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabaseConfig';

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
