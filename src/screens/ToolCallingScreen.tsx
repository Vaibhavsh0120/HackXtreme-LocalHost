import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bot, Info, MessageSquare, Package, Send, Wrench, XCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { RunAnywhere } from '@runanywhere/core';
import { useAppTheme, type AppColorsType } from '../theme';
import { useModelService } from '../services/ModelService';
import {
  buildAssistantMarkup,
  buildToolCallMarkup,
  buildToolResultMarkup,
} from '../services/chatMarkup';
import { CHAT_TOOLS, registerChatTools } from '../services/chatTools';
import {
  ModelLoaderWidget,
  PrivacyBadge,
  StructuredAssistantContent,
} from '../components';

type LogType = 'info' | 'prompt' | 'tool_call' | 'tool_result' | 'response' | 'error';

interface LogEntry {
  id: number;
  type: LogType;
  title: string;
  detail?: string;
  structured?: boolean;
  timestamp: Date;
}

const LOG_ICONS: Record<LogType, React.ComponentType<any>> = {
  info: Info,
  prompt: MessageSquare,
  tool_call: Wrench,
  tool_result: Package,
  response: Bot,
  error: XCircle,
};

const buildToolSelectionPrompt = (prompt: string) => {
  const toolDescriptions = CHAT_TOOLS.map(tool => {
    const parameters = tool.parameters.length > 0
      ? tool.parameters
          .map(parameter => `${parameter.name}${parameter.required ? ' (required)' : ''}: ${parameter.description}`)
          .join('\n')
      : 'No parameters';

    return `${tool.name}\n${tool.description}\n${parameters}`;
  }).join('\n\n');

  return [
    'You are a tool-calling assistant.',
    'Decide whether one of the available tools is needed to answer the user.',
    'If a tool is needed, respond with exactly one tool call in this format:',
    '<tool_call>{"name":"tool_name","arguments":{"key":"value"}}</tool_call>',
    'If no tool is needed, answer the user normally with plain text.',
    `Available tools:\n${toolDescriptions}`,
    `User request: ${prompt}`,
  ].join('\n\n');
};

const buildFinalResponsePrompt = (
  prompt: string,
  toolName: string,
  result: Record<string, unknown>,
) => [
  'You are a helpful assistant.',
  `User request: ${prompt}`,
  `Tool used: ${toolName}`,
  `Tool result: ${JSON.stringify(result)}`,
  'Provide a direct natural-language answer for the user.',
].join('\n\n');

export const ToolCallingScreen: React.FC = () => {
  const modelService = useModelService();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const scrollRef = useRef<ScrollView>(null);

  const [inputText, setInputText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [toolsRegistered, setToolsRegistered] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (logs.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [logs]);

  const addLog = (
    type: LogType,
    title: string,
    detail?: string,
    structured = false,
  ) => {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    setLogs(prev => [...prev, { id, type, title, detail, structured, timestamp: new Date() }]);
  };

  const handleRegisterTools = () => {
    try {
      registerChatTools();
      setToolsRegistered(true);
      addLog('info', 'Tools Registered', `Ready: ${CHAT_TOOLS.map(tool => tool.name).join(', ')}`);
    } catch (error) {
      addLog('error', 'Registration Failed', String(error));
    }
  };

  const handleGenerate = async () => {
    const prompt = inputText.trim();
    if (!prompt || isRunning) {
      return;
    }

    if (!toolsRegistered) {
      handleRegisterTools();
    }

    setInputText('');
    setIsRunning(true);
    addLog('prompt', 'User Prompt', prompt);

    try {
      registerChatTools();
      setToolsRegistered(true);
      addLog('info', 'Execution', 'Checking if a tool is needed...');

      const initialResult = await RunAnywhere.generate(
        buildToolSelectionPrompt(prompt),
        {
          maxTokens: 320,
          temperature: 0.2,
        },
      );

      const parsed = await RunAnywhere.parseToolCall(initialResult.text);

      if (!parsed.toolCall) {
        addLog('info', 'No Tool Calls', 'The model answered directly without using a tool.');
        addLog('response', 'Model Response', buildAssistantMarkup(parsed.text || initialResult.text), true);
        return;
      }

      addLog('tool_call', `Tool Call: ${parsed.toolCall.toolName}`, buildToolCallMarkup(parsed.toolCall), true);
      addLog('info', 'Execution', `Running ${parsed.toolCall.toolName}...`);

      const toolResult = await RunAnywhere.executeTool(parsed.toolCall);
      addLog(
        'tool_result',
        `Result: ${toolResult.toolName} (${toolResult.success ? 'success' : 'failed'})`,
        buildToolResultMarkup(toolResult),
        true,
      );

      const resultPayload = toolResult.success
        ? (toolResult.result ?? {})
        : { error: toolResult.error ?? 'Unknown error' };

      const finalResult = await RunAnywhere.generate(
        buildFinalResponsePrompt(prompt, parsed.toolCall.toolName, resultPayload),
        {
          maxTokens: 320,
          temperature: 0.7,
        },
      );

      addLog('response', 'Model Response', buildAssistantMarkup(finalResult.text), true);
    } catch (error) {
      addLog('error', 'Generation Failed', String(error));
    } finally {
      setIsRunning(false);
    }
  };

  const handleParseSample = async () => {
    addLog('info', 'Parse Test', 'Parsing a sample tool call payload and rendering it as structured output.');

    const sampleOutput = `I'll check the weather for you.\n<tool_call>{"name": "get_weather", "arguments": {"city": "San Francisco"}}</tool_call>`;

    try {
      const parsed = await RunAnywhere.parseToolCall(sampleOutput);
      if (parsed.toolCall) {
        addLog('tool_call', 'Parsed Tool Call', buildToolCallMarkup(parsed.toolCall), true);
      } else {
        addLog('info', 'No Tool Call Detected', parsed.text || '(empty)');
      }
    } catch (error) {
      addLog('error', 'Parse Failed', String(error));
    }
  };

  if (!modelService.isLLMLoaded) {
    return (
      <ModelLoaderWidget
        title="LLM Model Required"
        subtitle="Download and load a language model to test tool calling"
        icon="tools"
        accentColor={colors.accentOrange}
        isDownloading={modelService.isLLMDownloading}
        isLoading={modelService.isLLMLoading}
        isDownloaded={modelService.isLLMDownloaded}
        progress={modelService.llmDownloadProgress}
        onLoad={modelService.downloadAndLoadLLM}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 16 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionBtn, toolsRegistered && styles.actionBtnActive]}
          onPress={handleRegisterTools}
        >
          <Text style={styles.actionBtnText}>{toolsRegistered ? 'Tools Ready' : 'Register Tools'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleParseSample}>
          <Text style={styles.actionBtnText}>Parse Test</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnClear} onPress={() => setLogs([])}>
          <Text style={styles.actionBtnClearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toolChips}>
        {CHAT_TOOLS.map(tool => (
          <View key={tool.name} style={styles.toolChip}>
            <Text style={styles.toolChipText}>{tool.name}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.logArea}
        contentContainerStyle={styles.logContent}
      >
        {logs.length === 0 ? (
          <View style={styles.emptyState}>
            <Wrench size={56} color={colors.accentOrange} strokeWidth={1.5} style={styles.emptyStateIcon} />
            <Text style={styles.emptyTitle}>Tool Calling Test</Text>
            <Text style={styles.emptySubtitle}>
              Register tools, then ask the model to use them.
              {'\n'}
              Try: "What's the weather in Tokyo?" or "Calculate 42 * 17"
            </Text>
            <PrivacyBadge label="Tools" />
          </View>
        ) : (
          logs.map(log => {
            const Icon = LOG_ICONS[log.type];

            return (
              <View key={log.id} style={[styles.logEntry, styles[`log_${log.type}`]]}>
                <View style={styles.logHeader}>
                  <Icon size={16} color={colors.textPrimary} />
                  <Text style={styles.logTitle}>{log.title}</Text>
                  <Text style={styles.logTime}>
                    {log.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </Text>
                </View>
                {log.detail ? (
                  log.structured ? (
                    <View style={styles.structuredLog}>
                      <StructuredAssistantContent content={log.detail} compact />
                    </View>
                  ) : (
                    <Text style={styles.logDetail}>{log.detail}</Text>
                  )
                ) : null}
              </View>
            );
          })
        )}

        {isRunning ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.accentOrange} />
            <Text style={styles.loadingText}>Generating...</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.suggestions}>
        {[
          'What is the weather in Tokyo?',
          'Calculate 123 * 456',
          'What time is it in New York?',
        ].map(suggestion => (
          <TouchableOpacity
            key={suggestion}
            style={styles.suggestionChip}
            onPress={() => setInputText(suggestion)}
          >
            <Text style={styles.suggestionText} numberOfLines={1}>
              {suggestion}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Ask something that needs a tool..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleGenerate}
            editable={!isRunning}
            multiline
          />
          <TouchableOpacity onPress={handleGenerate} disabled={!inputText.trim() || isRunning}>
            <LinearGradient
              colors={[colors.btnActiveStart, colors.btnActiveEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.sendButton, (!inputText.trim() || isRunning) && styles.sendButtonDisabled]}
            >
              <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: AppColorsType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryDark,
    },
    actionBar: {
      flexDirection: 'row',
      padding: 12,
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.accentOrange + '40',
      alignItems: 'center',
    },
    actionBtnActive: {
      backgroundColor: colors.accentOrange + '20',
      borderColor: colors.accentOrange,
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accentOrange,
    },
    actionBtnClear: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.textMuted + '40',
      alignItems: 'center',
    },
    actionBtnClearText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    toolChips: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingBottom: 8,
      gap: 6,
    },
    toolChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
    },
    toolChipText: {
      fontSize: 11,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      color: colors.textSecondary,
    },
    logArea: {
      flex: 1,
    },
    logContent: {
      padding: 12,
      paddingBottom: 8,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
    },
    emptyStateIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 32,
    },
    logEntry: {
      marginBottom: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    logHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    logTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    logTime: {
      fontSize: 10,
      color: colors.textMuted,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    logDetail: {
      marginTop: 6,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    structuredLog: {
      marginTop: 8,
    },
    log_info: {
      backgroundColor: colors.info + '10',
      borderColor: colors.info + '30',
    },
    log_prompt: {
      backgroundColor: colors.accentCyan + '10',
      borderColor: colors.accentCyan + '30',
    },
    log_tool_call: {
      backgroundColor: colors.accentOrange + '10',
      borderColor: colors.accentOrange + '30',
    },
    log_tool_result: {
      backgroundColor: colors.accentGreen + '10',
      borderColor: colors.accentGreen + '30',
    },
    log_response: {
      backgroundColor: colors.accentViolet + '10',
      borderColor: colors.accentViolet + '30',
    },
    log_error: {
      backgroundColor: colors.error + '10',
      borderColor: colors.error + '30',
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 13,
      color: colors.accentOrange,
    },
    suggestions: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingBottom: 8,
      gap: 6,
    },
    suggestionChip: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: colors.surfaceCard,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.accentOrange + '30',
    },
    suggestionText: {
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    inputContainer: {
      padding: 12,
      paddingBottom: 100,
      backgroundColor: colors.surfaceCard + 'CC',
      borderTopWidth: 1,
      borderTopColor: colors.textMuted + '1A',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    input: {
      flex: 1,
      backgroundColor: colors.primaryMid,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textPrimary,
      maxHeight: 80,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
  });
