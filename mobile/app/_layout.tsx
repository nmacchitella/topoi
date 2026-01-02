import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useStore } from '../src/store/useStore';
import { getAccessToken, getRefreshToken } from '../src/lib/auth-storage';
import { updateCachedToken } from '../src/lib/api';
import ThemeProvider from '../src/components/ThemeProvider';

import '../global.css';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Custom hook for auth-based navigation
function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useStore();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated and in auth group
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isInitialized]);
}

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const { setToken, setRefreshToken, setInitialized } = useStore();

  useEffect(() => {
    // Initialize auth state from secure storage
    const initializeAuth = async () => {
      try {
        const accessToken = await getAccessToken();
        const refreshToken = await getRefreshToken();

        if (accessToken) {
          setToken(accessToken);
          updateCachedToken(accessToken);
        }
        if (refreshToken) {
          setRefreshToken(refreshToken);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setInitialized(true);
        setIsLoading(false);
        SplashScreen.hideAsync();
      }
    };

    initializeAuth();
  }, []);

  // Use the protected route hook
  useProtectedRoute();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#252523' }}>
        <ActivityIndicator size="large" color="#DE7356" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#252523',
            },
            headerTintColor: '#faf9f5',
            headerTitleStyle: {
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: '#252523',
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen
            name="place/[id]"
            options={{
              title: 'Place Details',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="place/new"
            options={{
              title: 'Add Place',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="user/[id]"
            options={{
              title: 'Profile',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              title: 'Settings',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="notifications"
            options={{
              title: 'Notifications',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="collection/[id]"
            options={{
              title: 'Collection',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="tag/[id]"
            options={{
              title: 'Tag',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="share/[token]"
            options={{
              title: 'Shared Map',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="shared/place/[id]"
            options={{
              title: 'Shared Place',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="shared/collection/[id]"
            options={{
              title: 'Shared Collection',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="import-preview"
            options={{
              title: 'Import Preview',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="edit-profile"
            options={{
              title: 'Edit Profile',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="terms-of-service"
            options={{
              title: 'Terms of Service',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="privacy-policy"
            options={{
              title: 'Privacy Policy',
              headerBackTitle: 'Back',
            }}
          />
        </Stack>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
