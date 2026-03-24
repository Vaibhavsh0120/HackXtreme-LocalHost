import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppTheme, type AppColorsType } from '../theme';
import { FeatureCard } from '../components';
import { MainTabParamList } from '../navigation/types';

type HomeScreenProps = {
  navigation: StackNavigationProp<MainTabParamList>;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={resolvedTheme === 'light' ? 'dark-content' : 'light-content'} />
      <LinearGradient
        colors={[colors.primaryDark, colors.surfaceElevated, colors.primaryMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[colors.accentCyan, colors.accentViolet]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Text style={styles.logoIcon}>⚡</Text>
              </LinearGradient>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>RunAnywhere</Text>
              <Text style={styles.subtitle}>React Native SDK Starter</Text>
            </View>
          </View>

          {/* Privacy Hero Section */}
          <LinearGradient
            colors={['#0D1117', '#111827', '#0D1117']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.privacyHero}
          >
            {/* Shield Icon */}
            <View style={styles.shieldContainer}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shieldGradient}
              >
                <Text style={styles.shieldIcon}>🛡️</Text>
              </LinearGradient>
            </View>

            {/* Main Privacy Heading */}
            <Text style={styles.privacyHeading}>Designed to Keep You Safe</Text>
            <Text style={styles.privacyTagline}>
              Your data never leaves your device. Ever.
            </Text>

            {/* Quote */}
            <View style={styles.quoteContainer}>
              <View style={styles.quoteLine} />
              <Text style={styles.quoteText}>
                "Privacy is not a feature,{'\n'}it is an obligation."
              </Text>
              <View style={styles.quoteLine} />
            </View>

            {/* Privacy Feature Bullets */}
            <View style={styles.privacyFeatures}>
              <View style={styles.privacyFeatureRow}>
                <Text style={styles.privacyCheckmark}>✓</Text>
                <Text style={styles.privacyFeatureText}>100% offline AI processing</Text>
              </View>
              <View style={styles.privacyFeatureRow}>
                <Text style={styles.privacyCheckmark}>✓</Text>
                <Text style={styles.privacyFeatureText}>No cloud, no servers, no tracking</Text>
              </View>
              <View style={styles.privacyFeatureRow}>
                <Text style={styles.privacyCheckmark}>✓</Text>
                <Text style={styles.privacyFeatureText}>Your conversations stay on your phone</Text>
              </View>
              <View style={styles.privacyFeatureRow}>
                <Text style={styles.privacyCheckmark}>✓</Text>
                <Text style={styles.privacyFeatureText}>No API keys or accounts needed</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Feature Cards Grid */}
          <View style={styles.gridContainer}>
            <View style={styles.row}>
              <FeatureCard
                title="Chat"
                subtitle="LLM Text Generation"
                icon="chat"
                gradientColors={[colors.accentCyan, '#0EA5E9']}
                onPress={() => navigation.navigate('ChatTab')}
              />
              <FeatureCard
                title="Tools"
                subtitle="Tool Calling"
                icon="tools"
                gradientColors={[colors.accentOrange, '#E67E22']}
                onPress={() => navigation.navigate('ToolsTab')}
              />
            </View>
            <View style={styles.row}>
              <FeatureCard
                title="Speech"
                subtitle="Speech to Text"
                icon="mic"
                gradientColors={[colors.accentViolet, '#7C3AED']}
                onPress={() => navigation.navigate('SpeechTab')}
              />
              <FeatureCard
                title="Voice"
                subtitle="Text to Speech"
                icon="volume"
                gradientColors={[colors.accentPink, '#DB2777']}
                onPress={() => navigation.navigate('VoiceTab')}
              />
            </View>
            <View style={styles.row}>
              <FeatureCard
                title="Pipeline"
                subtitle="Voice Agent"
                icon="pipeline"
                gradientColors={[colors.accentGreen, '#059669']}
                onPress={() => navigation.navigate('PipelineTab')}
              />
              <View style={styles.gridSpacer} />
            </View>
          </View>

          {/* Model Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🤖</Text>
              <Text style={styles.infoLabel}>Text Model</Text>
              <View style={styles.infoSpacer} />
              <Text style={styles.infoValue}>Smart Text AI</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🎤</Text>
              <Text style={styles.infoLabel}>Transcription</Text>
              <View style={styles.infoSpacer} />
              <Text style={styles.infoValue}>Quick Voice Recognition</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🔊</Text>
              <Text style={styles.infoLabel}>Speech</Text>
              <View style={styles.infoSpacer} />
              <Text style={styles.infoValue}>Clear AI Voice</Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const createStyles = (colors: AppColorsType) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginRight: 16,
  },
  logoGradient: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.accentCyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  logoIcon: {
    fontSize: 32,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.accentCyan,
    marginTop: 2,
  },
  privacyHero: {
    padding: 28,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#10B98140',
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  shieldContainer: {
    marginBottom: 16,
  },
  shieldGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  shieldIcon: {
    fontSize: 30,
  },
  privacyHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  privacyTagline: {
    fontSize: 13,
    color: '#10B981',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 20,
  },
  quoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  quoteLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#10B98130',
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 14,
    fontWeight: '500',
  },
  privacyFeatures: {
    width: '100%',
  },
  privacyFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  privacyCheckmark: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '700',
    marginRight: 10,
    width: 20,
  },
  privacyFeatureText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  gridContainer: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 0,
  },
  gridSpacer: {
    flex: 1,
    margin: 8,
  },
  infoSection: {
    padding: 20,
    backgroundColor: colors.surfaceCard + '80',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.textMuted + '1A',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoSpacer: {
    flex: 1,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 12,
    color: colors.accentCyan,
    fontWeight: '500',
  },
});
