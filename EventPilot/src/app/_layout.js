import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { initializeDatabase } from '../database';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
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

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, backgroundColor: colors.background }}>
        <StatusBar style="dark" />
        {error ? <>
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>Unable to open your local database. Please try again.</Text>
          <Button title="Retry" onPress={() => { setError(false); setAttempt((value) => value + 1); }} />
        </> : <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading your local database" />}
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTitleStyle: { color: colors.heading }, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="events/create" options={{ title: 'Create Event' }} />
        <Stack.Screen name="events/[id]/index" options={{ title: 'Event Details' }} />
        <Stack.Screen name="events/[id]/edit" options={{ title: 'Edit Event' }} />
        <Stack.Screen name="events/[id]/timeline" options={{ title: 'Event Timeline' }} />
      </Stack>
    </>
  );
}
