import { Feather, Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, useNavigation } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BillRepository } from '@/features/bills/repository/BillRepository';
import { scheduleBillReminders } from '@/core/services/notificationService';

const { width: screenWidth } = Dimensions.get('window');

const TAB_INFO: Record<string, { label: string; renderIcon: (color: string, size: number) => React.ReactNode }> = {
  index: {
    label: 'Home',
    renderIcon: (color, size) => <Feather name="home" size={size} color={color} strokeWidth={2.5} />,
  },
  spends: {
    label: 'Spends',
    renderIcon: (color, size) => <Ionicons name="swap-horizontal" size={size + 2} color={color} />,
  },
  schedules: {
    label: 'Schedules',
    renderIcon: (color, size) => <Feather name="calendar" size={size} color={color} strokeWidth={2.5} />,
  },
  bills: {
    label: 'Bills',
    renderIcon: (color, size) => <Ionicons name="card-outline" size={size + 2} color={color} />,
  },
};

const ActiveTabPill = ({ info }: { info: any }) => {
  const scale = useSharedValue(0.9);

  React.useEffect(() => {
    scale.value = withSpring(1.0, { mass: 0.5, damping: 10, stiffness: 130 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={[styles.activePill, animatedStyle]}>
      {info.renderIcon('#333D53', 18)}
      <Text style={styles.activeLabel}>{info.label}</Text>
    </Animated.View>
  );
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        const options = descriptors[route.key].options as any;
        const isFocused = state.index === index;

        const info = TAB_INFO[route.name];
        if (!info) return null;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.85}
          >
            {isFocused ? (
              <ActiveTabPill info={info} />
            ) : (
              <View style={styles.inactiveCircle}>
                {info.renderIcon('#333D53', 18)}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const navigation = useNavigation();

  React.useEffect(() => {
    const syncReminders = async () => {
      try {
        const storedEnabled = await AsyncStorage.getItem('isReminderEnabled');
        if (storedEnabled === 'true') {
          const storedStrategy = await AsyncStorage.getItem('reminderStrategy') || 'H-1';
          const billRepository = new BillRepository();
          const dbBills = await billRepository.getBills('offline-user');
          await scheduleBillReminders(dbBills || [], storedStrategy as any);
        }
      } catch (error) {
        console.error('Global bill notification sync failed:', error);
      }
    };

    syncReminders();

    const unsubscribe = navigation.addListener('state', () => {
      syncReminders();
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="spends" options={{ title: 'Spends' }} />
      <Tabs.Screen name="schedules" options={{ title: 'Schedules' }} />
      <Tabs.Screen name="bills" options={{ title: 'Bills' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 24,
    width: 327.82, // Sesuai spesifikasi mutlak Anda
    height: 60,    // Dipangkas dari 72px ke 60px agar lebih slim
    borderRadius: 24,
    backgroundColor: '#F3F4F9',
    borderWidth: 1,
    borderColor: '#E7EAF3',
    flexDirection: 'row',
    justifyContent: 'center', // Mengunci posisi ke tengah
    alignItems: 'center',
    alignSelf: 'center',       // Memastikan container utama tetap berada di as tengah layar HP
    gap: 14,                  // Mengunci jarak antar page pas 14px!
    ...Platform.select({
      ios: {
        shadowColor: '#333D53',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  activePill: {
    width: 113,      // Dimensi ketika tombol dipilih
    height: 45,
    borderRadius: 22.5, // Perfect Pill capsule (Setengah dari tinggi 45px)
    backgroundColor: '#F2F5FF',
    borderWidth: 0.5,
    borderColor: '#333D53',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333D53',
  },
  inactiveCircle: {
    width: 46,       // Dimensi ketika tombol tidak dipilih
    height: 46,
    borderRadius: 23,   // Lingkaran bulat sempurna (Setengah dari 46px)
    backgroundColor: '#F3F4F9',
    borderWidth: 0.5,
    borderColor: '#9EB3CD',
    justifyContent: 'center',
    alignItems: 'center',
  },
});