import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/theme';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
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
