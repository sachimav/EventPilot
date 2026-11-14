import { Link } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, touchTarget, typography } from '../constants/theme';

/** @param {{ title: string, href?: import('expo-router').Href, onPress?: import('react-native').PressableProps['onPress'], variant?: 'primary' | 'secondary' | 'danger', icon?: import('react').ComponentProps<typeof Ionicons>['name'], disabled?: boolean }} props */
export default function AppButton({ title, href, onPress, variant = 'primary', icon, disabled = false }) {
  const [pressed, setPressed] = useState(false);
  const isLink = !!href && !disabled;
  const buttonStyle = StyleSheet.flatten([styles.button, variant === 'secondary' && styles.secondary, variant === 'danger' && styles.danger, pressed && styles.pressed, disabled && styles.disabled]);
  const button = (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)}
      style={isLink ? undefined : buttonStyle}>
      {icon && <Ionicons name={icon} size={20} color={disabled ? colors.text : variant === 'secondary' ? colors.primary : colors.surface} />}
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel, disabled && styles.disabledLabel]}>{title}</Text>
    </Pressable>
  );
  return href && !disabled ? <Link href={href} style={buttonStyle} asChild>{button}</Link> : button;
}

const styles = StyleSheet.create({
  button: { minHeight: touchTarget + 4, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.primary, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  label: { ...typography.body, fontWeight: '600', color: colors.surface, textAlign: 'center', flexShrink: 1 },
  secondary: { backgroundColor: colors.primarySoft },
  secondaryLabel: { color: colors.primary },
  danger: { backgroundColor: colors.danger },
  pressed: { opacity: 0.75 },
  disabled: { backgroundColor: colors.disabled },
  disabledLabel: { color: colors.text },
});
