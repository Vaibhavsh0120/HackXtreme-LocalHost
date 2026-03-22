import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  ChatTab: undefined;
  ToolsTab: undefined;
  SpeechTab: undefined;
  VoiceTab: undefined;
  PipelineTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};
