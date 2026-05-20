import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { data, error: regError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (regError) throw regError;
      
      if (data.user && data.session) {
        Alert.alert('Success', 'Account created and logged in!');
      } else if (data.user) {
        Alert.alert('Success', 'Check your email for confirmation link!');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 8) }]}>
        {/* Asset Image Background */}
        <Image
          source={require('../../assets/images/BackgroundMB.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Brand Space */}
            <View style={styles.brandContainer}>
              <Text style={styles.brandTitle}>FinanceFlow</Text>
              <Text style={styles.brandSubtitle}>Premium Asset Management</Text>
            </View>

            {/* Main Card (Laci Melengkung) */}
            <View style={[styles.authCard, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              {/* Form */}
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email..."
                      placeholderTextColor="#444446"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password..."
                      placeholderTextColor="#444446"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm your password..."
                      placeholderTextColor="#444446"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Primary Action Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: pressed ? '#007dd4' : '#3897f0',
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    }
                  ]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Register</Text>
                  )}
                </Pressable>

                {/* Bottom Navigation */}
                <View style={styles.navigationRow}>
                  <Text style={styles.navigationTextMuted}>Already have an account? </Text>
                  <TouchableOpacity 
                    activeOpacity={0.7} 
                    onPress={() => router.push('/login' as any)}
                  >
                    <Text style={styles.navigationTextPrimary}>Login</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.footerText}>Version 1.1</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // colors.canvas-bg
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  brandTitle: {
    fontSize: 32, // typography.display-hero size
    fontWeight: '600',
    color: '#ffffff', // colors.text-main
    letterSpacing: -0.5,
    lineHeight: 35,
  },
  brandSubtitle: {
    fontSize: 16, // typography.body
    fontWeight: '400',
    color: '#8e8e93', // colors.text-muted
    marginTop: 8,
    lineHeight: 22,
  },
  authCard: {
    backgroundColor: '#121214', // colors.surface-card
    borderTopLeftRadius: 24, // rounded.lg
    borderTopRightRadius: 24, // rounded.lg
    paddingTop: 32, // breathing room padding
    paddingHorizontal: 24,
    flex: 1,
    marginTop: 'auto',
  },
  form: {
    gap: 24, // Let the UI breathe
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16, // typography.body-strong
    fontWeight: '600',
    color: '#ffffff', // colors.text-main
    lineHeight: 22,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161a', // colors.input-bg
    borderWidth: 1,
    borderColor: '#303030', // colors.border-field
    borderRadius: 8, // rounded.sm
    height: 52,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#ffffff', // colors.text-main
    fontSize: 16, // typography.body
    fontWeight: '400',
  },
  primaryButton: {
    height: 52,
    borderRadius: 9999, // rounded.pill
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#ffffff', // colors.text-main
    fontSize: 16, // typography.button
    fontWeight: '600',
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  navigationTextMuted: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8e8e93', // colors.text-muted
  },
  navigationTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3897f0', // colors.primary
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 13, // typography.caption
    fontWeight: '400',
    color: '#8e8e93', // colors.text-muted
    lineHeight: 16,
  },
});
