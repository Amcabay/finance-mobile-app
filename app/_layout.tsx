import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, InteractionManager, View } from 'react-native';
import 'react-native-reanimated';

import { initDatabase } from '@/core/database/sqlite';

export const unstable_settings = {
  anchor: '(tabs)',
};

const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF',
  },
};

function RootLayoutNav() {
  const router = useRouter();
  // State untuk mengunci render sampai SQLite benar-benar siap
  const [isDbReady, setIsDbReady] = useState(false);

  // Inisialisasi basis data SQLite lokal
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initDatabase();
        console.log('✅ Local Database Initialized Successfully');
        setIsDbReady(true); // Database siap! Buka kunci render
      } catch (error) {
        console.error('❌ Failed to Initialize Local Database:', error);
      }
    };

    const task = InteractionManager.runAfterInteractions(() => {
      initializeApp();
    });

    return () => task.cancel();
  }, []);

  // Memaksa navigasi melompat ke Home HANYA setelah DB dikonfirmasi siap
  useEffect(() => {
    if (!isDbReady) return;

    const navigateToHome = () => {
      try {
        router.replace('/(tabs)');
      } catch (error) {
        console.error('⚠️ Force Redirect Navigation Deferred:', error);
      }
    };

    navigateToHome();
  }, [isDbReady, router]);

  // Tampilkan loading screen minimalis selama database sedang disiapkan
  if (!isDbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#333D53" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ThemeProvider value={CustomLightTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          {/* <Stack.Screen name="(auth)/login" /> */}
          {/* <Stack.Screen name="(auth)/register" /> */}
          {/* <Stack.Screen name="(auth)/forgot-password" /> */}
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </View>
  );
}

export default function RootLayout() {
  return <RootLayoutNav />;
}