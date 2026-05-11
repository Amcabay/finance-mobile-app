import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lock, Loader2, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    try {
      // Basic validation
      if (!username || !password) {
        throw new Error('Username dan password harus diisi.');
      }

      const { data, error } = await supabase
        .from('ff_user')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "exact one row expected, but found no rows"
        throw new Error(error.message);
      }
      
      if (!data) {
        throw new Error('Username atau password salah.');
      }

      // Store the user ID in AsyncStorage to persist the session.
      // We convert it to String to avoid "java.lang.Double cannot be cast to java.lang.String" on Android
      await AsyncStorage.setItem('user_session', String(data.id));

      // On successful login, navigate to the main app screen.
      router.replace('/(tabs)');
      
    } catch (err: any) {
      Alert.alert('Login Gagal', err.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(colorScheme || 'light');

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <View style={styles.innerContainer}>
          <View style={styles.header}>
            <ThemedText type="title">FinanceFlow</ThemedText>
            <ThemedText type="subtitle">Login untuk melanjutkan</ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <User
                size={20}
                color={Colors[colorScheme || 'light'].icon}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={Colors[colorScheme || 'light'].text}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock
                size={20}
                color={Colors[colorScheme || 'light'].icon}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors[colorScheme || 'light'].text}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={20} color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Masuk</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const getStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
    },
    keyboardAvoidingContainer: {
      flex: 1,
    },
    innerContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    header: {
      alignItems: 'center',
      marginBottom: 48,
    },
    form: {
      width: '100%',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      borderRadius: 12,
      marginBottom: 16,
      backgroundColor: Colors[colorScheme].card,
    },
    inputIcon: {
      marginLeft: 12,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 12,
      fontSize: 16,
      color: Colors[colorScheme].text,
    },
    button: {
      backgroundColor: '#059669', // emerald-600
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
