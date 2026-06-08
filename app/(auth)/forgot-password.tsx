import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      Alert.alert(
        'OTP Sent',
        'A 6-digit verification code has been sent to your email.'
      );
      setStep(2);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('Error', 'OTP code must be exactly 6 digits');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Step A: Verify the OTP token for password recovery
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery',
      });

      if (verifyError) throw verifyError;

      // Step B: Set the new password for the current session established by verifyOtp
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      Alert.alert(
        'Success',
        'Your password has been successfully reset. Please log in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Sign out from the recovery session and go to login
              supabase.auth.signOut().then(() => {
                router.replace('/(auth)/login');
              });
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 8) }]}>
        {/* Background Image Deactivated */}

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
              {step === 1 ? (
                /* Step 1: Input Email */
                <View style={styles.form}>
                  <Text style={styles.sectionTitle}>Reset Password</Text>
                  <Text style={styles.sectionDesc}>
                    Enter your registered email below to receive a 6-digit OTP verification code.
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address</Text>
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

                  {/* Primary Action Button */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      {
                        backgroundColor: pressed ? '#007dd4' : '#3897f0',
                        transform: [{ scale: pressed ? 0.96 : 1 }],
                      },
                    ]}
                    onPress={handleSendOTP}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send OTP Code</Text>
                    )}
                  </Pressable>

                  {/* Bottom Navigation */}
                  <View style={styles.navigationRow}>
                    <Link href="/(auth)/login" asChild>
                      <TouchableOpacity activeOpacity={0.7}>
                        <Text style={styles.navigationTextPrimary}>Back to Login</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                </View>
              ) : (
                /* Step 2: Input OTP & New Password */
                <View style={styles.form}>
                  <Text style={styles.sectionTitle}>Verification</Text>
                  <Text style={styles.sectionDesc}>
                    Enter the 6-digit code sent to your email and set your new password.
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Verification Code</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="keypad-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit OTP..."
                        placeholderTextColor="#444446"
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter new password..."
                        placeholderTextColor="#444446"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm New Password</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm new password..."
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
                      },
                    ]}
                    onPress={handleResetPassword}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Reset Password</Text>
                    )}
                  </Pressable>

                  {/* Bottom Navigation */}
                  <View style={styles.navigationRow}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setStep(1)}>
                      <Text style={styles.navigationTextPrimary}>Change Email Address</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
  sectionTitle: {
    fontSize: 24, // typography.display-lg
    fontWeight: '600',
    color: '#ffffff', // colors.text-main
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 14, // typography.body
    fontWeight: '400',
    color: '#8e8e93', // colors.text-muted
    lineHeight: 20,
    marginBottom: 8,
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
