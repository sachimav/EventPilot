import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { Pressable, View } from 'react-native';
import { colors } from '../constants/theme';
import NotificationBell from './NotificationBell';

export default function HeaderActions() {
  const pathname = usePathname();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <NotificationBell />
    <Pressable accessibilityRole="button" accessibilityLabel="Settings" accessibilityState={{ disabled: pathname === '/settings' }} disabled={pathname === '/settings'} onPress={() => router.push('/settings')} style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name={pathname === '/settings' ? 'settings' : 'settings-outline'} size={24} color={colors.primary} />
    </Pressable>
  </View>;
}
