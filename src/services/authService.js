// Serviço de Autenticação Segura e Simples do Casal
import { VALID_CREDENTIALS } from '../constants/initialData';
import { getSupabase } from './supabaseService';

const AUTH_USER_KEY = 'casa_em_paz_logged_user';

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
        const sessionUser = {
          id: data.id,
          username: data.username,
          name: data.name,
          avatar: data.avatar || '👤',
          color: data.color || '#6366f1',
          loggedAt: new Date().toISOString()
        };
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(sessionUser));
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
    const sessionUser = {
      id: found.id,
      username: found.username,
      name: found.name,
      avatar: found.avatar,
      color: found.color,
      loggedAt: new Date().toISOString()
    };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(sessionUser));
    return { success: true, user: sessionUser };
  }

  return { success: false, message: 'Usuário ou senha incorretos. Dica: Kah/Kah123 ou Adryan/Adryan123' };
}

export function getCurrentAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(AUTH_USER_KEY);
}
