import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>EventPilot</Text>
      <Text style={styles.subtitle}>Smart Event Planning Assistant</Text>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  title: {
    color: colors.heading,
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 26,
    marginTop: 12,
    textAlign: 'center',
  },
});
