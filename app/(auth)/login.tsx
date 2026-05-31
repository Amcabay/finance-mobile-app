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

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (loginError) throw new Error('Invalid email or password');
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
              <Image 
                source={require('../../assets/images/logo.jpg')} 
                style={styles.logo} 
                resizeMode="contain"
              />
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

                {/* Extras (Remember me & Forgot Password) */}
                <View style={styles.extrasRow}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    activeOpacity={0.7}
                    onPress={() => setRememberMe(!rememberMe)}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Remember me</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    activeOpacity={0.7} 
                    onPress={() => router.push('/(auth)/forgot-password' as any)}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
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
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Login</Text>
                  )}
                </Pressable>

                {/* Bottom Navigation */}
                <View style={styles.navigationRow}>
                  <Text style={styles.navigationTextMuted}>Don't have an account? </Text>
                  <TouchableOpacity 
                    activeOpacity={0.7} 
                    onPress={() => router.push('/register' as any)}
                  >
                    <Text style={styles.navigationTextPrimary}>Register</Text>
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
    marginTop: 50,
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 16,
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
  extrasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#303030', // colors.border-field
    backgroundColor: '#16161a', // colors.input-bg
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#3897f0', // colors.primary
    borderColor: '#3897f0',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8e8e93', // colors.text-muted
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3897f0', // colors.primary
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
