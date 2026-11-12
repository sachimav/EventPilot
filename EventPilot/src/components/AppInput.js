import { useId } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, touchTarget, typography } from '../constants/theme';

/** @param {import('react-native').TextInputProps & { label: string, hint?: string, error?: string }} props */
export default function AppInput({ label, hint, error, style, ...props }) {
  const id = useId();
  return (
    <View style={styles.field}>
      <Text nativeID={id} style={styles.label}>{label}</Text>
      <TextInput {...props} accessibilityLabel={label} accessibilityLabelledBy={id} placeholderTextColor={colors.text}
        selectionColor={colors.primary} style={[styles.input, props.multiline && styles.multiline, props.editable === false && styles.disabled, error && styles.invalid, style]} />
      {(error || hint) ? <Text accessibilityLiveRegion={error ? 'polite' : 'none'} style={[styles.hint, error && styles.error]}>{error || hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { ...typography.label, color: colors.heading },
  input: { ...typography.body, color: colors.heading, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, minHeight: touchTarget, padding: spacing.lg },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  disabled: { backgroundColor: colors.background },
  invalid: { borderColor: colors.danger },
  hint: { ...typography.caption, color: colors.text },
  error: { color: colors.danger },
});
