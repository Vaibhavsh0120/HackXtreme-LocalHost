import React, { useState, useEffect, useCallback } from 'react';
import { Database, Trash2 } from 'lucide-react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import RNFS from 'react-native-fs';
import { AppColors } from '../theme';

export const SettingsScreen: React.FC = () => {
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState<boolean>(true);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  const calculateDirectorySize = async (dirPath: string): Promise<number> => {
    try {
      const result = await RNFS.readDir(dirPath);
      let totalSize = 0;
      for (const file of result) {
        if (file.isFile()) {
          totalSize += file.size;
        } else if (file.isDirectory()) {
          totalSize += await calculateDirectorySize(file.path);
        }
      }
      return totalSize;
    } catch (error) {
      console.log('Error reading directory:', error);
      return 0;
    }
  };

  const getStorageInfo = useCallback(async () => {
    setIsCalculating(true);
    try {
      const docPath = RNFS.DocumentDirectoryPath;
      const size = await calculateDirectorySize(docPath);
      setCacheSize(size);
    } catch (error) {
      console.error('Failed to calculate storage:', error);
    } finally {
      setIsCalculating(false);
    }
  }, []);

  useEffect(() => {
    getStorageInfo();
  }, [getStorageInfo]);

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Storage',
      'Are you sure you want to clear all downloaded models and data? You will need to re-download them to use the AI.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              const docPath = RNFS.DocumentDirectoryPath;
              const files = await RNFS.readDir(docPath);
              for (const file of files) {
                await RNFS.unlink(file.path).catch(e => console.log('Could not delete', file.path, e));
              }
              await getStorageInfo();
              Alert.alert('Success', 'Storage cleared successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear storage.');
              console.error(error);
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const cacheSizeFormatted = formatBytes(cacheSize);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[AppColors.primaryDark, '#0F1629', AppColors.primaryMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerText}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Manage your application preferences</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manage AI Models</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconContainer}>
                  <Database size={24} color={AppColors.accentCyan} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.label}>Local Model Storage Used</Text>
                  {isCalculating ? (
                    <ActivityIndicator size="small" color={AppColors.accentCyan} style={styles.loader} />
                  ) : (
                    <Text style={styles.value}>{cacheSizeFormatted}</Text>
                  )}
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: cacheSize > 0 ? '10%' : '0%' }]} />
              </View>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleClearCache}
                disabled={isClearing || isCalculating}
              >
                <LinearGradient
                  colors={[AppColors.error, '#991B1B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionGradient}
                >
                  {isClearing ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Trash2 size={18} color="#FFF" />
                      <Text style={styles.actionText}>Clear All Models</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryDark,
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
  headerText: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 16,
  },
  card: {
    backgroundColor: AppColors.surfaceCard + 'CC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.textMuted + '1A',
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: AppColors.accentCyan + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {},
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  loader: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  progressContainer: {
    height: 6,
    backgroundColor: AppColors.primaryMid,
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: AppColors.accentCyan,
    borderRadius: 3,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionIcon: {},
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
