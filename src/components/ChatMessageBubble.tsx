import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { AppColors } from '../theme';

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
  const { text, isUser, tokensPerSecond, totalTokens, isError, wasCancelled } = message;

  return (
    <View
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
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: AppColors.accentCyan,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: AppColors.surfaceCard,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: AppColors.textMuted + '20',
  },
  errorBubble: {
    backgroundColor: AppColors.error + '20',
    borderColor: AppColors.error + '40',
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: AppColors.primaryDark,
  },
  assistantText: {
    color: AppColors.textPrimary,
  },
  errorText: {
    color: AppColors.error,
  },
  metricsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  metrics: {
    fontSize: 11,
    color: AppColors.textMuted,
  },
  cancelledText: {
    fontSize: 11,
    color: AppColors.warning,
    marginTop: 4,
  },
  streamingIndicator: {
    fontSize: 16,
    color: AppColors.accentCyan,
    marginTop: 2,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: AppColors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
  },
  code_inline: {
    backgroundColor: AppColors.primaryMid,
    color: AppColors.textPrimary,
    fontFamily: 'monospace',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: AppColors.primaryDark,
    color: AppColors.textSecondary,
    fontFamily: 'monospace',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: AppColors.primaryDark,
    color: AppColors.textSecondary,
    fontFamily: 'monospace',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  strong: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  em: {
    fontStyle: 'italic',
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
});
