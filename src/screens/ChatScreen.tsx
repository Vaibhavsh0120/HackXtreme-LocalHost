import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  FlatList,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowDown,
  Copy,
  MessageCircle,
  PanelLeft,
  Plus,
  Send,
  Square,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  SlideInLeft,
  SlideOutLeft,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { RunAnywhere } from '@runanywhere/core';
import { useAppTheme, type AppColorsType } from '../theme';
import { useModelService } from '../services/ModelService';
import {
  appendMessageToConversation,
  createConversation,
  createConversationMessage,
  deleteConversationById,
  getConversationHistoryRevision,
  getConversationActivityTimestamp,
  getDefaultConversationTitle,
  loadConversationStore,
  saveConversationStore,
} from '../services/ConversationStorage';
import {
  buildAssistantMarkup,
  getConversationPreviewText,
  getCopyableAssistantText,
} from '../services/chatMarkup';
import {
  useIsFocused,
} from '@react-navigation/native';
import {
  ChatMessageBubble,
  ModelLoaderWidget,
  PrivacyBadge,
} from '../components';
import type {
  ConversationMessage,
  ConversationRecord,
  ConversationStoreState,
} from '../types/chat';

const formatConversationTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();

  return isSameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ChatScreen: React.FC = () => {
  const modelService = useModelService();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const styles = createStyles(colors, width);
  const flatListRef = useRef<FlatList<ConversationMessage>>(null);
  const conversationStateRef = useRef<ConversationStoreState | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamCancelRef = useRef<(() => void) | null>(null);
  const responseRef = useRef('');
  const cancelRequestedRef = useRef(false);
  const historyRevisionRef = useRef(getConversationHistoryRevision());
  const isFocused = useIsFocused();

  const [conversationState, setConversationState] = useState<ConversationStoreState | null>(null);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [currentResponse, setCurrentResponse] = useState('');
  const [toastText, setToastText] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const drawerWidth = Math.min(320, Math.max(272, width * 0.82));
  const conversations = conversationState?.conversations ?? [];
  const historyConversations = conversations.filter(conversation => conversation.messages.length > 0);
  const currentConversation = conversations.find(
    conversation => conversation.conversation_id === conversationState?.currentConversationId,
  ) ?? conversations[0];
  const currentConversationId = currentConversation?.conversation_id ?? '';
  const currentMessageCount = currentConversation?.messages.length ?? 0;

  useEffect(() => {
    const hydrateConversations = async () => {
      setIsLoadingConversations(true);
      const initialState = await loadConversationStore();
      conversationStateRef.current = initialState;
      setConversationState(initialState);
      setIsLoadingConversations(false);
    };

    hydrateConversations().catch(() => {
      setIsLoadingConversations(false);
    });
  }, []);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const latestRevision = getConversationHistoryRevision();
    if (latestRevision === historyRevisionRef.current) {
      return;
    }

    historyRevisionRef.current = latestRevision;

    const hydrateConversations = async () => {
      setIsLoadingConversations(true);
      const refreshedState = await loadConversationStore();
      conversationStateRef.current = refreshedState;
      setConversationState(refreshedState);
      setIsLoadingConversations(false);
      setInputText('');
      setCurrentResponse('');
      setIsSidebarOpen(false);
    };

    hydrateConversations().catch(() => {
      setIsLoadingConversations(false);
    });
  }, [isFocused]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!currentConversationId || isScrolledUp) {
      return;
    }

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, [currentConversationId, currentMessageCount, currentResponse, isScrolledUp]);

  const commitConversationState = async (
    updater: (state: ConversationStoreState) => ConversationStoreState,
  ) => {
    const currentState = conversationStateRef.current;
    if (!currentState) {
      return;
    }

    const nextState = updater(currentState);
    conversationStateRef.current = nextState;
    setConversationState(nextState);
    await saveConversationStore(nextState);
  };

  const showToast = (message: string) => {
    setToastText(message);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setToastText(null);
    }, 1800);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 150;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    setIsScrolledUp(!isCloseToBottom);
  };

  const handleCreateConversation = async () => {
    if (isGenerating) {
      return;
    }

    const nextConversation = createConversation();
    await commitConversationState(state => ({
      currentConversationId: nextConversation.conversation_id,
      conversations: [
        nextConversation,
        ...state.conversations.filter(conversation => conversation.messages.length > 0),
      ],
    }));
    setInputText('');
    setIsScrolledUp(false);
    setIsSidebarOpen(false);
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (isGenerating) {
      return;
    }

    await commitConversationState(state => ({
      ...state,
      currentConversationId: conversationId,
    }));
    setIsScrolledUp(false);
    setIsSidebarOpen(false);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (isGenerating) {
      return;
    }

    await commitConversationState(state => {
      const remainingConversations = deleteConversationById(state.conversations, conversationId);

      if (remainingConversations.length === 0) {
        const replacementConversation = createConversation();
        return {
          currentConversationId: replacementConversation.conversation_id,
          conversations: [replacementConversation],
        };
      }

      const nextCurrentConversationId = state.currentConversationId === conversationId
        ? remainingConversations[0].conversation_id
        : state.currentConversationId;

      return {
        currentConversationId: nextCurrentConversationId,
        conversations: remainingConversations,
      };
    });

    setIsSidebarOpen(false);
  };

  const confirmDeleteConversation = (conversation: ConversationRecord) => {
    Alert.alert(
      'Delete conversation',
      `Delete "${conversation.title}"? This removes the conversation from local storage.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            handleDeleteConversation(conversation.conversation_id).catch(() => {});
          },
        },
      ],
    );
  };

  const handleCopyAssistantMessage = (message: ConversationMessage) => {
    Clipboard.setString(getCopyableAssistantText(message.content));
    showToast('Copied to clipboard');
  };

  const handleAssistantLongPress = (message: ConversationMessage) => {
    const shareableText = getCopyableAssistantText(message.content);

    Alert.alert(
      'Assistant response',
      'Choose an action for this response.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: () => handleCopyAssistantMessage(message),
        },
        {
          text: 'Share',
          onPress: () => {
            Share.share({ message: shareableText }).catch(() => {});
          },
        },
      ],
    );
  };

  const appendMessage = async (
    role: 'user' | 'assistant',
    content: string,
    extras: Omit<ConversationMessage, 'role' | 'content' | 'timestamp'> = {},
  ) => {
    const targetConversationId = conversationStateRef.current?.currentConversationId;
    if (!targetConversationId) {
      return;
    }

    const message = createConversationMessage(role, content, extras);
    await commitConversationState(state => ({
      ...state,
      conversations: appendMessageToConversation(
        state.conversations,
        targetConversationId,
        message,
      ),
    }));
  };

  const resetPendingResponse = () => {
    streamCancelRef.current = null;
    responseRef.current = '';
    setCurrentResponse('');
  };

  const handleStop = () => {
    if (!isGenerating) {
      return;
    }

    cancelRequestedRef.current = true;
    streamCancelRef.current?.();
    RunAnywhere.cancelGeneration();
  };

  const handleSendText = async (overrideText?: string) => {
    const prompt = (overrideText ?? inputText).trim();
    if (!prompt || isGenerating || !currentConversation) {
      return;
    }

    setInputText('');
    setIsScrolledUp(false);
    setIsGenerating(true);
    setIsSidebarOpen(false);
    cancelRequestedRef.current = false;
    resetPendingResponse();

    await appendMessage('user', prompt);

    try {
      const streamResult = await RunAnywhere.generateStream(prompt, {
        maxTokens: 512,
        temperature: 0.8,
      });

      streamCancelRef.current = streamResult.cancel;

      for await (const token of streamResult.stream) {
        responseRef.current += token;
        setCurrentResponse(responseRef.current);
      }

      const finalResult = await streamResult.result;

      await appendMessage(
        'assistant',
        buildAssistantMarkup(responseRef.current || finalResult.text),
        {
          tokensPerSecond: finalResult.tokensPerSecond,
          totalTokens: finalResult.responseTokens,
        },
      );

      ReactNativeHapticFeedback.trigger('rigid', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    } catch (error) {
      if (cancelRequestedRef.current) {
        await appendMessage(
          'assistant',
          buildAssistantMarkup(responseRef.current || 'Generation cancelled.'),
          { wasCancelled: true },
        );
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await appendMessage(
          'assistant',
          buildAssistantMarkup(`Error: ${errorMessage}`),
          { isError: true },
        );
      }
    } finally {
      setIsGenerating(false);
      cancelRequestedRef.current = false;
      resetPendingResponse();
    }
  };

  const renderSuggestionChip = (text: string) => (
    <TouchableOpacity
      key={text}
      style={styles.suggestionChip}
      onPress={() => {
        handleSendText(text).catch(() => {});
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
        accentColor={colors.accentCyan}
        isDownloading={modelService.isLLMDownloading}
        isLoading={modelService.isLLMLoading}
        isDownloaded={modelService.isLLMDownloaded}
        progress={modelService.llmDownloadProgress}
        onLoad={modelService.downloadAndLoadLLM}
      />
    );
  }

  if (isLoadingConversations || !currentConversation) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + 16 }]}>
        <ActivityIndicator size="small" color={colors.accentCyan} />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 12 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.chatPane}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.sidebarToggle}
            onPress={() => setIsSidebarOpen(true)}
            disabled={isGenerating}
          >
            <PanelLeft size={18} color={colors.textPrimary} strokeWidth={2.3} />
          </TouchableOpacity>

          <View style={styles.chatHeaderCopy}>
            <Text style={styles.chatTitle} numberOfLines={1}>
              {currentConversation.title || getDefaultConversationTitle()}
            </Text>
            <Text style={styles.chatSubtitle}>
              Offline conversation history for the main chat experience
            </Text>
          </View>
        </View>

        {currentConversation.messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MessageCircle size={44} color={colors.accentCyan} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>Start a Conversation</Text>
            <Text style={styles.emptySubtitle}>
              Ask anything. This screen is for plain chatting only, and your chat history stays on this device.
            </Text>
            <PrivacyBadge label="Chat" />
            <View style={styles.suggestionsContainer}>
              {renderSuggestionChip('Tell me a joke')}
              {renderSuggestionChip('What is AI?')}
              {renderSuggestionChip('Write a haiku about coding')}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={currentConversation.messages}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            renderItem={({ item }) => (
              <ChatMessageBubble
                message={item}
                onPress={item.role === 'assistant' ? () => handleCopyAssistantMessage(item) : undefined}
                onLongPress={item.role === 'assistant' ? () => handleAssistantLongPress(item) : undefined}
              />
            )}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              isGenerating ? (
                <View style={styles.pendingContainer}>
                  <ChatMessageBubble
                    message={{
                      role: 'assistant',
                      content: buildAssistantMarkup(currentResponse || '...'),
                      timestamp: new Date().toISOString(),
                    }}
                    isStreaming
                  />
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.accentCyan} />
                    <Text style={styles.loadingInlineText}>Generating response...</Text>
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {isGenerating && isScrolledUp ? (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              setIsScrolledUp(false);
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
          >
            <LinearGradient
              colors={[colors.btnActiveStart, colors.btnActiveEnd]}
              style={styles.fabGradient}
            >
              <ArrowDown size={22} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        ) : null}

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => {
                handleSendText().catch(() => {});
              }}
              editable={!isGenerating}
              multiline
            />

            {isGenerating ? (
              <TouchableOpacity onPress={handleStop} style={styles.stopButton}>
                <View style={styles.stopIcon}>
                  <Square size={18} color={colors.error} strokeWidth={3} fill={colors.error} />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  handleSendText().catch(() => {});
                }}
                disabled={!inputText.trim()}
              >
                <LinearGradient
                  colors={[colors.btnActiveStart, colors.btnActiveEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                >
                  <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {isSidebarOpen ? (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={styles.drawerOverlay}
        >
          <Pressable style={styles.drawerBackdrop} onPress={() => setIsSidebarOpen(false)} />

          <Animated.View
            entering={SlideInLeft.duration(220)}
            exiting={SlideOutLeft.duration(180)}
            style={[styles.drawer, { width: drawerWidth, paddingTop: insets.top + 12 }]}
          >
            <View style={styles.drawerHeader}>
              <View style={styles.drawerHeaderCopy}>
                <Text style={styles.drawerTitle}>Conversations</Text>
                <Text style={styles.drawerSubtitle}>Saved locally on this device</Text>
              </View>

              <TouchableOpacity
                style={styles.drawerCloseButton}
                onPress={() => setIsSidebarOpen(false)}
              >
                <X size={18} color={colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.newChatButton}
              onPress={() => {
                handleCreateConversation().catch(() => {});
              }}
              disabled={isGenerating}
            >
              <Plus size={18} color={colors.textPrimary} strokeWidth={2.5} />
              <Text style={styles.newChatText}>New Chat</Text>
            </TouchableOpacity>

            <FlatList
              data={historyConversations}
              keyExtractor={item => item.conversation_id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sidebarList}
              renderItem={({ item }) => {
                const lastMessage = item.messages[item.messages.length - 1];
                const preview = lastMessage
                  ? getConversationPreviewText(lastMessage.content)
                  : 'No messages yet';
                const timestamp = formatConversationTimestamp(getConversationActivityTimestamp(item));
                const isActive = item.conversation_id === currentConversation.conversation_id;

                return (
                  <TouchableOpacity
                    style={[styles.conversationCard, isActive && styles.conversationCardActive]}
                    onPress={() => {
                      handleSelectConversation(item.conversation_id).catch(() => {});
                    }}
                    onLongPress={() => confirmDeleteConversation(item)}
                    disabled={isGenerating}
                  >
                    <View style={styles.conversationMetaRow}>
                      <Text style={styles.conversationTitle} numberOfLines={1}>
                        {item.title || getDefaultConversationTitle()}
                      </Text>
                      <Text style={styles.conversationTimestamp}>{timestamp}</Text>
                    </View>
                    <Text style={styles.conversationPreview} numberOfLines={2}>
                      {preview}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.drawerEmptyState}>
                  <Text style={styles.drawerEmptyTitle}>No saved chats yet</Text>
                  <Text style={styles.drawerEmptyText}>
                    Chats appear here after you send the first message.
                  </Text>
                </View>
              }
            />
          </Animated.View>
        </Animated.View>
      ) : null}

      {toastText ? (
        <Animated.View entering={FadeInUp} exiting={FadeOutDown} style={styles.toast}>
          <Copy size={14} color={colors.textPrimary} strokeWidth={2.3} />
          <Text style={styles.toastText}>{toastText}</Text>
        </Animated.View>
      ) : null}
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: AppColorsType, width: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primaryDark,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: colors.primaryDark,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    chatPane: {
      flex: 1,
      position: 'relative',
    },
    chatHeader: {
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.textMuted + '18',
      backgroundColor: colors.primaryDark,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sidebarToggle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.textMuted + '22',
      justifyContent: 'center',
      alignItems: 'center',
    },
    chatHeaderCopy: {
      flex: 1,
      gap: 4,
    },
    chatTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    chatSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    messageList: {
      paddingTop: 12,
      paddingBottom: 16,
    },
    pendingContainer: {
      paddingBottom: 4,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingTop: 2,
    },
    loadingInlineText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 28,
      paddingBottom: 90,
    },
    emptyIconContainer: {
      width: 92,
      height: 92,
      borderRadius: 28,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.textMuted + '22',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 22,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 10,
    },
    emptySubtitle: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 28,
      maxWidth: 420,
    },
    suggestionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginTop: 18,
    },
    suggestionChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: colors.surfaceCard,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.textMuted + '26',
    },
    suggestionText: {
      fontSize: 12,
      color: colors.textPrimary,
    },
    inputContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 100,
      backgroundColor: colors.surfaceCard + 'DD',
      borderTopWidth: 1,
      borderTopColor: colors.textMuted + '1A',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    input: {
      flex: 1,
      backgroundColor: colors.primaryMid,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      maxHeight: 110,
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.45,
    },
    stopButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.error + '22',
      justifyContent: 'center',
      alignItems: 'center',
    },
    stopIcon: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fab: {
      position: 'absolute',
      right: 22,
      bottom: 184,
      width: 46,
      height: 46,
      borderRadius: 23,
      overflow: 'hidden',
    },
    fabGradient: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toast: {
      position: 'absolute',
      bottom: 118,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.textMuted + '28',
      paddingHorizontal: 16,
      paddingVertical: 10,
      zIndex: 30,
    },
    toastText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    drawerOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 20,
    },
    drawerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#00000066',
    },
    drawer: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: colors.surfaceCard,
      borderRightWidth: 1,
      borderRightColor: colors.textMuted + '22',
      paddingHorizontal: 14,
      paddingBottom: 24,
      gap: 12,
      shadowColor: '#000000',
      shadowOpacity: 0.24,
      shadowRadius: 18,
      shadowOffset: { width: 8, height: 0 },
      elevation: 16,
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    drawerHeaderCopy: {
      flex: 1,
      gap: 4,
    },
    drawerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    drawerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    drawerCloseButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primaryMid,
      borderWidth: 1,
      borderColor: colors.textMuted + '22',
    },
    newChatButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 16,
      backgroundColor: colors.primaryMid,
      borderWidth: 1,
      borderColor: colors.textMuted + '33',
      paddingVertical: 14,
      paddingHorizontal: 12,
    },
    newChatText: {
      fontSize: width >= 680 ? 14 : 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    sidebarList: {
      gap: 8,
      paddingBottom: 140,
    },
    conversationCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.textMuted + '18',
      backgroundColor: colors.primaryMid,
      padding: width >= 680 ? 12 : 10,
      gap: 6,
    },
    conversationCardActive: {
      borderColor: colors.accentCyan + '55',
      backgroundColor: colors.primaryDark,
    },
    conversationMetaRow: {
      gap: 4,
    },
    conversationTitle: {
      fontSize: width >= 680 ? 13 : 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    conversationTimestamp: {
      fontSize: 10,
      color: colors.textMuted,
    },
    conversationPreview: {
      fontSize: width >= 680 ? 12 : 11,
      lineHeight: width >= 680 ? 18 : 16,
      color: colors.textSecondary,
    },
    drawerEmptyState: {
      paddingHorizontal: 8,
      paddingVertical: 16,
      gap: 6,
    },
    drawerEmptyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    drawerEmptyText: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
  });
