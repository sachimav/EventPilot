import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, touchTarget, typography } from '../constants/theme';

/** @param {{ title: string, href?: import('expo-router').Href, onPress?: import('react-native').PressableProps['onPress'], variant?: 'primary' | 'secondary', disabled?: boolean }} props */
export default function AppButton({ title, href, onPress, variant = 'primary', disabled = false }) {
  const button = (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.button, variant === 'secondary' && styles.secondary, pressed && styles.pressed, disabled && styles.disabled]}>
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel, disabled && styles.disabledLabel]}>{title}</Text>
    </Pressable>
  );
  return href && !disabled ? <Link href={href} asChild>{button}</Link> : button;
}

const styles = StyleSheet.create({
  button: { minHeight: touchTarget, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.body, fontWeight: '600', color: colors.surface, textAlign: 'center' },
  secondary: { backgroundColor: colors.primarySoft },
  secondaryLabel: { color: colors.primary },
  pressed: { opacity: 0.75 },
  disabled: { backgroundColor: colors.disabled },
  disabledLabel: { color: colors.text },
});
