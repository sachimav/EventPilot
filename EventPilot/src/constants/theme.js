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
