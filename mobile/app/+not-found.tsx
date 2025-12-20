import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Ionicons name="compass-outline" size={64} color="#737373" />
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.subtitle}>
          The page you're looking for doesn't exist.
        </Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Go to Map</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#252523',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#faf9f5',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#737373',
    marginTop: 8,
    textAlign: 'center',
  },
  link: {
    marginTop: 24,
    backgroundColor: '#DE7356',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#faf9f5',
  },
});
