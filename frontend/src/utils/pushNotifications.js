import api from '../services/api';

const VAPID_PUBLIC_KEY = 'BGZdqac2qhkNacgilEQHQWmLjX6DF7J4iPjqHCgv39Oa5UwrvP3oVBD267G4JHdG59dOWD9SvYJfWbgd9yBW6Fk';

const urlBase64ToUint8Array = value => {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)));
};

export const enablePushNotifications = async () => {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este dispositivo no admite notificaciones push');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('No se concedió permiso para las notificaciones');
  const registration = await navigator.serviceWorker.register('/sw.js');
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  await api.post('/notifications/subscribe', subscription);
  return permission;
};

const CHAT_TONES = {
  suave: [{ frequency:620, duration:0.11 }, { frequency:780, duration:0.14 }],
  clasico: [{ frequency:740, duration:0.08 }, { frequency:880, duration:0.15 }],
  doble: [{ frequency:880, duration:0.08 }, { frequency:0, duration:0.06 }, { frequency:880, duration:0.11 }],
};

export const playChatSound = (force = false) => {
  if (!force && localStorage.getItem('crm_chat_sound') === 'off') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const tone = CHAT_TONES[localStorage.getItem('crm_chat_tone')] || CHAT_TONES.clasico;
    let cursor = context.currentTime;
    tone.forEach(note => {
      if (note.frequency) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(note.frequency, cursor);
        gain.gain.setValueAtTime(0.0001, cursor);
        gain.gain.exponentialRampToValueAtTime(0.14, cursor + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, cursor + note.duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(cursor);
        oscillator.stop(cursor + note.duration);
      }
      cursor += note.duration;
    });
    window.setTimeout(() => context.close(), Math.ceil((cursor - context.currentTime + 0.1) * 1000));
  } catch {}
};
