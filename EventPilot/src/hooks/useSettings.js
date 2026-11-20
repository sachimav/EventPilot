import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { initializeDatabase } from '../database';
import { defaultSettings, normalizeSettings } from '../utils/settings';

const SettingsContext = createContext(null);
const storageKey = 'eventpilot.preferences.v1';

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    initializeDatabase().then((db) => db.getFirstAsync('SELECT value FROM AppPreferences WHERE key = ?', [storageKey])).then((stored) => {
      const parsed = stored ? normalizeSettings(JSON.parse(stored.value)) : defaultSettings;
      if (active) { setSettings(parsed); setReady(true); setError(''); }
    }).catch(() => { if (active) { setError('Unable to load preferences. Please retry.'); setReady(false); } });
    return () => { active = false; };
  }, [attempt]);
  async function update(patch) {
    if (busy.current || !ready) return;
    busy.current = true; setSaving(true); setError('');
    const next = normalizeSettings({ ...settings, ...patch });
    setSettings(next);
    try {
      const db = await initializeDatabase();
      await db.runAsync('INSERT INTO AppPreferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [storageKey, JSON.stringify(next)]);
      setSettings(next);
    }
    catch { setSettings(settings); setError('Unable to save preferences. Please try again.'); }
    finally { busy.current = false; setSaving(false); }
  }
  return <SettingsContext.Provider value={{ settings, ready, error, saving, update, retry: () => setAttempt((value) => value + 1) }}>{children}</SettingsContext.Provider>;
}

export function useSettings() { return useContext(SettingsContext); }
