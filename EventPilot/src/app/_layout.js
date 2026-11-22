import { useTheme } from '../hooks/useTheme';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Platform, Text, View } from 'react-native';
import { initializeDatabase } from '../database';
import FeedbackHost from '../components/FeedbackHost';
import HeaderActions from '../components/HeaderActions';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  return <SettingsProvider><RootContent /></SettingsProvider>;
}

function RootContent() {
  const theme = useTheme();
  const { colors, dark } = theme;
  const navigationTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary, background: colors.background, card: colors.surface,
      text: colors.heading, border: colors.border, notification: colors.danger,
    },
  };
  const { ready: preferencesReady, error: preferencesError } = useSettings();
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
      document.body.style.backgroundColor = colors.background;
    }
  }, [dark, colors.background]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    initializeDatabase().then(
      () => { if (active) setReady(true); },
      (cause) => {
        console.error('Database initialization failed', cause);
        if (active) setError(true);
      },
    );
    return () => { active = false; };
  }, [attempt]);

  if (!ready || (!preferencesReady && !preferencesError)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, backgroundColor: colors.background }}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        {error ? <>
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>Unable to open your local database. Please try again.</Text>
          <Button title="Retry" onPress={() => { setError(false); setAttempt((value) => value + 1); }} />
        </> : <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading your local database" />}
      </View>
    );
  }

  return (
    <ThemeProvider value={navigationTheme}><View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerRight: () => <HeaderActions />, headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTitleStyle: { color: colors.heading }, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="events/create" options={{ title: 'Create Event' }} />
        <Stack.Screen name="events/[id]/index" options={{ title: 'Event Details' }} />
        <Stack.Screen name="events/[id]/edit" options={{ title: 'Edit Event' }} />
        <Stack.Screen name="events/[id]/timeline" options={{ title: 'Event Timeline' }} />
        <Stack.Screen name="events/[id]/tasks" options={{ title: 'Event Tasks' }} />
        <Stack.Screen name="events/[id]/budget" options={{ title: 'Event Budget' }} />
        <Stack.Screen name="events/[id]/guests" options={{ title: 'Event Guests' }} />
        <Stack.Screen name="events/[id]/vendors" options={{ title: 'Event Vendors' }} />
        <Stack.Screen name="events/[id]/reports" options={{ title: 'Reports & Sharing' }} />
        <Stack.Screen name="guests" options={{ title: 'Guest Management' }} />
        <Stack.Screen name="vendors" options={{ title: 'Vendor Management' }} />
        <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
        <Stack.Screen name="data" options={{ title: 'Data & Recovery' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
      <FeedbackHost />
    </View></ThemeProvider>
  );
}
