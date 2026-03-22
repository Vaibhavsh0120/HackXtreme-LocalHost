import 'react-native-gesture-handler'; // Must be at the top!
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, Text } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Note: react-native-screens is shimmed in index.js for iOS New Architecture compatibility
import { RunAnywhere, SDKEnvironment } from '@runanywhere/core';
import { ModelServiceProvider, registerDefaultModels } from './services/ModelService';
import { AppColors } from './theme';
import {
  HomeScreen,
  ChatScreen,
  ToolCallingScreen,
  SpeechToTextScreen,
  TextToSpeechScreen,
  VoicePipelineScreen,
  SettingsScreen,
} from './screens';
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
          backgroundColor: AppColors.primaryDark,
          borderTopColor: AppColors.textMuted + '1A',
        },
        tabBarActiveTintColor: AppColors.accentCyan,
        tabBarInactiveTintColor: AppColors.textMuted,
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
        name="HomeTab" 
        component={HomeScreen} 
        options={{ tabBarLabel: 'Home', tabBarIcon: () => <Text style={{fontSize: 20}}>🏠</Text> }} 
      />
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsScreen} 
        options={{ tabBarLabel: 'Settings', tabBarIcon: () => <Text style={{fontSize: 20}}>⚙️</Text> }} 
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
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ title: 'Chat' }}
            />
            <Stack.Screen
              name="ToolCalling"
              component={ToolCallingScreen}
              options={{ title: 'Tool Calling' }}
            />
            <Stack.Screen
              name="SpeechToText"
              component={SpeechToTextScreen}
              options={{ title: 'Speech to Text' }}
            />
            <Stack.Screen
              name="TextToSpeech"
              component={TextToSpeechScreen}
              options={{ title: 'Text to Speech' }}
            />
            <Stack.Screen
              name="VoicePipeline"
              component={VoicePipelineScreen}
              options={{ title: 'Voice Pipeline' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ModelServiceProvider>
    </GestureHandlerRootView>
  );
};

export default App;
