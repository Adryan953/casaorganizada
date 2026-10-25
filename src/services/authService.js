// Serviço de Autenticação Segura e Simples do Casal
import { VALID_CREDENTIALS, normalizeUserId } from '../constants/initialData';
import { getSupabase } from './supabaseService';

const AUTH_USER_KEY = 'casa_em_paz_logged_user';
const ACTIVE_USER_KEY = 'casa_em_paz_active_user';

export async function login(username, password) {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  // 1. Tenta autenticar pelo Supabase
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', cleanUser)
        .eq('password', cleanPass)
        .maybeSingle();

      if (data) {
        const normalizedId = normalizeUserId(data.id || data.username);
        const isKah = normalizedId === 'kah';

        const sessionUser = {
          id: normalizedId,
          username: isKah ? 'Kah' : 'Adryan',
          name: isKah ? 'Kah' : 'Adryan',
          avatar: data.avatar || (isKah ? '👩‍🦰' : '🧔‍♂️'),
          color: data.color || (isKah ? '#ec4899' : '#3b82f6'),
          role: isKah ? 'Parceira' : 'Parceiro',
          loggedAt: new Date().toISOString()
        };
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(sessionUser));
        localStorage.setItem(ACTIVE_USER_KEY, normalizedId);
        return { success: true, user: sessionUser };
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar users no Supabase, usando validação local:', err);
  }

  // 2. Fallback offline local
  const found = VALID_CREDENTIALS.find(
    (c) => c.username.toLowerCase() === cleanUser && c.password === cleanPass
  );

  if (found) {
    const normalizedId = normalizeUserId(found.id || found.username);
    const isKah = normalizedId === 'kah';

    const sessionUser = {
      id: normalizedId,
      username: isKah ? 'Kah' : 'Adryan',
      name: isKah ? 'Kah' : 'Adryan',
      avatar: found.avatar || (isKah ? '👩‍🦰' : '🧔‍♂️'),
      color: found.color || (isKah ? '#ec4899' : '#3b82f6'),
      role: isKah ? 'Parceira' : 'Parceiro',
      loggedAt: new Date().toISOString()
    };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(sessionUser));
    localStorage.setItem(ACTIVE_USER_KEY, normalizedId);
    return { success: true, user: sessionUser };
  }

  return { success: false, message: 'Usuário ou senha incorretos. Dica: Kah/Kah123 ou Adryan/Adryan123' };
}

export function getCurrentAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed) return null;

    // Garante ID e campos normalizados
    const normalizedId = normalizeUserId(parsed.id || parsed.username);
    const isKah = normalizedId === 'kah';
    return {
      ...parsed,
      id: normalizedId,
      username: isKah ? 'Kah' : 'Adryan',
      name: isKah ? 'Kah' : 'Adryan',
      avatar: parsed.avatar || (isKah ? '👩‍🦰' : '🧔‍♂️'),
      color: parsed.color || (isKah ? '#ec4899' : '#3b82f6'),
      role: isKah ? 'Parceira' : 'Parceiro'
    };
  } catch (e) {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(ACTIVE_USER_KEY);
}
