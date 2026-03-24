import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { useAppTheme, type AppColorsType } from '../theme';
import { StructuredAssistantContent } from './StructuredAssistantContent';
import type { ConversationMessage } from '../types/chat';

export type ChatMessage = ConversationMessage;

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  isStreaming = false,
  onPress,
  onLongPress,
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { content, role, tokensPerSecond, totalTokens, isError, wasCancelled } = message;
  const isUser = role === 'user';

  const bubble = (
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
          {content}
        </Text>
      ) : (
        <StructuredAssistantContent content={content} />
      )}

      {!isUser && !isStreaming && (tokensPerSecond || totalTokens) ? (
        <View style={styles.metricsContainer}>
          {tokensPerSecond ? (
            <Text style={styles.metrics}>Speed {tokensPerSecond.toFixed(1)} tok/s</Text>
          ) : null}
          {totalTokens ? (
            <Text style={styles.metrics}>Tokens {totalTokens}</Text>
          ) : null}
        </View>
      ) : null}

      {wasCancelled ? (
        <Text style={styles.cancelledText}>Generation cancelled</Text>
      ) : null}

      {isStreaming ? <Text style={styles.streamingIndicator}>...</Text> : null}
    </View>
  );

  return (
    <Animated.View
      entering={FadeInUp.springify().mass(0.8)}
      layout={Layout.springify().mass(0.8)}
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      {onPress || onLongPress ? (
        <TouchableOpacity activeOpacity={0.92} onPress={onPress} onLongPress={onLongPress}>
          {bubble}
        </TouchableOpacity>
      ) : (
        bubble
      )}
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
