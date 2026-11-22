export const colors = {
  primary: '#6C3CE1',
  primarySoft: '#EEE8FC',
  background: '#F8F9FC',
  surface: '#FFFFFF',
  heading: '#211A35',
  text: '#686276',
  border: '#E6E3ED',
  danger: '#B4233B',
  disabled: '#E8E5EE',
  onPrimary: '#FFFFFF',
  success: '#16705A', successSoft: '#E6F5EE',
  info: '#245AB5', infoSoft: '#EAF1FF',
  warning: '#8A4B08', warningSoft: '#FFF1D6',
  dangerSoft: '#FFF5F6', dangerBorder: '#F1B8C2',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radii = { sm: 10, md: 16, lg: 24, pill: 999 };
export const touchTarget = 48;
export const typography = {
  hero: { fontSize: 32, lineHeight: 40, fontWeight: /** @type {const} */ ('700') },
  title: { fontSize: 26, lineHeight: 34, fontWeight: /** @type {const} */ ('700') },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: /** @type {const} */ ('600') },
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: /** @type {const} */ ('600') },
  caption: { fontSize: 13, lineHeight: 20 },
};
export const cardStyle = {
  backgroundColor: colors.surface,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.xl,
};

const darkColors = {
  primary: '#BA9AFF', primarySoft: '#302444',
  background: '#121019', surface: '#1E1A29',
  heading: '#F3EFFA', text: '#BDB5CC', border: '#3C344B',
  danger: '#FF91A4', disabled: '#302B3A', onPrimary: '#211331',
  success: '#79D7B1', successSoft: '#163C30',
  info: '#97BEFF', infoSoft: '#20324F',
  warning: '#F2C475', warningSoft: '#44331C',
  dangerSoft: '#421F2C', dangerBorder: '#804053',
};

export function createTheme(mode = 'light') {
  const palette = mode === 'dark' ? darkColors : colors;
  return {
    dark: mode === 'dark', colors: palette,
    cardStyle: { ...cardStyle, backgroundColor: palette.surface, borderColor: palette.border },
  };
}
