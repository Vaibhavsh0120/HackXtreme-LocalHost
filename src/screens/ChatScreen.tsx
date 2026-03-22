import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, ArrowDown, MessageCircle } from 'lucide-react-native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { RunAnywhere } from '@runanywhere/core';
import { AppColors } from '../theme';
import { useModelService } from '../services/ModelService';
import { ChatMessageBubble, ChatMessage, ModelLoaderWidget, PrivacyBadge } from '../components';

export const ChatScreen: React.FC = () => {
  const modelService = useModelService();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const streamCancelRef = useRef<(() => void) | null>(null);
  const responseRef = useRef(''); // Track response for closure

  useEffect(() => {
    // Scroll to bottom when messages change, but only if user hasn't scrolled up
    if (messages.length > 0 && !isScrolledUp) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, currentResponse]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 150; // Threshold before we consider them 'scrolled up'
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    setIsScrolledUp(!isCloseToBottom);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isGenerating) return;

    setIsScrolledUp(false); // Reset scroll tracking for new message

    // Add user message
    const userMessage: ChatMessage = {
      text,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsGenerating(true);
    setCurrentResponse('');

    try {
      // Per docs: https://docs.runanywhere.ai/react-native/quick-start#6-stream-responses
      const streamResult = await RunAnywhere.generateStream(text, {
        maxTokens: 256,
        temperature: 0.8,
      });

      streamCancelRef.current = streamResult.cancel;
      responseRef.current = '';

      // Stream tokens as they arrive
      for await (const token of streamResult.stream) {
        responseRef.current += token;
        setCurrentResponse(responseRef.current);
      }

      const finalResult = await streamResult.result;

      ReactNativeHapticFeedback.trigger('rigid', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });

      // Add assistant message (use ref to get final text due to closure)
      const assistantMessage: ChatMessage = {
        text: responseRef.current,
        isUser: false,
        timestamp: new Date(),
        tokensPerSecond: (finalResult as any).performanceMetrics?.tokensPerSecond,
        totalTokens: (finalResult as any).performanceMetrics?.totalTokens,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentResponse('');
      responseRef.current = '';
      setIsGenerating(false);
    } catch (error) {
      const errorMessage: ChatMessage = {
        text: `Error: ${error}`,
        isUser: false,
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
      setCurrentResponse('');
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    if (streamCancelRef.current) {
      streamCancelRef.current();
      if (responseRef.current) {
        const message: ChatMessage = {
          text: responseRef.current,
          isUser: false,
          timestamp: new Date(),
          wasCancelled: true,
        };
        setMessages(prev => [...prev, message]);
      }
      setCurrentResponse('');
      responseRef.current = '';
      setIsGenerating(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const renderSuggestionChip = (text: string) => (
    <TouchableOpacity
      key={text}
      style={styles.suggestionChip}
      onPress={() => {
        setInputText(text);
        handleSend();
      }}
    >
      <Text style={styles.suggestionText}>{text}</Text>
    </TouchableOpacity>
  );

  if (!modelService.isLLMLoaded) {
    return (
      <ModelLoaderWidget
        title="LLM Model Required"
        subtitle="Download and load the language model to start chatting"
        icon="chat"
        accentColor={AppColors.accentCyan}
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <MessageCircle size={48} color={AppColors.accentCyan} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Start a Conversation</Text>
          <Text style={styles.emptySubtitle}>
            Ask anything! The AI runs entirely on your device.
          </Text>
          <PrivacyBadge label="Chat" />
          <View style={styles.suggestionsContainer}>
            {renderSuggestionChip('Tell me a joke')}
            {renderSuggestionChip('What is AI?')}
            {renderSuggestionChip('Write a haiku')}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={[...messages, ...(isGenerating ? [{ text: currentResponse || '...', isUser: false, timestamp: new Date() }] : [])]}
          renderItem={({ item, index }) => (
            <ChatMessageBubble
              message={item as ChatMessage}
              isStreaming={isGenerating && index === messages.length}
            />
          )}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      )}

      {/* Floating Action Button for Auto-Scroll */}
      {isGenerating && isScrolledUp && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setIsScrolledUp(false);
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        >
          <LinearGradient
            colors={[AppColors.btnActiveStart, AppColors.btnActiveEnd]}
            style={styles.fabGradient}
          >
            <ArrowDown size={24} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={AppColors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            editable={!isGenerating}
            multiline
          />
          {isGenerating ? (
            <TouchableOpacity onPress={handleStop} style={styles.stopButton}>
              <View style={styles.stopIcon}>
                <Square size={20} color={AppColors.error} strokeWidth={3} fill={AppColors.error} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSend} disabled={!inputText.trim()}>
              <LinearGradient
                colors={[AppColors.btnActiveStart, AppColors.btnActiveEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendButton}
              >
                <Send size={20} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryDark,
  },
  messageList: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    backgroundColor: AppColors.accentCyan + '20',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIcon: {},
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: AppColors.surfaceCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.accentCyan + '40',
  },
  suggestionText: {
    fontSize: 12,
    color: AppColors.textPrimary,
  },
  inputContainer: {
    padding: 16,
    paddingBottom: 100,
    backgroundColor: AppColors.surfaceCard + 'CC',
    borderTopWidth: 1,
    borderTopColor: AppColors.textMuted + '1A',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: AppColors.primaryMid,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    color: AppColors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: AppColors.accentCyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sendIcon: {},
  stopButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.error + '33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIconText: {},
  fab: {
    position: 'absolute',
    bottom: 180,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    elevation: 8,
    shadowColor: AppColors.accentCyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {},
});
