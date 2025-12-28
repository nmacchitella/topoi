# Mobile App (React Native/Expo)

The Topoi mobile app is built with Expo and React Native, sharing business logic with the web frontend while providing native iOS and Android experiences.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Expo SDK 54 | Development framework |
| React Native 0.81 | UI framework |
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
│   ├── (auth)/                   # Auth screens (login, register)
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                   # Main app with tab navigation
│   │   ├── index.tsx             # Map view
│   │   ├── lists.tsx             # Collections
│   │   └── profile.tsx           # User profile
│   ├── place/
│   │   └── [id].tsx              # Place details
│   ├── collection/
│   │   └── [id].tsx              # Collection details
│   ├── notifications.tsx         # Notifications
│   ├── settings.tsx              # Settings
│   ├── import-preview.tsx        # CSV import
│   └── _layout.tsx               # Root layout
│
├── src/
│   ├── components/               # Shared components
│   │   ├── Map.tsx               # React Native Maps wrapper
│   │   ├── PlaceCard.tsx
│   │   ├── BottomSheet.tsx
│   │   └── ...
│   ├── store/
│   │   └── useStore.ts           # Zustand store (shared logic)
│   ├── lib/
│   │   ├── api.ts                # Axios client
│   │   └── auth-storage.ts       # SecureStore wrapper
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
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id
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

### Map Component

Uses `react-native-maps` with clustering:

```tsx
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';

export function Map({ places, onMarkerPress }) {
  return (
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
          onPress={() => onMarkerPress(place)}
        />
      ))}
    </ClusteredMapView>
  );
}
```

### Bottom Sheet

Uses `@gorhom/bottom-sheet` for place details:

```tsx
import BottomSheet from '@gorhom/bottom-sheet';

export function PlaceSheet({ place, sheetRef }) {
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  return (
    <BottomSheet ref={sheetRef} snapPoints={snapPoints}>
      <View className="p-4">
        <Text className="text-xl font-bold">{place.name}</Text>
        <Text className="text-gray-600">{place.address}</Text>
      </View>
    </BottomSheet>
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

Uses Expo Auth Session:

```typescript
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      // Send to backend: POST /api/auth/google/mobile
      handleGoogleLogin(id_token);
    }
  }, [response]);

  return { promptAsync, request };
}
```

## State Management

The mobile app uses Zustand with the same structure as the web app:

```typescript
// src/store/useStore.ts
import { create } from 'zustand';
import { placesApi, authApi } from '../lib/api';
import { clearTokens, setTokens } from '../lib/auth-storage';

interface AppState {
  user: User | null;
  places: Place[];
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchPlaces: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  places: [],
  isAuthenticated: false,

  login: async (email, password) => {
    const response = await authApi.login(email, password);
    await setTokens(response.access_token, response.refresh_token);
    set({ isAuthenticated: true });
    await get().fetchPlaces();
  },

  logout: async () => {
    await clearTokens();
    set({ user: null, places: [], isAuthenticated: false });
  },

  fetchPlaces: async () => {
    const places = await placesApi.getAll();
    set({ places });
  },
}));
```

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
          title: 'Map',
          tabBarIcon: ({ color }) => <MapIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: 'Collections',
          tabBarIcon: ({ color }) => <ListIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <UserIcon color={color} />,
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
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
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
export default {
  expo: {
    name: 'Topoi',
    slug: 'topoi',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#3B82F6',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.topoi.app',
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#3B82F6',
      },
      package: 'com.topoi.app',
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
          locationAlwaysAndWhenInUsePermission: 'Allow Topoi to access your location.',
        },
      ],
    ],
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
