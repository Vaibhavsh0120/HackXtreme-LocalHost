import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { Zap } from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAppTheme, type AppColorsType } from '../theme';
import { useModelService } from '../services/ModelService';

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation();
  const modelService = useModelService();
  const { colors, resolvedTheme } = useAppTheme();
  const styles = createStyles(colors);

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const statusOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const loadingTranslate = useRef(new Animated.Value(-120)).current;
  const loadingAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  const loadModelsAndNavigate = useCallback(async () => {
    try {
      await modelService.autoLoadDownloadedModels();
    } catch (e) {
      console.error('Splash auto-load error:', e);
    }

    // Small delay for visual polish
    await new Promise(resolve => setTimeout(resolve, 400));

    loadingAnimationRef.current?.stop();

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
  }, [modelService, navigation, containerOpacity]);

  useEffect(() => {
    loadingAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingTranslate, {
          toValue: 120,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(loadingTranslate, {
          toValue: -120,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loadingAnimationRef.current.start();

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
      loadModelsAndNavigate();
    });

    return () => {
      loadingAnimationRef.current?.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <StatusBar
        barStyle={resolvedTheme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.primaryDark}
      />

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
            <Animated.View
              style={[
                styles.loadingBarInner,
                { transform: [{ translateX: loadingTranslate }] },
              ]}
            />
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

const createStyles = (colors: AppColorsType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryDark,
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
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.textMuted + '40',
      justifyContent: 'center',
      alignItems: 'center',
    },
    appName: {
      fontSize: 36,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      letterSpacing: -1,
    },
    tagline: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
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
      backgroundColor: colors.surfaceElevated,
      borderRadius: 1,
      overflow: 'hidden',
      marginBottom: 16,
    },
    loadingBarInner: {
      width: 72,
      height: '100%',
      backgroundColor: colors.textSecondary,
      borderRadius: 1,
    },
    statusText: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      letterSpacing: 0.3,
    },
    footer: {
      paddingBottom: 40,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
  });
