import 'dotenv/config';

export default {
  expo: {
    name: "Topoi",
    slug: "topoi",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "topoi",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#252523"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.topoi.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Topoi needs your location to show places near you and center the map on your current position.",
        NSLocationAlwaysUsageDescription: "Topoi uses your location to show places near you.",
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "com.topoi.app",
              "com.googleusercontent.apps.225541124646-uc53k8gb43olut5bab6keiksvtlri3ii"
            ]
          }
        ]
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        googleSignIn: {
          reservedClientId: "225541124646-uc53k8gb43olut5bab6keiksvtlri3ii.apps.googleusercontent.com"
        }
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#252523"
      },
      package: "com.topoi.app",
      edgeToEdgeEnabled: true,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Topoi needs your location to show places near you.",
          locationAlwaysPermission: "Topoi uses your location in the background.",
          locationWhenInUsePermission: "Topoi needs your location to center the map."
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      // Development: use localhost, Production: use deployed backend
      apiUrl: process.env.API_URL || "https://topoi-backend.fly.dev/api",
      devApiUrl: process.env.DEV_API_URL || "http://localhost:8000/api"
    }
  }
};
