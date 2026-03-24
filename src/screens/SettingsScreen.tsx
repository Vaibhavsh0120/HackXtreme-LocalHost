import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Check, Database, Download, MessageCircle, Mic, Monitor, Moon, Trash2, Volume2, Sun } from 'lucide-react-native';
import RNFS from 'react-native-fs';
import { getModelStorageDirectory, useModelService } from '../services/ModelService';
import { useAppTheme, type AppColorsType, type ThemePreference } from '../theme';

type ModelCardProps = {
  title: string;
  subtitle: string;
  downloaded: boolean;
  loaded: boolean;
  downloading: boolean;
  loading: boolean;
  progress: number;
  onPrimaryPress: () => Promise<void>;
  onDeletePress: () => Promise<void>;
  accentColor: string;
  icon: React.ReactNode;
  colors: AppColorsType;
};

const formatBytes = (bytes: number, decimals = 2) => {
  if (!bytes) {
    return '0 Bytes';
  }

  const unit = 1024;
  const precision = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(unit)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(precision))} ${sizes[index]}`;
};

const ModelCard: React.FC<ModelCardProps> = ({
  title,
  subtitle,
  downloaded,
  loaded,
  downloading,
  loading,
  progress,
  onPrimaryPress,
  onDeletePress,
  accentColor,
  icon,
  colors,
}) => {
  const styles = createStyles(colors);

  const primaryLabel = downloading
    ? `Downloading ${Math.round(progress)}%`
    : loading
      ? 'Loading...'
      : loaded
        ? 'Loaded'
        : downloaded
          ? 'Load'
          : 'Download';

  const isBusy = downloading || loading;

  return (
    <View style={styles.modelCard}>
      <View style={styles.modelHeader}>
        <View style={[styles.modelIconWrap, { backgroundColor: accentColor + '14' }]}>
          {icon}
        </View>
        <View style={styles.modelMeta}>
          <Text style={styles.modelTitle}>{title}</Text>
          <Text style={styles.modelSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, downloaded ? styles.badgeActive : styles.badgeMuted]}>
          <Text style={[styles.badgeText, downloaded ? styles.badgeTextActive : styles.badgeTextMuted]}>
            {downloaded ? 'Downloaded' : 'Not downloaded'}
          </Text>
        </View>
        <View style={[styles.badge, loaded ? styles.badgeActive : styles.badgeMuted]}>
          <Text style={[styles.badgeText, loaded ? styles.badgeTextActive : styles.badgeTextMuted]}>
            {loaded ? 'Loaded' : 'Not loaded'}
          </Text>
        </View>
      </View>

      {downloading ? (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(Math.max(progress, 0), 100)}%`,
                  backgroundColor: accentColor,
                },
              ]}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.modelActions}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (loaded || isBusy) && styles.disabledButton,
          ]}
          disabled={loaded || isBusy}
          onPress={() => {
            onPrimaryPress().catch((error) => {
              console.error(`Failed primary model action for ${title}:`, error);
            });
          }}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : loaded ? (
            <Check size={16} color="#FFFFFF" />
          ) : (
            <Download size={16} color="#FFFFFF" />
          )}
          <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, (!downloaded || isBusy) && styles.disabledSecondaryButton]}
          disabled={!downloaded || isBusy}
          onPress={() => {
            onDeletePress().catch((error) => {
              console.error(`Failed delete model action for ${title}:`, error);
            });
          }}
        >
          <Trash2 size={16} color={downloaded && !isBusy ? colors.error : colors.textMuted} />
          <Text
            style={[
              styles.secondaryButtonText,
              { color: downloaded && !isBusy ? colors.error : colors.textMuted },
            ]}
          >
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const SettingsScreen: React.FC = () => {
  const modelService = useModelService();
  const { colors, preference, resolvedTheme, setPreference } = useAppTheme();
  const styles = createStyles(colors);

  const [storageSize, setStorageSize] = useState(0);
  const [isCalculating, setIsCalculating] = useState(true);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const calculateDirectorySize = useCallback(async (dirPath: string): Promise<number> => {
    try {
      const exists = await RNFS.exists(dirPath);
      if (!exists) {
        return 0;
      }

      const result = await RNFS.readDir(dirPath);
      let totalSize = 0;

      for (const file of result) {
        if (file.isFile()) {
          totalSize += Number(file.size);
        } else if (file.isDirectory()) {
          totalSize += await calculateDirectorySize(file.path);
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error reading directory size:', error);
      return 0;
    }
  }, []);

  const refreshStorage = useCallback(async () => {
    setIsCalculating(true);
    try {
      const size = await calculateDirectorySize(getModelStorageDirectory());
      setStorageSize(size);
    } finally {
      setIsCalculating(false);
    }
  }, [calculateDirectorySize]);

  useEffect(() => {
    refreshStorage().catch(() => {});
  }, [refreshStorage]);

  useEffect(() => {
    refreshStorage().catch(() => {});
  }, [
    modelService.isLLMDownloaded,
    modelService.isSTTDownloaded,
    modelService.isTTSDownloaded,
    refreshStorage,
  ]);

  const handleThemeChange = async (nextPreference: ThemePreference) => {
    await setPreference(nextPreference);
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Models',
      'Remove the language, speech, and voice models from local storage?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsClearingAll(true);
            try {
              await modelService.deleteAllModels();
              await modelService.refreshModelStates();
              await refreshStorage();
            } finally {
              setIsClearingAll(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage local AI models and the app theme.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.surfaceCard}>
            <Text style={styles.sectionLabel}>
              Current theme: {preference === 'system' ? `System (${resolvedTheme})` : resolvedTheme}
            </Text>
            <View style={styles.themeToggleRow}>
              {[
                { key: 'system' as const, label: 'System', icon: <Monitor size={16} color={preference === 'system' ? '#FFFFFF' : colors.textSecondary} /> },
                { key: 'light' as const, label: 'Light', icon: <Sun size={16} color={preference === 'light' ? '#FFFFFF' : colors.textSecondary} /> },
                { key: 'dark' as const, label: 'Dark', icon: <Moon size={16} color={preference === 'dark' ? '#FFFFFF' : colors.textSecondary} /> },
              ].map((option) => {
                const active = preference === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.themeChip, active && styles.themeChipActive]}
                    onPress={() => {
                      handleThemeChange(option.key).catch((error) => {
                        console.error('Failed to change theme:', error);
                      });
                    }}
                  >
                    {option.icon}
                    <Text style={[styles.themeChipText, active && styles.themeChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model Storage</Text>
          <View style={styles.surfaceCard}>
            <View style={styles.storageRow}>
              <View style={styles.storageIconWrap}>
                <Database size={22} color={colors.accentCyan} />
              </View>
              <View style={styles.storageMeta}>
                <Text style={styles.storageLabel}>RunAnywhere model data</Text>
                {isCalculating ? (
                  <ActivityIndicator size="small" color={colors.accentCyan} />
                ) : (
                  <Text style={styles.storageValue}>{formatBytes(storageSize)}</Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.clearAllButton, isClearingAll && styles.disabledSecondaryButton]}
              disabled={isClearingAll}
              onPress={handleDeleteAll}
            >
              {isClearingAll ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Trash2 size={16} color={colors.error} />
              )}
              <Text style={styles.clearAllText}>Delete all models</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Installed Models</Text>

          <ModelCard
            title="Language Model"
            subtitle="LiquidAI LFM2 350M for chat and tool calling"
            downloaded={modelService.isLLMDownloaded}
            loaded={modelService.isLLMLoaded}
            downloading={modelService.isLLMDownloading}
            loading={modelService.isLLMLoading}
            progress={modelService.llmDownloadProgress}
            onPrimaryPress={modelService.downloadAndLoadLLM}
            onDeletePress={modelService.deleteLLM}
            accentColor={colors.accentCyan}
            icon={<MessageCircle size={20} color={colors.accentCyan} />}
            colors={colors}
          />

          <ModelCard
            title="Speech Recognition"
            subtitle="Whisper tiny English model for speech-to-text"
            downloaded={modelService.isSTTDownloaded}
            loaded={modelService.isSTTLoaded}
            downloading={modelService.isSTTDownloading}
            loading={modelService.isSTTLoading}
            progress={modelService.sttDownloadProgress}
            onPrimaryPress={modelService.downloadAndLoadSTT}
            onDeletePress={modelService.deleteSTT}
            accentColor={colors.accentViolet}
            icon={<Mic size={20} color={colors.accentViolet} />}
            colors={colors}
          />

          <ModelCard
            title="Voice Synthesis"
            subtitle="Piper Lessac voice for on-device text-to-speech"
            downloaded={modelService.isTTSDownloaded}
            loaded={modelService.isTTSLoaded}
            downloading={modelService.isTTSDownloading}
            loading={modelService.isTTSLoading}
            progress={modelService.ttsDownloadProgress}
            onPrimaryPress={modelService.downloadAndLoadTTS}
            onDeletePress={modelService.deleteTTS}
            accentColor={colors.accentPink}
            icon={<Volume2 size={20} color={colors.accentPink} />}
            colors={colors}
          />
        </View>
      </ScrollView>
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
      backgroundColor: colors.primaryDark,
    },
    scrollContent: {
      padding: 24,
      paddingTop: 56,
      paddingBottom: 120,
      backgroundColor: colors.primaryDark,
    },
    header: {
      marginBottom: 28,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: 28,
    },
    sectionTitle: {
      marginBottom: 14,
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sectionLabel: {
      marginBottom: 14,
      fontSize: 14,
      color: colors.textSecondary,
    },
    surfaceCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.textMuted + '22',
      padding: 18,
    },
    themeToggleRow: {
      flexDirection: 'row',
      gap: 10,
    },
    themeChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.textMuted + '22',
    },
    themeChipActive: {
      backgroundColor: colors.btnActiveStart,
      borderColor: colors.btnActiveEnd,
    },
    themeChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    themeChipTextActive: {
      color: '#FFFFFF',
    },
    storageRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    storageIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentCyan + '14',
      marginRight: 14,
    },
    storageMeta: {
      flex: 1,
    },
    storageLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    storageValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    clearAllButton: {
      marginTop: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.error + '44',
      backgroundColor: colors.error + '10',
    },
    clearAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.error,
    },
    modelCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.textMuted + '22',
      padding: 18,
      marginBottom: 16,
    },
    modelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    modelIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    modelMeta: {
      flex: 1,
    },
    modelTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 3,
    },
    modelSubtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgeActive: {
      backgroundColor: colors.success + '16',
      borderColor: colors.success + '44',
    },
    badgeMuted: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.textMuted + '22',
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    badgeTextActive: {
      color: colors.success,
    },
    badgeTextMuted: {
      color: colors.textSecondary,
    },
    progressSection: {
      marginBottom: 14,
    },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceElevated,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    modelActions: {
      flexDirection: 'row',
      gap: 10,
    },
    primaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.btnActiveStart,
    },
    disabledButton: {
      opacity: 0.6,
    },
    primaryButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    secondaryButton: {
      minWidth: 104,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.textMuted + '22',
      backgroundColor: colors.surfaceElevated,
    },
    disabledSecondaryButton: {
      opacity: 0.55,
    },
    secondaryButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
