import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';
import { useAppTheme, type AppColorsType } from '../theme';

export interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  tokensPerSecond?: number;
  totalTokens?: number;
  isError?: boolean;
  wasCancelled?: boolean;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  isStreaming = false,
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const markdownStyles = createMarkdownStyles(colors);
  const { text, isUser, tokensPerSecond, totalTokens, isError, wasCancelled } = message;

  return (
    <Animated.View
      entering={FadeInUp.springify().mass(0.8)}
      layout={Layout.springify().mass(0.8)}
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          isError && styles.errorBubble,
        ]}
      >
        {isUser ? (
          <Text
            style={[
              styles.text,
              styles.userText,
              isError && styles.errorText,
            ]}
          >
            {text}
          </Text>
        ) : (
          <Markdown style={markdownStyles}>
            {text}
          </Markdown>
        )}

        {!isUser && !isStreaming && (tokensPerSecond || totalTokens) && (
          <View style={styles.metricsContainer}>
            {tokensPerSecond && (
              <Text style={styles.metrics}>
                ⚡ {tokensPerSecond.toFixed(1)} tok/s
              </Text>
            )}
            {totalTokens && (
              <Text style={styles.metrics}>📊 {totalTokens} tokens</Text>
            )}
          </View>
        )}

        {wasCancelled && (
          <Text style={styles.cancelledText}>⚠️ Generation cancelled</Text>
        )}

        {isStreaming && <Text style={styles.streamingIndicator}>▊</Text>}
      </View>
    </Animated.View>
  );
};

const createStyles = (colors: AppColorsType) =>
  StyleSheet.create({
    container: {
      marginVertical: 4,
      paddingHorizontal: 16,
    },
    userContainer: {
      alignItems: 'flex-end',
    },
    assistantContainer: {
      alignItems: 'flex-start',
    },
    bubble: {
      maxWidth: '85%',
      padding: 12,
      borderRadius: 16,
      marginVertical: 2,
    },
    userBubble: {
      backgroundColor: colors.accentCyan,
      borderBottomRightRadius: 4,
    },
    assistantBubble: {
      backgroundColor: colors.surfaceCard,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.textMuted + '20',
    },
    errorBubble: {
      backgroundColor: colors.error + '20',
      borderColor: colors.error + '40',
    },
    text: {
      fontSize: 15,
      lineHeight: 21,
    },
    userText: {
      color: colors.primaryDark,
    },
    assistantText: {
      color: colors.textPrimary,
    },
    errorText: {
      color: colors.error,
    },
    metricsContainer: {
      flexDirection: 'row',
      marginTop: 8,
      gap: 12,
    },
    metrics: {
      fontSize: 11,
      color: colors.textMuted,
    },
    cancelledText: {
      fontSize: 11,
      color: colors.warning,
      marginTop: 4,
    },
    streamingIndicator: {
      fontSize: 16,
      color: colors.accentCyan,
      marginTop: 2,
    },
  });

const createMarkdownStyles = (colors: AppColorsType) =>
  StyleSheet.create({
    body: {
      color: colors.textPrimary,
      fontSize: 15,
      lineHeight: 21,
    },
    code_inline: {
      backgroundColor: colors.primaryMid,
      color: colors.textPrimary,
      fontFamily: 'monospace',
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    code_block: {
      backgroundColor: colors.primaryDark,
      color: colors.textSecondary,
      fontFamily: 'monospace',
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    fence: {
      backgroundColor: colors.primaryDark,
      color: colors.textSecondary,
      fontFamily: 'monospace',
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    strong: {
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    em: {
      fontStyle: 'italic',
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 8,
    },
  });
