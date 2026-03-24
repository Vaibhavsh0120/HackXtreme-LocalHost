import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Trash2 } from 'lucide-react-native';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  NativeModules,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { RunAnywhere } from '@runanywhere/core';
import { useAppTheme, type AppColorsType } from '../theme';
import { useModelService } from '../services/ModelService';
import { ModelLoaderWidget, AudioVisualizer, PrivacyBadge } from '../components';
import { requestMicrophonePermission } from '../utils/permissions';

// Native Audio Module - records in WAV format (16kHz mono) optimal for Whisper STT
const { NativeAudioModule } = NativeModules;

export const SpeechToTextScreen: React.FC = () => {
  const modelService = useModelService();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [transcriptionHistory, setTranscriptionHistory] = useState<string[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingPathRef = useRef<string | null>(null);
  const audioLevelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
      if (isRecording && NativeAudioModule) {
        NativeAudioModule.cancelRecording().catch(() => {});
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // Check if native module is available
      if (!NativeAudioModule) {
        console.error('[STT] NativeAudioModule not available');
        Alert.alert('Error', 'Native audio module not available. Please rebuild the app.');
        return;
      }

      // Request microphone permission for both iOS and Android
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Microphone permission is required for speech recognition.');
        return;
      }

      console.warn('[STT] Starting native recording...');
      const result = await NativeAudioModule.startRecording();
      
      recordingPathRef.current = result.path;
      recordingStartRef.current = Date.now();
      setIsRecording(true);
      setTranscription('');
      setRecordingDuration(0);

      // Poll for audio levels
      audioLevelIntervalRef.current = setInterval(async () => {
        try {
          const levelResult = await NativeAudioModule.getAudioLevel();
          setAudioLevel(levelResult.level || 0);
          setRecordingDuration(Date.now() - recordingStartRef.current);
        } catch {
          // Ignore errors during polling
        }
      }, 100);

      console.warn('[STT] Recording started at:', result.path);
    } catch (error) {
      console.error('[STT] Recording error:', error);
      Alert.alert('Recording Error', `Failed to start recording: ${error}`);
    }
  };

  const stopRecordingAndTranscribe = async () => {
    try {
      // Clear audio level polling
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }

      if (!NativeAudioModule) {
        throw new Error('NativeAudioModule not available');
      }

      console.warn('[STT] Stopping recording...');
      const result = await NativeAudioModule.stopRecording();
      setIsRecording(false);
      setAudioLevel(0);
      setIsTranscribing(true);

      // Get the base64 audio data directly from native module (bypasses RNFS sandbox issues)
      const audioBase64 = result.audioBase64;
      if (!audioBase64) {
        throw new Error('No audio data received from recording');
      }

      console.warn('[STT] Recording stopped, audio base64 length:', audioBase64.length, 'file size:', result.fileSize);

      if (result.fileSize < 1000) {
        throw new Error('Recording too short - please speak longer');
      }

      // Check if STT model is loaded
      const isModelLoaded = await RunAnywhere.isSTTModelLoaded();
      if (!isModelLoaded) {
        throw new Error('STT model not loaded. Please download and load the model first.');
      }

      // Transcribe using base64 audio data directly from native module
      console.warn('[STT] Starting transcription...');
      const transcribeResult = await RunAnywhere.transcribe(audioBase64, {
        sampleRate: 16000,
        language: 'en',
      });

      console.warn('[STT] Transcription result:', transcribeResult);

      if (transcribeResult.text) {
        setTranscription(transcribeResult.text);
        setTranscriptionHistory(prev => [transcribeResult.text, ...prev]);
      } else {
        setTranscription('(No speech detected)');
      }

      recordingPathRef.current = null;
      setIsTranscribing(false);
    } catch (error) {
      console.error('[STT] Transcription error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTranscription(`Error: ${errorMessage}`);
      Alert.alert('Transcription Error', errorMessage);
      setIsTranscribing(false);
    }
  };

  const handleClearHistory = () => {
    setTranscriptionHistory([]);
    setTranscription('');
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!modelService.isSTTLoaded) {
    return (
      <ModelLoaderWidget
        title="STT Model Required"
        subtitle="Download and load the speech recognition model"
        icon="mic"
        accentColor={colors.accentViolet}
        isDownloading={modelService.isSTTDownloading}
        isLoading={modelService.isSTTLoading}
        isDownloaded={modelService.isSTTDownloaded}
        progress={modelService.sttDownloadProgress}
        onLoad={modelService.downloadAndLoadSTT}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
      >
        <PrivacyBadge label="Speech" />

        {/* Recording Area */}
        <View style={[styles.recordingArea, isRecording && styles.recordingActive]}>
          {isRecording ? (
            <>
              <AudioVisualizer level={audioLevel} color={colors.accentViolet} />
              <Text style={[styles.statusTitle, { color: colors.accentViolet }]}>
                Listening...
              </Text>
              <Text style={styles.statusSubtitle}>
                {formatDuration(recordingDuration)}
              </Text>
            </>
          ) : isTranscribing ? (
            <>
              <View style={styles.loadingContainer}>
                <Loader2 size={48} color={colors.accentViolet} />
              </View>
              <Text style={styles.statusTitle}>Transcribing...</Text>
            </>
          ) : (
            <>
              <View style={styles.micContainer}>
                <Mic size={48} color={colors.accentViolet} />
              </View>
              <Text style={styles.statusTitle}>Tap to Record</Text>
              <Text style={styles.statusSubtitle}>On-device speech recognition (WAV 16kHz)</Text>
            </>
          )}
        </View>

        {/* Current Transcription */}
        {(transcription || isTranscribing) && (
          <View style={styles.transcriptionCard}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>LATEST</Text>
            </View>
            <Text style={styles.transcriptionText}>
              {isTranscribing ? 'Processing...' : transcription}
            </Text>
          </View>
        )}

        {/* History */}
        {transcriptionHistory.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>History</Text>
              <TouchableOpacity onPress={handleClearHistory} style={styles.clearHistoryButton}>
                <Trash2 size={16} color={colors.accentViolet} style={styles.clearHistoryIcon} />
                <Text style={styles.clearButton}>Clear</Text>
              </TouchableOpacity>
            </View>
            {transcriptionHistory.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <Text style={styles.historyText}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Record Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={() => {
            ReactNativeHapticFeedback.trigger('impactMedium', {
              enableVibrateFallback: true,
              ignoreAndroidSystemSettings: false,
            });
            isRecording ? stopRecordingAndTranscribe() : startRecording();
          }}
          disabled={isTranscribing}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isRecording ? [colors.btnActiveStart, colors.btnActiveEnd] : [colors.btnInactiveStart, colors.btnInactiveEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.recordButton}
          >
            {isRecording ? <Square fill="#FFF" color="#FFF" size={24} /> : <Mic color="#FFF" size={24} />}
            <Text style={styles.recordButtonText}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: AppColorsType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryDark,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      paddingBottom: 100,
    },
    recordingArea: {
      padding: 32,
      backgroundColor: colors.surfaceCard,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.textMuted + '1A',
      alignItems: 'center',
      marginBottom: 24,
    },
    recordingActive: {
      borderColor: colors.accentViolet + '80',
      borderWidth: 2,
      shadowColor: colors.accentViolet,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 8,
    },
    micContainer: {
      width: 100,
      height: 100,
      backgroundColor: colors.accentViolet + '20',
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    micIcon: {},
    loadingContainer: {
      width: 80,
      height: 80,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    loadingIcon: {},
    statusTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    statusSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    transcriptionCard: {
      padding: 20,
      backgroundColor: colors.surfaceCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.accentViolet + '40',
      marginBottom: 24,
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.accentViolet + '33',
      borderRadius: 8,
      marginBottom: 12,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.accentViolet,
    },
    transcriptionText: {
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    historySection: {
      marginBottom: 24,
    },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    historyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textMuted,
    },
    clearButton: {
      fontSize: 14,
      color: colors.accentViolet,
    },
    clearHistoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    clearHistoryIcon: {
      marginRight: 6,
    },
    historyItem: {
      padding: 16,
      backgroundColor: colors.surfaceCard + '80',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.textMuted + '1A',
      marginBottom: 12,
    },
    historyText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    buttonContainer: {
      padding: 24,
      paddingBottom: 110,
      backgroundColor: colors.surfaceCard + 'CC',
      borderTopWidth: 1,
      borderTopColor: colors.textMuted + '1A',
    },
    recordButton: {
      flexDirection: 'row',
      height: 72,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      elevation: 8,
      shadowColor: colors.accentViolet,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
    },
    recordIcon: {},
    recordButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
