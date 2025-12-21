import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../src/lib/api';

export default function VerificationRequiredScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResendVerification = async () => {
    if (!email) {
      setError('No email address provided');
      return;
    }

    setIsResending(true);
    setError('');
    setResendSuccess(false);

    try {
      await authApi.resendVerification(email);
      setResendSuccess(true);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to resend verification email';
      setError(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="mail-outline" size={80} color="#DE7356" />
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification link to{'\n'}
          <Text style={styles.email}>{email || 'your email'}</Text>
        </Text>
        <Text style={styles.instructions}>
          Please check your inbox and click the verification link to activate your account.
        </Text>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {resendSuccess ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <Text style={styles.successText}>Verification email sent!</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.resendButton, isResending && styles.buttonDisabled]}
          onPress={handleResendVerification}
          disabled={isResending}
        >
          {isResending ? (
            <ActivityIndicator color="#DE7356" />
          ) : (
            <Text style={styles.resendButtonText}>Resend Verification Email</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.backButton}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252523',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#faf9f5',
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a3a3a3',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  email: {
    color: '#DE7356',
    fontWeight: '600',
  },
  instructions: {
    fontSize: 14,
    color: '#737373',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444420',
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E20',
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  successText: {
    color: '#22C55E',
    flex: 1,
  },
  resendButton: {
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#DE7356',
  },
  resendButtonText: {
    color: '#DE7356',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 16,
    marginTop: 16,
  },
  backButtonText: {
    color: '#a3a3a3',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
