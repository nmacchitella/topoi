import { ScrollView, Text, StyleSheet, View } from 'react-native';

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.lastUpdated}>Last updated: January 2025</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          We collect information you provide directly, including your email address, name,
          and the places you save. We also collect location data when you use our mapping features.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use your information to provide and improve our services, including displaying
          your saved places on maps, enabling sharing features, and personalizing your experience.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Information Sharing</Text>
        <Text style={styles.paragraph}>
          Your places and collections are public by default and visible to other users.
          We do not sell your personal information to third parties.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Data Storage</Text>
        <Text style={styles.paragraph}>
          Your data is stored securely on our servers. We implement appropriate security
          measures to protect your information from unauthorized access.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Third-Party Services</Text>
        <Text style={styles.paragraph}>
          We use third-party services for mapping and location data. These services have
          their own privacy policies that govern their use of your information.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Your Rights</Text>
        <Text style={styles.paragraph}>
          You can access, update, or delete your account information at any time through
          the app settings. You may also request a copy of your data.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Cookies and Analytics</Text>
        <Text style={styles.paragraph}>
          We may use analytics tools to understand how our app is used. This helps us
          improve the service and fix issues.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Topoi is not intended for children under 13. We do not knowingly collect
          information from children under 13.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this privacy policy from time to time. We will notify you of
          significant changes through the app.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>10. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy, please contact us through the app.
        </Text>
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
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#faf9f5',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#faf9f5',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#a3a3a3',
    lineHeight: 22,
  },
});
