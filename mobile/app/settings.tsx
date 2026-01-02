import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout failed:', error);
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionContent}>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="mail-outline" size={22} color="#faf9f5" />
              <View style={styles.menuItemInfo}>
                <Text style={styles.menuItemLabel}>Email</Text>
                <Text style={styles.menuItemValue}>{user?.email}</Text>
              </View>
            </View>
          </View>
          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/edit-profile' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" size={22} color="#faf9f5" />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#737373" />
          </Pressable>
        </View>
      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.sectionContent}>
          <Pressable style={styles.menuItem} onPress={() => router.push('/import-preview')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="cloud-upload-outline" size={22} color="#faf9f5" />
              <Text style={styles.menuItemText}>Import Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#737373" />
          </Pressable>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.sectionContent}>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={22} color="#faf9f5" />
              <View style={styles.menuItemInfo}>
                <Text style={styles.menuItemText}>Version</Text>
                <Text style={styles.menuItemSubtext}>1.0.0</Text>
              </View>
            </View>
          </View>
          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/terms-of-service' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={22} color="#faf9f5" />
              <Text style={styles.menuItemText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#737373" />
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/privacy-policy' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-outline" size={22} color="#faf9f5" />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#737373" />
          </Pressable>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <Pressable
          style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              <Text style={styles.logoutText}>Log Out</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252523',
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#737373',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#4a4a48',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#faf9f5',
  },
  menuItemLabel: {
    fontSize: 12,
    color: '#737373',
  },
  menuItemValue: {
    fontSize: 16,
    color: '#faf9f5',
    marginTop: 2,
  },
  menuItemSubtext: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 16,
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
});
