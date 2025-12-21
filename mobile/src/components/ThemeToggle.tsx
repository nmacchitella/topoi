import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeMode } from '../lib/theme';

interface ThemeToggleProps {
  style?: object;
}

export default function ThemeToggle({ style }: ThemeToggleProps) {
  const { theme, themeMode, setThemeMode } = useTheme();

  const options: { mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { mode: 'light', icon: 'sunny', label: 'Light' },
    { mode: 'dark', icon: 'moon', label: 'Dark' },
    { mode: 'system', icon: 'phone-portrait', label: 'System' },
  ];

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Appearance</Text>
      <View style={[styles.toggleContainer, { backgroundColor: theme.colors.surface }]}>
        {options.map((option) => (
          <Pressable
            key={option.mode}
            style={[
              styles.option,
              themeMode === option.mode && [
                styles.optionSelected,
                { backgroundColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setThemeMode(option.mode)}
          >
            <Ionicons
              name={option.icon}
              size={18}
              color={themeMode === option.mode ? '#faf9f5' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.optionText,
                {
                  color:
                    themeMode === option.mode ? '#faf9f5' : theme.colors.textSecondary,
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Simple inline toggle version for settings
export function ThemeToggleSimple() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Pressable style={styles.simpleToggle} onPress={toggleTheme}>
      <View style={[styles.simpleIcon, { backgroundColor: theme.colors.surface }]}>
        <Ionicons
          name={theme.isDark ? 'moon' : 'sunny'}
          size={20}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.simpleContent}>
        <Text style={[styles.simpleLabel, { color: theme.colors.text }]}>
          {theme.isDark ? 'Dark Mode' : 'Light Mode'}
        </Text>
        <Text style={[styles.simpleSubtext, { color: theme.colors.textMuted }]}>
          Tap to switch to {theme.isDark ? 'light' : 'dark'} mode
        </Text>
      </View>
      <View style={[styles.toggleSwitch, { backgroundColor: theme.isDark ? theme.colors.primary : theme.colors.border }]}>
        <View
          style={[
            styles.toggleKnob,
            theme.isDark ? styles.toggleKnobRight : styles.toggleKnobLeft,
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  optionSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  simpleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  simpleIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleContent: {
    flex: 1,
  },
  simpleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  simpleSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#faf9f5',
  },
  toggleKnobLeft: {
    alignSelf: 'flex-start',
  },
  toggleKnobRight: {
    alignSelf: 'flex-end',
  },
});
