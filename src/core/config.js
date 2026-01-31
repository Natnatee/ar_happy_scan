export const CONFIG_KEY = 'AR_APP_CONFIG_V1';

export function getConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to parse config config', e);
    return null;
  }
}
