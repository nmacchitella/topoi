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
      bundleIdentifier: "com.giaggi92.topoi",
      associatedDomains: [
        "applinks:topoi-frontend.fly.dev"
      ],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: "Topoi needs your location to show places near you and center the map on your current position.",
        NSLocationAlwaysUsageDescription: "Topoi uses your location to show places near you.",
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "com.giaggi92.topoi",
              `com.googleusercontent.apps.${(process.env.GOOGLE_IOS_CLIENT_ID || "").split(".")[0]}`
            ]
          }
        ]
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        googleSignIn: {
          reservedClientId: process.env.GOOGLE_IOS_CLIENT_ID || ""
        }
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#252523"
      },
      package: "com.giaggi92.topoi",
      edgeToEdgeEnabled: true,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "topoi-frontend.fly.dev",
              pathPrefix: "/shared"
            },
            {
              scheme: "https",
              host: "topoi-frontend.fly.dev",
              pathPrefix: "/share"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
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
      devApiUrl: process.env.DEV_API_URL || "http://localhost:8000/api",
      // Google OAuth client IDs
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || "",
      googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID || "",
      // EAS
      eas: {
        projectId: "5c6c8112-150b-4c05-8cf5-c5dceb0a06dc"
      }
    },
    owner: "giaggi92"
  }
};
