import { ScrollView, Text, StyleSheet, View } from 'react-native';

export default function TermsOfServiceScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Terms of Service</Text>
      <Text style={styles.lastUpdated}>Last updated: January 2025</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing and using Topoi, you agree to be bound by these Terms of Service.
          If you do not agree to these terms, please do not use our service.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          Topoi is a personal place-saving application that allows you to save, organize,
          and share your favorite locations. We provide tools to create collections, add tags,
          and connect with other users.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.paragraph}>
          You are responsible for maintaining the confidentiality of your account credentials.
          You agree to notify us immediately of any unauthorized use of your account.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. User Content</Text>
        <Text style={styles.paragraph}>
          You retain ownership of the content you create on Topoi. By posting content, you grant
          us a license to display and share your content as part of the service's functionality.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Acceptable Use</Text>
        <Text style={styles.paragraph}>
          You agree not to use Topoi for any unlawful purpose or in any way that could damage,
          disable, or impair the service. You must not attempt to gain unauthorized access to
          any part of the service.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Termination</Text>
        <Text style={styles.paragraph}>
          We reserve the right to suspend or terminate your account at any time for violations
          of these terms or for any other reason at our discretion.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Disclaimer</Text>
        <Text style={styles.paragraph}>
          Topoi is provided "as is" without warranties of any kind. We do not guarantee the
          accuracy of location data or the availability of the service.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may update these terms from time to time. Continued use of the service after
          changes constitutes acceptance of the new terms.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>9. Contact</Text>
        <Text style={styles.paragraph}>
          If you have questions about these Terms of Service, please contact us through the app.
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
