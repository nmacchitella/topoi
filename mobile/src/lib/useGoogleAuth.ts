import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { authApi } from './api';
import { setAccessToken, setRefreshToken } from './auth-storage';
import { updateCachedToken } from './api';
import { useStore } from '../store/useStore';

// Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// Google OAuth client IDs
const WEB_CLIENT_ID = '225541124646-6snkt0g3ebf0d22rlhing7quipqut21i.apps.googleusercontent.com';
const IOS_CLIENT_ID = '225541124646-uc53k8gb43olut5bab6keiksvtlri3ii.apps.googleusercontent.com';

// For iOS OAuth, use the reversed client ID as the redirect URI scheme
const IOS_REDIRECT_URI = 'com.googleusercontent.apps.225541124646-uc53k8gb43olut5bab6keiksvtlri3ii:/oauthredirect';

export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setToken, setRefreshToken: setStoreRefreshToken, setUser } = useStore();

  // Use explicit redirect URI for iOS with reversed client ID
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    redirectUri: IOS_REDIRECT_URI,
  });

  // Log the actual OAuth URL being used
  useEffect(() => {
    if (request?.url) {
      console.log('OAuth URL:', request.url);
    }
  }, [request]);

  useEffect(() => {
    handleGoogleResponse();
  }, [response]);

  const handleGoogleResponse = async () => {
    console.log('Google auth response:', response?.type);

    if (response?.type === 'success') {
      setIsLoading(true);
      setError(null);

      try {
        const { id_token } = response.params;

        if (!id_token) {
          throw new Error('No ID token received from Google');
        }

        console.log('Got ID token, sending to backend...');

        // Send ID token to our backend
        const authResponse = await authApi.googleMobileAuth(id_token);

        // Save tokens
        await setAccessToken(authResponse.access_token);
        await setRefreshToken(authResponse.refresh_token);
        updateCachedToken(authResponse.access_token);

        // Update store
        setToken(authResponse.access_token);
        setStoreRefreshToken(authResponse.refresh_token);

        // Fetch full user data
        const user = await authApi.getCurrentUser();
        setUser(user);

        console.log('Google sign-in successful!');
      } catch (err: any) {
        console.error('Google auth error:', err);
        setError(err.response?.data?.detail || err.message || 'Google sign-in failed');
      } finally {
        setIsLoading(false);
      }
    } else if (response?.type === 'error') {
      console.error('Google auth error response:', response.error);
      setError(response.error?.message || 'Google sign-in failed');
    } else if (response?.type === 'dismiss') {
      console.log('Google auth dismissed by user');
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    try {
      console.log('Starting Google sign-in...');
      await promptAsync();
    } catch (err: any) {
      console.error('promptAsync error:', err);
      setError(err.message || 'Failed to start Google sign-in');
    }
  };

  return {
    signInWithGoogle,
    isLoading,
    error,
    isReady: !!request,
  };
}
