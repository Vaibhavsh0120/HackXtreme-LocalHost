import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { MessageSquare, Wrench, Mic, Volume2, Zap, Settings as SettingsIcon } from 'lucide-react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, View, Platform } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ModelServiceProvider, ensureRunAnywhereSDKReady } from './services/ModelService';
import { AppColors, ThemeProvider, useAppTheme, type AppColorsType } from './theme';
import {
  ChatScreen,
  ToolCallingScreen,
  SpeechToTextScreen,
  TextToSpeechScreen,
  VoicePipelineScreen,
  SettingsScreen,
  SplashScreen,
} from './screens';
import { RootStackParamList, MainTabParamList } from './navigation/types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const tabBarStyle = {
  position: 'absolute' as const,
  bottom: Platform.OS === 'ios' ? 24 : 16,
  left: 20,
  right: 20,
  elevation: 0,
  backgroundColor: AppColors.surfaceCard,
  borderRadius: 32,
  height: 64,
  borderTopWidth: 0,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.3,
  shadowRadius: 20,
};

const iconContainerStyle = {
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const indicatorStyle = {
  width: 4,
  height: 4,
  borderRadius: 2,
  backgroundColor: AppColors.accentCyan,
  marginTop: 4,
};

const stackHeaderStyle = {
  backgroundColor: AppColors.primaryDark,
  elevation: 0,
  shadowOpacity: 0,
};

const stackHeaderTitleStyle = {
  fontWeight: '700' as const,
  fontSize: 18,
};

const stackCardStyle = {
  flex: 1,
  backgroundColor: AppColors.primaryDark,
};

const renderTabBarIcon = (
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>,
  colors: AppColorsType
) => {
  return ({ focused }: { focused: boolean }) => (
    <View style={iconContainerStyle}>
      <Icon size={24} color={focused ? colors.accentCyan : colors.textMuted} strokeWidth={focused ? 2.5 : 2} />
      {focused && <View style={[indicatorStyle, { backgroundColor: colors.accentCyan }]} />}
    </View>
  );
};

const MainTabs: React.FC = () => {
  const { colors } = useAppTheme();

  const themedTabBarStyle = {
    ...tabBarStyle,
    backgroundColor: colors.surfaceCard,
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: themedTabBarStyle,
        tabBarShowLabel: false,
      }}
      screenListeners={{
        tabPress: () => {
          ReactNativeHapticFeedback.trigger('impactLight', {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false,
          });
        },
      }}
    >
      <Tab.Screen name="ChatTab" component={ChatScreen} options={{ tabBarIcon: renderTabBarIcon(MessageSquare, colors) }} />
      <Tab.Screen name="ToolsTab" component={ToolCallingScreen} options={{ tabBarIcon: renderTabBarIcon(Wrench, colors) }} />
      <Tab.Screen name="SpeechTab" component={SpeechToTextScreen} options={{ tabBarIcon: renderTabBarIcon(Mic, colors) }} />
      <Tab.Screen name="VoiceTab" component={TextToSpeechScreen} options={{ tabBarIcon: renderTabBarIcon(Volume2, colors) }} />
      <Tab.Screen name="PipelineTab" component={VoicePipelineScreen} options={{ tabBarIcon: renderTabBarIcon(Zap, colors) }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ tabBarIcon: renderTabBarIcon(SettingsIcon, colors) }} />
    </Tab.Navigator>
  );
};

const AppShell: React.FC = () => {
  const { colors, resolvedTheme } = useAppTheme();

  useEffect(() => {
    const bootstrapSDK = async () => {
      try {
        await ensureRunAnywhereSDKReady();
      } catch (error) {
        console.error('Failed to initialize RunAnywhere SDK:', error);
      }
    };

    bootstrapSDK().catch(() => {});
  }, []);

  const navigationTheme = resolvedTheme === 'light'
    ? {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.primaryDark,
          card: colors.surfaceCard,
          text: colors.textPrimary,
          border: colors.textMuted + '33',
          primary: colors.accentCyan,
        },
      }
    : {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.primaryDark,
          card: colors.surfaceCard,
          text: colors.textPrimary,
          border: colors.textMuted + '33',
          primary: colors.accentCyan,
        },
      };

  const themedStackHeaderStyle = {
    ...stackHeaderStyle,
    backgroundColor: colors.primaryDark,
  };

  const themedStackCardStyle = {
    ...stackCardStyle,
    backgroundColor: colors.primaryDark,
  };

  return (
    <GestureHandlerRootView style={themedStackCardStyle}>
      <ModelServiceProvider>
        <StatusBar
          barStyle={resolvedTheme === 'light' ? 'dark-content' : 'light-content'}
          backgroundColor={colors.primaryDark}
        />
        <NavigationContainer theme={navigationTheme}>
          <Stack.Navigator
            screenOptions={{
              headerStyle: themedStackHeaderStyle,
              headerTintColor: colors.textPrimary,
              headerTitleStyle: stackHeaderTitleStyle,
              cardStyle: themedStackCardStyle,
              ...TransitionPresets.SlideFromRightIOS,
            }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </ModelServiceProvider>
    </GestureHandlerRootView>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
};

export default App;
