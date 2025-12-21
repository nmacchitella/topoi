import React from 'react';
import { Tabs, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import NotificationBell from '../../src/components/NotificationBell';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
}) {
  return (
    <View style={styles.tabIconContainer}>
      <Ionicons size={24} name={props.name} color={props.color} />
      <Text style={[styles.tabLabel, { color: props.color }]} numberOfLines={1}>{props.label}</Text>
    </View>
  );
}

// Custom center button - New Place on map page, Places on other pages
function CenterButton({ focused }: { focused: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const isOnPlacesTab = pathname === '/' || pathname === '/index';

  if (isOnPlacesTab) {
    // Show "New" button with raised circle on places page
    return (
      <Pressable
        onPress={() => router.push('/place/new')}
        style={styles.newButtonContainer}
      >
        <View style={styles.newButton}>
          <Ionicons name="add" size={28} color="#faf9f5" />
        </View>
        <Text style={styles.newButtonLabel} numberOfLines={1}>New</Text>
      </Pressable>
    );
  }

  // Show "Places" navigation button on other pages
  return (
    <Pressable
      onPress={() => router.push('/')}
      style={styles.tabIconContainer}
    >
      <Ionicons
        name={focused ? 'location' : 'location-outline'}
        size={24}
        color={focused ? '#DE7356' : '#737373'}
      />
      <Text style={[styles.tabLabel, { color: focused ? '#DE7356' : '#737373' }]} numberOfLines={1}>
        Places
      </Text>
    </Pressable>
  );
}

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#DE7356',
        tabBarInactiveTintColor: '#737373',
        tabBarStyle: {
          backgroundColor: '#252523',
          borderTopColor: '#3a3a38',
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 25,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
        headerStyle: {
          backgroundColor: '#252523',
        },
        headerTintColor: '#faf9f5',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'people' : 'people-outline'}
              color={color}
              label="Explore"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Places',
          headerTitle: 'Topoi',
          tabBarIcon: ({ focused }) => (
            <CenterButton focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'person' : 'person-outline'}
              color={color}
              label="Profile"
            />
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
              <NotificationBell />
              <Pressable
                onPress={() => router.push('/settings')}
                style={{ marginLeft: 4 }}
              >
                <Ionicons name="settings-outline" size={24} color="#faf9f5" />
              </Pressable>
            </View>
          ),
        }}
      />
      {/* Hidden tab - collections is now in profile */}
      <Tabs.Screen
        name="collections"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  newButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  newButton: {
    backgroundColor: '#DE7356',
    borderRadius: 28,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  newButtonLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DE7356',
    marginTop: 4,
  },
});
