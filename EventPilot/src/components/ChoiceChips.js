import { useThemedStyles } from '../hooks/useTheme';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../constants/theme';
export default function ChoiceChips({ label, choices, value, onChange, disabled = false, error }) {
  const styles = useThemedStyles(createStyles);
    return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.choices}>{choices.map((choice) => <Pressable key={choice.value} accessibilityRole="button" accessibilityLabel={`${label}: ${choice.label}`} accessibilityState={{ selected: choice.value === value, disabled }} disabled={disabled} onPress={() => onChange(choice.value)} style={({ pressed }) => [styles.chip, choice.value === value && styles.selected, (pressed || disabled) && styles.dim]}>
      <Text style={[styles.text, choice.value === value && styles.selectedText]}>{choice.label}</Text>
    </Pressable>)}</View>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}
const createStyles = ({ colors }) => StyleSheet.create({
    field: { gap: spacing.sm }, label: { ...typography.label, color: colors.heading },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { minHeight: 48, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.surface, justifyContent: 'center' },
    selected: { backgroundColor: colors.primary, borderColor: colors.primary },
    text: { ...typography.label, color: colors.text }, selectedText: { color: colors.onPrimary },
    dim: { opacity: 0.65 }, error: { color: colors.danger },
});
