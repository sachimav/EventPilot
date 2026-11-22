import { useMemo } from 'react';
import { createTheme } from '../constants/theme';
import { useSettings } from './useSettings';

export function useTheme() {
  const { settings } = useSettings();
  return useMemo(() => createTheme(settings.theme), [settings.theme]);
}

export function useThemedStyles(factory) {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
