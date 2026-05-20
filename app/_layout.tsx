import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { InteractionManager, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/auth';
import { initDatabase } from '@/core/database/sqlite';
import { BillRepository } from '@/features/bills/repository/BillRepository';
import { supabase } from '@/utils/supabase';

export const unstable_settings = {
  anchor: '(tabs)',
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
  },
};

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      const runSanityCheck = async () => {
        try {
          // Force sign out to clean session stuck in emulator
          await supabase.auth.signOut();
          console.log('🔄 Forced Supabase Sign Out Success');

          await initDatabase();
          console.log('✅ Database Initialized');

          const billRepo = new BillRepository();
          
          // Add a dummy bill to check writing and raw amount storage
          const dummyBill = await billRepo.add('test-user-123', {
            name: 'Wifi Internet',
            amount: 50000,
            category: 'Internet',
            frequency: 'monthly',
            billing_day: 15,
            active: true,
          });
          console.log('➕ Dummy Bill Added:', dummyBill);

          // Fetch all pending unsynced records to verify the repository returns them
          const unsynced = await billRepo.getUnsynced();
          console.log('📦 Data Unsynced:', unsynced);
        } catch (error) {
          console.error('❌ Database Sanity Check Failed:', error);
        }
      };

      runSanityCheck();
    });

    return () => task.cancel();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to the sign-in page if the user is not signed in
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect away from the sign-in page if the user is signed in
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <ThemeProvider value={CustomDarkTheme}>
        <Stack>
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
