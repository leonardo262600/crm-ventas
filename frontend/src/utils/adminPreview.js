import { useEffect, useState } from 'react';

const STORAGE_KEY = 'crm_admin_preview';
const CHANGE_EVENT = 'crm-admin-preview-change';

export function getAdminPreview() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function setAdminPreview(user) {
  const preview = user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || null,
  } : null;

  if (preview) localStorage.setItem(STORAGE_KEY, JSON.stringify(preview));
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: preview }));
}

export function clearAdminPreview() {
  setAdminPreview(null);
}

export function useAdminPreview(enabled = true) {
  const [preview, setPreview] = useState(() => enabled ? getAdminPreview() : null);

  useEffect(() => {
    if (!enabled) {
      setPreview(null);
      return undefined;
    }

    const onChange = event => setPreview(event.detail ?? getAdminPreview());
    const onStorage = event => {
      if (event.key === STORAGE_KEY) setPreview(getAdminPreview());
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [enabled]);

  return preview;
}
