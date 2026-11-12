import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../constants/theme';
import AppButton from './AppButton';
import ScreenHeader from './ScreenHeader';

/** @param {{ href: import('expo-router').Href, children: import('react').ReactNode }} props */
export function NavigationButton({ href, children }) {
  return <AppButton href={href} title={String(children)} />;
}

/** @param {{ title: string, description: string, children?: import('react').ReactNode }} props */
export default function PlaceholderScreen({ title, description, children }) {
  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <ScreenHeader title={title} subtitle={description} />
        <View style={styles.children}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.xl, width: '100%', maxWidth: 720, alignSelf: 'center' },
  children: { gap: spacing.lg },
});
