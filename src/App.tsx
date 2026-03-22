import 'react-native-gesture-handler'; // Must be at the top!
import React, { useEffect } from 'react';
import { MessageSquare, Wrench, Mic, Volume2, Zap, Settings as SettingsIcon } from 'lucide-react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, Text, View, Platform } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Note: react-native-screens is shimmed in index.js for iOS New Architecture compatibility
import { RunAnywhere, SDKEnvironment } from '@runanywhere/core';
import { ModelServiceProvider, registerDefaultModels } from './services/ModelService';
import { AppColors } from './theme';
import {
  ChatScreen,
  ToolCallingScreen,
  SpeechToTextScreen,
  TextToSpeechScreen,
  VoicePipelineScreen,
  SettingsScreen,
} from './screens';
import { SplashScreen } from './screens';
import { RootStackParamList, MainTabParamList } from './navigation/types';

// Using JS-based stack navigator instead of native-stack
// to avoid react-native-screens setColor crash with New Architecture
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
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
        },
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
      <Tab.Screen 
        name="ChatTab" 
        component={ChatScreen} 
        options={{ 
          tabBarIcon: ({ focused }) => (
             <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={24} color={focused ? AppColors.accentCyan : AppColors.textMuted} strokeWidth={focused ? 2.5 : 2} />
                {focused && <View style={{width: 4, height: 4, borderRadius: 2, backgroundColor: AppColors.accentCyan, marginTop: 4}} />}
             </View>
          ) 
        }} 
      />
      <Tab.Screen 
        name="ToolsTab" 
        component={ToolCallingScreen} 
        options={{ 
          tabBarIcon: ({ focused }) => (
             <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Wrench size={24} color={focused ? AppColors.accentCyan : AppColors.textMuted} strokeWidth={focused ? 2.5 : 2} />
                {focused && <View style={{width: 4, height: 4, borderRadius: 2, backgroundColor: AppColors.accentCyan, marginTop: 4}} />}
             </View>
          ) 
        }} 
      />
      <Tab.Screen 
        name="SpeechTab" 
        component={SpeechToTextScreen} 
        options={{ 
          tabBarIcon: ({ focused }) => (
             <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Mic size={24} color={focused ? AppColors.accentCyan : AppColors.textMuted} strokeWidth={focused ? 2.5 : 2} />
                {focused && <View style={{width: 4, height: 4, borderRadius: 2, backgroundColor: AppColors.accentCyan, marginTop: 4}} />}
             </View>
          ) 
        }} 
      />
      <Tab.Screen 
        name="VoiceTab" 
        component={TextToSpeechScreen} 
        options={{ 
          tabBarIcon: ({ focused }) => (
             <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Volume2 size={24} color={focused ? AppColors.accentCyan : AppColors.textMuted} strokeWidth={focused ? 2.5 : 2} />
                {focused && <View style={{width: 4, height: 4, borderRadius: 2, backgroundColor: AppColors.accentCyan, marginTop: 4}} />}
             </View>
          ) 
        }} 
      />
      <Tab.Screen 
        name="PipelineTab" 
        component={VoicePipelineScreen} 
        options={{ 
          tabBarIcon: ({ focused }) => (
             <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={24} color={focused ? AppColors.accentCyan : AppColors.textMuted} strokeWidth={focused ? 2.5 : 2} />
                {focused && <View style={{width: 4, height: 4, borderRadius: 2, backgroundColor: AppColors.accentCyan, marginTop: 4}} />}
             </View>
          ) 
        }} 
      />
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsScreen} 
        options={{ 
          tabBarIcon: ({ focused }) => (
             <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <SettingsIcon size={24} color={focused ? AppColors.accentCyan : AppColors.textMuted} strokeWidth={focused ? 2.5 : 2} />
                {focused && <View style={{width: 4, height: 4, borderRadius: 2, backgroundColor: AppColors.accentCyan, marginTop: 4}} />}
             </View>
          ) 
        }} 
      />
    </Tab.Navigator>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // Initialize SDK
    const initializeSDK = async () => {
      try {
        // Initialize RunAnywhere SDK (Development mode doesn't require API key)
        await RunAnywhere.initialize({
          environment: SDKEnvironment.Development,
        });

        // Register backends (per docs: https://docs.runanywhere.ai/react-native/quick-start)
        const { LlamaCPP } = await import('@runanywhere/llamacpp');
        const { ONNX } = await import('@runanywhere/onnx');
        
        LlamaCPP.register();
        ONNX.register();

        // Register default models
        await registerDefaultModels();

        console.log('RunAnywhere SDK initialized successfully');
      } catch (error) {
        console.error('Failed to initialize RunAnywhere SDK:', error);
      }
    };

    initializeSDK();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ModelServiceProvider>
        <StatusBar barStyle="light-content" backgroundColor={AppColors.primaryDark} />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: {
                backgroundColor: AppColors.primaryDark,
                elevation: 0,
                shadowOpacity: 0,
              },
              headerTintColor: AppColors.textPrimary,
              headerTitleStyle: {
                fontWeight: '700',
                fontSize: 18,
              },
              cardStyle: {
                backgroundColor: AppColors.primaryDark,
              },
              // iOS-like animations
              ...TransitionPresets.SlideFromRightIOS,
            }}
          >
            <Stack.Screen
              name="Splash"
              component={SplashScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ModelServiceProvider>
    </GestureHandlerRootView>
  );
};

export default App;
