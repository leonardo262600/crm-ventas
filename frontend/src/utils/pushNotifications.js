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

export const playChatSound = () => {
  if (localStorage.getItem('crm_chat_sound') === 'off') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(740, context.currentTime);
    oscillator.frequency.setValueAtTime(880, context.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.23);
    oscillator.onended = () => context.close();
  } catch {}
};
