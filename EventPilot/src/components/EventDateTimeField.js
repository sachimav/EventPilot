import { useTheme } from '../hooks/useTheme';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppButton from './AppButton';
import { spacing } from '../constants/theme';
import { dateString, timeString, validDate } from '../utils/eventForm';
export default function EventDateTimeField({ mode, value, onChange, error, disabled, label: customLabel, required = true }) {
  const theme = useTheme();
  const { colors } = theme;
    const [open, setOpen] = useState(false);
    const label = customLabel ?? (mode === 'date' ? 'Date' : 'Time');
    const selected = mode === 'date' && validDate(value) ? new Date(`${value}T12:00:00`) : new Date();
    if (mode === 'time' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
        const [hours, minutes] = value.split(':').map(Number);
        selected.setHours(hours, minutes, 0, 0);
    }
    return <View style={{ gap: spacing.sm }}>
    <Text style={{ color: colors.heading, fontWeight: '600' }}>{label} {required ? '*' : '(optional)'}</Text>
    <AppButton title={value || `Choose ${label.toLowerCase()}`} variant="secondary" disabled={disabled} onPress={() => setOpen(true)}/>
    {open && !disabled && <>
      <DateTimePicker themeVariant={theme.dark ? 'dark' : 'light'} textColor={colors.heading} mode={mode} value={selected} display={Platform.OS === 'ios' ? 'spinner' : 'default'} is24Hour onValueChange={(_, date) => {
                onChange(mode === 'date' ? dateString(date) : timeString(date));
                if (Platform.OS !== 'ios')
                    setOpen(false);
            }} onDismiss={() => setOpen(false)}/>
      {Platform.OS === 'ios' && <AppButton title="Done" variant="secondary" onPress={() => {
                    // Accept the displayed value even if the wheel was not moved.
                    if (!value)
                        onChange(mode === 'date' ? dateString(selected) : timeString(selected));
                    setOpen(false);
                }}/>}
    </>}
    {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
  </View>;
}
