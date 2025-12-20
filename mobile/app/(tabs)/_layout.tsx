import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons size={24} {...props} />
    </View>
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
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
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
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'map' : 'map-outline'} color={color} focused={focused} />
          ),
          headerTitle: 'Topoi',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/place/new')}
              style={{ marginRight: 15 }}
            >
              <Ionicons name="add-circle-outline" size={28} color="#DE7356" />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'compass' : 'compass-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Collections',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'folder' : 'folder-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'person' : 'person-outline'} color={color} focused={focused} />
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/settings')}
              style={{ marginRight: 15 }}
            >
              <Ionicons name="settings-outline" size={24} color="#faf9f5" />
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}
