import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useAppTheme, type AppColorsType } from '../theme';
import { parseAssistantMarkup } from '../services/chatMarkup';

interface StructuredAssistantContentProps {
  content: string;
  compact?: boolean;
}

export const StructuredAssistantContent: React.FC<StructuredAssistantContentProps> = ({
  content,
  compact = false,
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors, compact);
  const markdownStyles = createMarkdownStyles(colors, compact);
  const parsed = parseAssistantMarkup(content);

  if (!parsed.hasStructuredContent) {
    return <Markdown style={markdownStyles}>{content}</Markdown>;
  }

  return (
    <View style={styles.container}>
      {parsed.toolCalls.map((toolCall, index) => (
        <View key={`tool-call-${toolCall.toolName}-${index}`} style={styles.blockCard}>
          <Text style={styles.blockLabel}>Tool Call</Text>
          <Text style={styles.blockTitle}>{toolCall.toolName}</Text>
          <Text style={styles.blockBody}>{toolCall.argumentsText || 'No arguments'}</Text>
        </View>
      ))}

      {parsed.toolResults.map((toolResult, index) => (
        <View
          key={`tool-result-${toolResult.toolName}-${index}`}
          style={[
            styles.blockCard,
            toolResult.status.toLowerCase() === 'failed' ? styles.errorCard : styles.successCard,
          ]}
        >
          <Text style={styles.blockLabel}>Tool Result</Text>
          <Text style={styles.blockTitle}>
            {toolResult.toolName} - {toolResult.status}
          </Text>
          <Text style={styles.blockBody}>{toolResult.outputText || 'No output'}</Text>
        </View>
      ))}

      {parsed.assistantMessage ? (
        <View style={styles.messageBlock}>
          <Text style={styles.blockLabel}>Assistant</Text>
          <Markdown style={markdownStyles}>{parsed.assistantMessage}</Markdown>
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (colors: AppColorsType, compact: boolean) =>
  StyleSheet.create({
    container: {
      gap: compact ? 8 : 10,
    },
    blockCard: {
      backgroundColor: colors.primaryMid,
      borderRadius: compact ? 12 : 14,
      borderWidth: 1,
      borderColor: colors.textMuted + '33',
      padding: compact ? 10 : 12,
      gap: 4,
    },
    successCard: {
      borderColor: colors.success + '55',
    },
    errorCard: {
      borderColor: colors.error + '55',
    },
    blockLabel: {
      fontSize: compact ? 10 : 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    blockTitle: {
      fontSize: compact ? 13 : 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    blockBody: {
      fontSize: compact ? 12 : 13,
      lineHeight: compact ? 18 : 20,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    messageBlock: {
      gap: 4,
    },
  });

const createMarkdownStyles = (colors: AppColorsType, compact: boolean) =>
  StyleSheet.create({
    body: {
      color: colors.textPrimary,
      fontSize: compact ? 13 : 15,
      lineHeight: compact ? 19 : 21,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: compact ? 6 : 8,
    },
    strong: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    code_inline: {
      backgroundColor: colors.primaryMid,
      color: colors.textPrimary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    code_block: {
      backgroundColor: colors.primaryMid,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      padding: compact ? 10 : 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    fence: {
      backgroundColor: colors.primaryMid,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      padding: compact ? 10 : 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    bullet_list: {
      marginVertical: 0,
    },
    list_item: {
      color: colors.textPrimary,
    },
  });
