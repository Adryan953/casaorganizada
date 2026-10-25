// Controle do Loop de Alarme Contínuo
let alarmIntervalId = null;
let alarmAudioCtx = null;

/**
 * Inicia o som de alarme contínuo de Atenção/Urgência
 * Esse som continua tocando em loop até que stopAttentionAlarmLoop() seja chamado!
 */
export function startAttentionAlarmLoop() {
  if (alarmIntervalId) return; // Já está tocando

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      alarmAudioCtx = new AudioContext();
    }
  } catch (e) {
    console.warn('AudioContext do alarme:', e);
  }

  const playPulse = () => {
    try {
      if (alarmAudioCtx && alarmAudioCtx.state === 'suspended') {
        alarmAudioCtx.resume();
      }

      if (alarmAudioCtx) {
        const now = alarmAudioCtx.currentTime;
        const beeps = [
          { freq: 880, start: 0, dur: 0.18, type: 'triangle' },
          { freq: 659.25, start: 0.22, dur: 0.25, type: 'sawtooth' }
        ];

        beeps.forEach(({ freq, start, dur, type }) => {
          const osc = alarmAudioCtx.createOscillator();
          const gain = alarmAudioCtx.createGain();

          osc.type = type;
          osc.frequency.setValueAtTime(freq, now + start);

          gain.gain.setValueAtTime(0.01, now + start);
          gain.gain.linearRampToValueAtTime(0.35, now + start + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

          osc.connect(gain);
          gain.connect(alarmAudioCtx.destination);

          osc.start(now + start);
          osc.stop(now + start + dur);
        });
      }

      if ('vibrate' in navigator) {
        navigator.vibrate([300, 150, 300]);
      }
    } catch (err) {
      console.warn('Erro ao emitir pulso do alarme:', err);
    }
  };

  playPulse();
  alarmIntervalId = setInterval(playPulse, 750);
}

/**
 * Para imediatamente o som do alarme e a vibração
 */
export function stopAttentionAlarmLoop() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }

  if (alarmAudioCtx) {
    try {
      alarmAudioCtx.close();
    } catch (e) {}
    alarmAudioCtx = null;
  }

  if ('vibrate' in navigator) {
    navigator.vibrate(0);
  }
}

/**
 * Toca um som suave de sino/chime usando Web Audio API nativa
 * Não precisa de arquivos mp3 externos e funciona perfeitamente offline.
 */
export function playChimeSound(type = 'success') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (type === 'success') {
      // Tom harmonioso ascendente (acorde maior sereno)
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.08);

        gain.gain.setValueAtTime(0, now + index * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, now + index * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.85);
      });
    } else {
      // Lembrete gentil de tarefa (duplo sino suave)
      [440, 554.37].forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.15);

        gain.gain.setValueAtTime(0, now + index * 0.15);
        gain.gain.linearRampToValueAtTime(0.18, now + index * 0.15 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.15 + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.15);
        osc.stop(now + index * 0.15 + 1.25);
      });
    }
  } catch (e) {
    console.warn('Web Audio não pôde ser reproduzido:', e);
  }
}

/**
 * Solicita permissão para notificações do navegador/celular
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return { supported: false, granted: false };
  }

  try {
    const permission = await Notification.requestPermission();
    return {
      supported: true,
      granted: permission === 'granted'
    };
  } catch (error) {
    console.error('Erro ao pedir permissão de notificação:', error);
    return { supported: true, granted: false, error };
  }
}

/**
 * Envia notificação local ou via Service Worker
 */
export async function triggerNotification(title, options = {}) {
  const defaultOptions = {
    body: 'Hora de cuidar do lar com tranquilidade!',
    icon: '/icon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    ...options
  };

  playChimeSound('reminder');

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  // Tenta via Service Worker primeiro (ideal para celulares/PWA)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions);
        return true;
      }
    } catch (e) {
      console.warn('Falha no showNotification do Service Worker, tentando fallback:', e);
    }
  }

  // Fallback para new Notification direto
  try {
    new Notification(title, defaultOptions);
    return true;
  } catch (e) {
    console.warn('Falha no fallback de notificação:', e);
    return false;
  }
}

/**
 * Dispara uma notificação de teste para o usuário ver o funcionamento
 */
export async function sendTestNotification(userName = 'Você') {
  const perm = await requestNotificationPermission();
  if (!perm.granted) {
    alert('Por favor, autorize as notificações nas configurações do seu navegador ou celular para receber os lembretes.');
    return false;
  }

  return triggerNotification('Casa em Paz 🌿', {
    body: `Olá, ${userName}! Seu lembrete suave de tarefas domésticas está ativo e funcionando.`,
    tag: 'test-notification'
  });
}
