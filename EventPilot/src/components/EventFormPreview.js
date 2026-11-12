import { StyleSheet, View } from 'react-native';
import { cardStyle, spacing } from '../constants/theme';
import AppInput from './AppInput';
import AppButton from './AppButton';

export default function EventFormPreview() {
  return <View style={styles.card}>
    <AppInput label="Event name" placeholder="e.g. Summer celebration" editable={false} hint="Form preview — editing will be available soon." />
    <AppInput label="Date" placeholder="Choose a date" editable={false} />
    <AppInput label="Location" placeholder="Add a venue or address" editable={false} />
    <AppInput label="Notes" placeholder="The details that make it special…" multiline editable={false} />
    <AppButton title="Save event · coming soon" disabled />
  </View>;
}
const styles = StyleSheet.create({ card: { ...cardStyle, gap: spacing.xl } });
