// Cliente e Serviços do Supabase para o Aplicativo "Casa em Paz"
// Suporta sincronização de tarefas, estado do casal e canal de reclamações/desabafos com fotos.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG_KEY = 'casa_em_paz_supabase_cfg';

let supabase = null;

// Recupera credenciais salvas localmente
export function getStoredSupabaseConfig() {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Salva credenciais do Supabase
export function saveStoredSupabaseConfig(url, anonKey) {
  try {
    const config = { url: url.trim(), anonKey: anonKey.trim() };
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    initSupabase(config.url, config.anonKey);
    return true;
  } catch (e) {
    console.error('Erro ao salvar configuração do Supabase:', e);
    return false;
  }
}

// Inicializa o cliente do Supabase
export function initSupabase(customUrl = null, customKey = null) {
  const cfg = customUrl && customKey ? { url: customUrl, anonKey: customKey } : getStoredSupabaseConfig();

  if (!cfg || !cfg.url || !cfg.anonKey) {
    supabase = null;
    return null;
  }

  try {
    supabase = createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true },
      realtime: { params: { eventsPerSecond: 10 } }
    });
    return supabase;
  } catch (err) {
    console.warn('Falha ao inicializar cliente Supabase:', err);
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
          image_url: feedbackItem.image || null, // Base64 ou URL
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
          onFeedbackChanged(payload);
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
