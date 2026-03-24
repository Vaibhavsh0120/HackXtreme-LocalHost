import React from 'react';
import { MessageCircle, Mic, Volume2, Sparkles, Wrench, Package, Lock } from 'lucide-react-native';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAppTheme, type AppColorsType } from '../theme';

interface ModelLoaderWidgetProps {
  title: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  isDownloading: boolean;
  isLoading: boolean;
  isDownloaded?: boolean;
  progress: number;
  onLoad: () => void;
}

export const ModelLoaderWidget: React.FC<ModelLoaderWidgetProps> = ({
  title,
  subtitle,
  accentColor,
  isDownloading,
  isLoading,
  isDownloaded,
  progress,
  onLoad,
  icon,
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const renderIcon = () => {
    switch (icon) {
      case 'chat': return <MessageCircle size={48} color={accentColor} strokeWidth={1.5} />;
      case 'mic': return <Mic size={48} color={accentColor} strokeWidth={1.5} />;
      case 'volume': return <Volume2 size={48} color={accentColor} strokeWidth={1.5} />;
      case 'pipeline': return <Sparkles size={48} color={accentColor} strokeWidth={1.5} />;
      case 'tools': return <Wrench size={48} color={accentColor} strokeWidth={1.5} />;
      default: return <Package size={48} color={accentColor} strokeWidth={1.5} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
          {renderIcon()}
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {(isDownloading || isLoading) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={styles.loadingText}>
              {isDownloading
                ? `Downloading... ${Math.round(progress)}%`
                : 'Loading model...'}
            </Text>
            {isDownloading && (
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${progress}%`,
                      backgroundColor: colors.btnActiveStart,
                    },
                  ]}
                />
              </View>
            )}
          </View>
        )}

        {!isDownloading && !isLoading && (
          <TouchableOpacity onPress={onLoad} activeOpacity={0.8}>
            <LinearGradient
              colors={[colors.btnActiveStart, colors.btnActiveEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {isDownloaded ? (title.includes('LLM') ? 'Load LLM' : 'Load Model') : 'Download & Load Model'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.infoBox}>
          <Lock size={14} color={colors.textSecondary} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            All processing happens on your device. Your data never leaves your phone.
          </Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: AppColorsType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryDark,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    content: {
      maxWidth: 400,
      alignItems: 'center',
    },
    iconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    iconEmoji: {},
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 20,
    },
    loadingContainer: {
      alignItems: 'center',
      marginVertical: 24,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 14,
      color: colors.textSecondary,
    },
    progressBarContainer: {
      width: 200,
      height: 6,
      backgroundColor: colors.surfaceCard,
      borderRadius: 3,
      marginTop: 12,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 3,
    },
    button: {
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 12,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      minWidth: 220,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      textAlign: 'center',
    },
    infoBox: {
      marginTop: 32,
      padding: 16,
      backgroundColor: colors.surfaceCard,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoIcon: {
      marginRight: 6,
    },
    infoText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
