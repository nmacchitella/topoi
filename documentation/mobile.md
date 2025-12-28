# Mobile App (React Native/Expo)

The Topoi mobile app is built with Expo and React Native, sharing business logic with the web frontend while providing native iOS and Android experiences.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Expo SDK 54 | Development framework |
| React Native 0.81.5 | UI framework |
| Expo Router | File-based navigation |
| NativeWind | Tailwind CSS for React Native |
| Zustand | State management |
| React Native Maps | Native map component |
| Expo SecureStore | Secure token storage |
| Expo Auth Session | Google OAuth |

## Project Structure

```
mobile/
├── app/                          # Expo Router pages
│   ├── (auth)/                   # Auth screens
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   ├── reset-password.tsx
│   │   ├── verify-email.tsx
│   │   ├── verification-required.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/                   # Main app with tab navigation
│   │   ├── index.tsx             # Map view (Places)
│   │   ├── explore.tsx           # Explore followed users' maps
│   │   ├── collections.tsx       # Collections (hidden tab)
│   │   ├── profile.tsx           # User profile
│   │   └── _layout.tsx
│   ├── place/
│   │   ├── [id].tsx              # Place details
│   │   └── new.tsx               # Create new place
│   ├── collection/
│   │   └── [id].tsx              # Collection details
│   ├── tag/
│   │   └── [id].tsx              # Tag details
│   ├── user/
│   │   └── [id].tsx              # User profile view
│   ├── share/
│   │   └── [token].tsx           # Share token handling
│   ├── shared/
│   │   ├── collection/[id].tsx   # Shared collection view
│   │   └── place/[id].tsx        # Shared place view
│   ├── notifications.tsx         # Notifications
│   ├── settings.tsx              # Settings
│   ├── import-preview.tsx        # CSV import
│   └── _layout.tsx               # Root layout
│
├── src/
│   ├── components/               # Shared components
│   │   ├── PlaceBottomSheet.tsx  # Custom animated bottom sheet
│   │   ├── CollectionInput.tsx   # Collection picker
│   │   ├── TagInput.tsx          # Tag picker
│   │   ├── TagIcon.tsx           # Tag icon renderer
│   │   ├── TagIconPicker.tsx     # Tag icon selector
│   │   ├── NotificationBell.tsx  # Notification indicator
│   │   ├── FollowedUsersSelector.tsx  # User selector for map layers
│   │   ├── ThemeProvider.tsx     # Theme context
│   │   └── ThemeToggle.tsx       # Dark/light mode toggle
│   ├── store/
│   │   └── useStore.ts           # Zustand store (shared logic)
│   ├── lib/
│   │   ├── api.ts                # Axios client
│   │   ├── auth-storage.ts       # SecureStore wrapper
│   │   ├── useGoogleAuth.ts      # Google OAuth hook
│   │   ├── theme.ts              # Theme utilities
│   │   └── tagColors.ts          # Tag color constants
│   └── types/
│       └── index.ts              # TypeScript interfaces
│
├── assets/                       # Images, fonts
├── app.config.js                 # Expo configuration
├── babel.config.js               # Babel configuration
├── tailwind.config.js            # NativeWind configuration
├── metro.config.js               # Metro bundler config
└── package.json
```

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Xcode (for iOS simulator)
- Android Studio (for Android emulator)
- Physical device with Expo Go app (optional)

### Installation

```bash
cd mobile

# Install dependencies
npm install

# iOS only: Install CocoaPods
cd ios && pod install && cd ..
```

### Environment Configuration

Create `mobile/.env`:

```env
API_URL=https://topoi-backend.fly.dev/api
DEV_API_URL=http://192.168.1.100:8000/api
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id
```

**Finding your local IP**:
```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'
```

### Running the App

**Development server**:
```bash
npm start
# or
npx expo start
```

**iOS Simulator**:
```bash
npx expo run:ios
# or press 'i' in the Expo CLI
```

**Android Emulator**:
```bash
npx expo run:android
# or press 'a' in the Expo CLI
```

**Physical Device**:
1. Install Expo Go from App Store / Play Store
2. Scan QR code from Expo CLI
3. Note: Some features require development build

## Key Components

### Map View

The map is implemented directly in `app/(tabs)/index.tsx` using `react-native-maps` with clustering:

```tsx
// app/(tabs)/index.tsx
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import PlaceBottomSheet from '../../src/components/PlaceBottomSheet';

export default function MapScreen() {
  const { places } = useStore();
  const [selectedPlace, setSelectedPlace] = useState(null);

  return (
    <View style={{ flex: 1 }}>
      <ClusteredMapView
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 40.7128,
          longitude: -74.0060,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {places.map(place => (
          <Marker
            key={place.id}
            coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}
            onPress={() => setSelectedPlace(place)}
          />
        ))}
      </ClusteredMapView>

      {selectedPlace && (
        <PlaceBottomSheet
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </View>
  );
}
```

### Bottom Sheet

Uses a custom animated bottom sheet with `Animated` API and `PanResponder`:

```tsx
// src/components/PlaceBottomSheet.tsx
import { Animated, PanResponder, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SNAP_POINTS = {
  CLOSED: 0,
  INITIAL: 0.35,  // 35% - compact view
  MEDIUM: 0.55,   // 55% - medium view
  FULL: 0.85,     // 85% - full view
};

export default function PlaceBottomSheet({ place, onClose }) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      // Handle drag gestures
    },
    onPanResponderRelease: (_, gestureState) => {
      // Snap to nearest point
    },
  });

  return (
    <Animated.View style={{ transform: [{ translateY }] }} {...panResponder.panHandlers}>
      <View className="p-4 bg-white rounded-t-3xl">
        <Text className="text-xl font-bold">{place.name}</Text>
        <Text className="text-gray-600">{place.address}</Text>
      </View>
    </Animated.View>
  );
}
```

### Auth Storage

Uses Expo SecureStore for token storage:

```typescript
// src/lib/auth-storage.ts
import * as SecureStore from 'expo-secure-store';

export async function setTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync('access_token', accessToken);
  await SecureStore.setItemAsync('refresh_token', refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('access_token');
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
}
```

### Google OAuth

Uses Expo Auth Session with a custom hook in `src/lib/useGoogleAuth.ts`:

```typescript
// src/lib/useGoogleAuth.ts
import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { authApi } from './api';
import { setAccessToken, setRefreshToken } from './auth-storage';
import { useStore } from '../store/useStore';

WebBrowser.maybeCompleteAuthSession();

// Google OAuth client IDs (from environment variables via app.config.js)
import Constants from 'expo-constants';

const WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId || '';
const IOS_CLIENT_ID = Constants.expoConfig?.extra?.googleIosClientId || '';
const IOS_REDIRECT_URI = `com.googleusercontent.apps.${IOS_CLIENT_ID.split('.')[0]}:/oauthredirect`;

export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setToken, setRefreshToken: setStoreRefreshToken, setUser } = useStore();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    redirectUri: IOS_REDIRECT_URI,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleResponse();
    }
  }, [response]);

  const handleGoogleResponse = async () => {
    if (response?.type !== 'success') return;

    setIsLoading(true);
    try {
      const { id_token } = response.params;

      // Send ID token to backend for verification
      const authResponse = await authApi.googleMobileAuth(id_token);

      // Save tokens to secure storage
      await setAccessToken(authResponse.access_token);
      await setRefreshToken(authResponse.refresh_token);

      // Update store
      setToken(authResponse.access_token);
      setStoreRefreshToken(authResponse.refresh_token);

      // Fetch full user data
      const user = await authApi.getCurrentUser();
      setUser(user);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    await promptAsync();
  };

  return { signInWithGoogle, isLoading, error, isReady: !!request };
}
```

The backend endpoint `POST /api/auth/google/mobile` verifies the ID token with Google and returns JWT tokens.

## State Management

The mobile app uses Zustand with a comprehensive store that mirrors the web app's functionality:

```typescript
// src/store/useStore.ts
import { create } from 'zustand';
import { placesApi, listsApi, tagsApi, authApi, notificationsApi, usersApi } from '../lib/api';
import { clearTokens, setTokens } from '../lib/auth-storage';

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  // Data
  places: Place[];
  lists: ListWithPlaceCount[];
  tags: TagWithUsage[];

  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Share Token
  shareToken: ShareToken | null;

  // Follow System
  followers: UserSearchResult[];
  following: UserSearchResult[];
  followRequests: UserSearchResult[];

  // Map Layers (View other users' maps)
  mapViewMode: 'profile' | 'layers';
  selectedFollowedUserIds: string[];
  followedUsersPlaces: Record<string, Place[]>;

  // UI State
  selectedPlaceId: string | null;
  selectedListId: string | null;
  selectedTagIds: string[];
  tagFilterMode: 'any' | 'all';
  searchQuery: string;
  viewMode: 'map' | 'list';

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchPlaces: () => Promise<void>;
  fetchLists: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  // ... more actions
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,
  places: [],
  lists: [],
  tags: [],
  notifications: [],
  unreadCount: 0,
  // ... initialization

  setTokens: async (accessToken, refreshToken) => {
    await setTokens(accessToken, refreshToken);
    set({ token: accessToken, refreshToken, isAuthenticated: true });
  },

  logout: async () => {
    await clearTokens();
    set({
      user: null,
      token: null,
      places: [],
      lists: [],
      tags: [],
      isAuthenticated: false
    });
  },

  fetchPlaces: async () => {
    const places = await placesApi.getAll();
    set({ places });
  },

  // ... more action implementations
}));
```

The store includes:
- **Authentication**: Token management, user state
- **Data**: Places, lists/collections, tags
- **Notifications**: Real-time notification state and unread count
- **Social**: Followers, following, follow requests
- **Map Layers**: View places from followed users on the map
- **UI State**: Filters, view modes, selection state

## Navigation

Expo Router provides file-based routing:

### Auth Flow

```tsx
// app/_layout.tsx
export default function RootLayout() {
  const { isAuthenticated, isInitialized } = useStore();

  if (!isInitialized) {
    return <SplashScreen />;
  }

  return (
    <Stack>
      {isAuthenticated ? (
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}
```

### Tab Navigation

```tsx
// app/(tabs)/_layout.tsx
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Places',
          tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Ionicons name="compass" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          href: null,  // Hidden tab, accessed via other routes
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

## Styling with NativeWind

NativeWind brings Tailwind CSS to React Native:

```tsx
// Using className (compiled to StyleSheet)
<View className="flex-1 bg-white p-4">
  <Text className="text-xl font-bold text-gray-900">
    {place.name}
  </Text>
  <Text className="text-sm text-gray-500 mt-1">
    {place.address}
  </Text>
</View>
```

Configuration in `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#DE7356',  // coral/terracotta
          500: '#DE7356',
        },
        accent: {
          DEFAULT: '#FBBC05',  // golden yellow
        },
        dark: {
          bg: 'hsl(60, 2.7%, 14.5%)',
          card: 'hsl(60, 2.7%, 18%)',
        },
      },
    },
  },
  plugins: [],
};
```

## Building for Production

### Development Build

For testing features that require native modules:

```bash
# iOS
npx expo run:ios --configuration Release

# Android
npx expo run:android --variant release
```

### EAS Build

Using Expo Application Services:

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### App Store / Play Store

1. Create app in App Store Connect / Google Play Console
2. Configure `app.config.js` with proper bundle IDs
3. Build with EAS: `eas build --platform all`
4. Submit: `eas submit --platform all`

## Configuration

### app.config.js

```javascript
import 'dotenv/config';

export default {
  expo: {
    name: 'Topoi',
    slug: 'topoi',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'topoi',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#252523',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.topoi.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'Topoi needs your location to show places near you.',
        NSLocationAlwaysUsageDescription: 'Topoi uses your location to show places near you.',
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              'com.topoi.app',
              `com.googleusercontent.apps.${process.env.GOOGLE_IOS_CLIENT_ID?.split('.')[0] || ''}`
            ]
          }
        ]
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        googleSignIn: {
          reservedClientId: process.env.GOOGLE_IOS_CLIENT_ID || ''
        }
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#252523',
      },
      package: 'com.topoi.app',
      edgeToEdgeEnabled: true,
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION'
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Topoi needs your location to show places near you.',
          locationAlwaysPermission: 'Topoi uses your location in the background.',
          locationWhenInUsePermission: 'Topoi needs your location to center the map.'
        },
      ],
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      apiUrl: process.env.API_URL || 'https://topoi-backend.fly.dev/api',
      devApiUrl: process.env.DEV_API_URL || 'http://localhost:8000/api',
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
      googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID || '',
    }
  },
};
```

## Troubleshooting

### "Unable to resolve module"

```bash
# Clear Metro cache
npx expo start --clear

# Reset node_modules
rm -rf node_modules
npm install
```

### iOS build fails

```bash
# Clean and reinstall pods
cd ios
pod deintegrate
pod install
cd ..
```

### Android build fails

```bash
# Clean Gradle
cd android
./gradlew clean
cd ..
```

### Map not showing

- iOS: Check `NSLocationWhenInUseUsageDescription` in Info.plist
- Android: Check location permissions in AndroidManifest.xml
- Ensure Google Maps API key is configured

### SecureStore not working

- SecureStore requires a development build (not Expo Go for some operations)
- Check device has secure lock screen enabled

### API requests failing

- Use device's local IP, not `localhost`
- Ensure backend is running on `0.0.0.0`, not `127.0.0.1`
- Check firewall settings

## Differences from Web

| Feature | Web | Mobile |
|---------|-----|--------|
| Maps | Leaflet (OpenStreetMap) | React Native Maps (Apple/Google) |
| Token Storage | localStorage | Expo SecureStore |
| OAuth | Redirect flow | ID Token flow |
| Styling | Tailwind CSS | NativeWind |
| Navigation | Next.js App Router | Expo Router |
| PWA Features | Service Worker | N/A (native app) |
