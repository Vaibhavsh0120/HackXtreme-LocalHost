import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { Zap } from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { AppColors } from '../theme';
import { useModelService } from '../services/ModelService';

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation();
  const modelService = useModelService();

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const statusOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation sequence
    Animated.sequence([
      // Logo fades in and scales up
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Title fades in
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Status text fades in
      Animated.timing(statusOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After animations, start loading models
      loadModelsAndNavigate();
    });
  }, []);

  const loadModelsAndNavigate = async () => {
    try {
      await modelService.autoLoadDownloadedModels();
    } catch (e) {
      console.error('Splash auto-load error:', e);
    }

    // Small delay for visual polish
    await new Promise(resolve => setTimeout(resolve, 400));

    // Fade out then navigate
    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        })
      );
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor={AppColors.primaryDark} />

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <Zap size={48} color="#FFFFFF" strokeWidth={2} />
          </View>
        </Animated.View>

        {/* App Name */}
        <Animated.View style={{ opacity: titleOpacity }}>
          <Text style={styles.appName}>LocalHost</Text>
          <Text style={styles.tagline}>On-Device AI</Text>
        </Animated.View>

        {/* Status */}
        <Animated.View style={[styles.statusContainer, { opacity: statusOpacity }]}>
          <View style={styles.loadingBar}>
            <View style={styles.loadingBarInner} />
          </View>
          <Text style={styles.statusText}>
            {modelService.initializationStatus || 'Initializing...'}
          </Text>
        </Animated.View>
      </View>

      {/* Bottom branding */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by RunAnywhere</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryDark,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: AppColors.surfaceCard,
    borderWidth: 1,
    borderColor: AppColors.textMuted + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: AppColors.textPrimary,
    textAlign: 'center',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statusContainer: {
    marginTop: 56,
    alignItems: 'center',
    width: '100%',
    maxWidth: 220,
  },
  loadingBar: {
    width: '100%',
    height: 2,
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadingBarInner: {
    width: '40%',
    height: '100%',
    backgroundColor: AppColors.textSecondary,
    borderRadius: 1,
  },
  statusText: {
    fontSize: 13,
    color: AppColors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: AppColors.textMuted,
    letterSpacing: 0.5,
  },
});
