import { useId } from 'react';
import { Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';
export default function EventDateTimeField({ mode, value, onChange, error, disabled, label: customLabel, required = true }) {
    const id = useId();
    const label = customLabel ?? (mode === 'date' ? 'Date' : 'Time');
    return <View style={{ gap: spacing.sm }}>
    <label htmlFor={id} style={{ color: colors.heading, fontWeight: 600 }}>{label} {required ? '*' : '(optional)'}</label>
    <input id={id} type={mode} value={value} required={required} disabled={disabled} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => onChange(event.target.value)} style={{ minHeight: 48, padding: 12, boxSizing: 'border-box', border: `1px solid ${error ? colors.danger : colors.border}`, borderRadius: 16, color: colors.heading, backgroundColor: colors.surface, font: 'inherit' }}/>
    {error && <Text nativeID={`${id}-error`} accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
  </View>;
}
