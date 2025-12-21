import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../src/lib/api';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setError('No verification token provided');
      setIsVerifying(false);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      await authApi.verifyEmail(verificationToken);
      setIsSuccess(true);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Verification failed. The link may have expired.';
      setError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#DE7356" />
          <Text style={styles.loadingText}>Verifying your email...</Text>
        </View>
      </View>
    );
  }

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.subtitle}>
            Your email has been successfully verified. You can now access all features.
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.buttonText}>Continue to Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="close-circle" size={80} color="#EF4444" />
        <Text style={styles.title}>Verification Failed</Text>
        <Text style={styles.subtitle}>{error}</Text>
        <Pressable
          style={styles.button}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.buttonText}>Back to Login</Text>
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
  loadingText: {
    fontSize: 16,
    color: '#a3a3a3',
    marginTop: 16,
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
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#DE7356',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 32,
  },
  buttonText: {
    color: '#faf9f5',
    fontSize: 16,
    fontWeight: '600',
  },
});
