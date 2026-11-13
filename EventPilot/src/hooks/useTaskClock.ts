import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** One shared clock for badges/counts/sorting; no polling SQLite or background job. */
export function useTaskClock(): number {
  const [now, setNow] = useState(Date.now);
  useFocusEffect(useCallback(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') update();
    }, 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []));
  return now;
}
