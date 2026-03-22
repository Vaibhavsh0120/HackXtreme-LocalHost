import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  HomeTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Home: undefined;
  Chat: undefined;
  ToolCalling: undefined;
  SpeechToText: undefined;
  TextToSpeech: undefined;
  VoicePipeline: undefined;
};
