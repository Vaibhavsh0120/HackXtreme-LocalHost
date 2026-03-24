import RNFS from 'react-native-fs';
import type {
  ConversationMessage,
  ConversationRecord,
  ConversationRole,
  ConversationStoreState,
} from '../types/chat';

const CONVERSATION_STORE_FILE = `${RNFS.DocumentDirectoryPath}/llm_chat_conversations.json`;
const DEFAULT_CONVERSATION_TITLE = 'New Chat';
let conversationHistoryRevision = 0;

const isPersistableConversation = (conversation: ConversationRecord) =>
  conversation.messages.length > 0;

const toPersistedConversations = (conversations: ConversationRecord[]) =>
  sortConversations(conversations.filter(isPersistableConversation));

const isConversationRole = (value: unknown): value is ConversationRole =>
  value === 'user' || value === 'assistant';

const sanitizeMessage = (message: unknown): ConversationMessage | null => {
  if (!message || typeof message !== 'object') {
    return null;
  }

  const candidate = message as Record<string, unknown>;
  if (!isConversationRole(candidate.role) || typeof candidate.content !== 'string' || typeof candidate.timestamp !== 'string') {
    return null;
  }

  return {
    role: candidate.role,
    content: candidate.content,
    timestamp: candidate.timestamp,
    tokensPerSecond: typeof candidate.tokensPerSecond === 'number' ? candidate.tokensPerSecond : undefined,
    totalTokens: typeof candidate.totalTokens === 'number' ? candidate.totalTokens : undefined,
    isError: typeof candidate.isError === 'boolean' ? candidate.isError : undefined,
    wasCancelled: typeof candidate.wasCancelled === 'boolean' ? candidate.wasCancelled : undefined,
  };
};

const sanitizeConversation = (conversation: unknown): ConversationRecord | null => {
  if (!conversation || typeof conversation !== 'object') {
    return null;
  }

  const candidate = conversation as Record<string, unknown>;
  if (
    typeof candidate.conversation_id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.created_at !== 'string' ||
    !Array.isArray(candidate.messages)
  ) {
    return null;
  }

  const messages = candidate.messages
    .map(sanitizeMessage)
    .filter((message): message is ConversationMessage => message !== null);

  return {
    conversation_id: candidate.conversation_id,
    title: candidate.title,
    created_at: candidate.created_at,
    messages,
  };
};

const sortConversations = (conversations: ConversationRecord[]) =>
  [...conversations].sort((left, right) => {
    const leftTimestamp = left.messages[left.messages.length - 1]?.timestamp ?? left.created_at;
    const rightTimestamp = right.messages[right.messages.length - 1]?.timestamp ?? right.created_at;
    return new Date(rightTimestamp).getTime() - new Date(leftTimestamp).getTime();
  });

export const buildConversationTitle = (prompt: string) => {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return DEFAULT_CONVERSATION_TITLE;
  }

  return normalized.length > 36 ? `${normalized.slice(0, 36).trimEnd()}...` : normalized;
};

export const createConversation = (): ConversationRecord => ({
  conversation_id: `conversation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  title: DEFAULT_CONVERSATION_TITLE,
  created_at: new Date().toISOString(),
  messages: [],
});

export const createConversationMessage = (
  role: ConversationRole,
  content: string,
  extras: Omit<ConversationMessage, 'role' | 'content' | 'timestamp'> = {},
): ConversationMessage => ({
  role,
  content,
  timestamp: new Date().toISOString(),
  ...extras,
});

export const getConversationActivityTimestamp = (conversation: ConversationRecord) =>
  conversation.messages[conversation.messages.length - 1]?.timestamp ?? conversation.created_at;

export const appendMessageToConversation = (
  conversations: ConversationRecord[],
  conversationId: string,
  message: ConversationMessage,
): ConversationRecord[] =>
  sortConversations(
    conversations.map(conversation => {
      if (conversation.conversation_id !== conversationId) {
        return conversation;
      }

      const isFirstUserMessage = conversation.messages.length === 0 && message.role === 'user';

      return {
        ...conversation,
        title: isFirstUserMessage ? buildConversationTitle(message.content) : conversation.title,
        messages: [...conversation.messages, message],
      };
    }),
  );

export const deleteConversationById = (
  conversations: ConversationRecord[],
  conversationId: string,
) => conversations.filter(conversation => conversation.conversation_id !== conversationId);

export const loadConversationStore = async (): Promise<ConversationStoreState> => {
  try {
    const freshConversation = createConversation();
    const exists = await RNFS.exists(CONVERSATION_STORE_FILE);

    if (!exists) {
      return {
        currentConversationId: freshConversation.conversation_id,
        conversations: [freshConversation],
      };
    }

    const raw = await RNFS.readFile(CONVERSATION_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as {
      conversations?: unknown;
    };

    const persistedConversations = Array.isArray(parsed.conversations)
      ? toPersistedConversations(
          parsed.conversations
            .map(sanitizeConversation)
            .filter((conversation): conversation is ConversationRecord => conversation !== null),
        )
      : [];

    return {
      currentConversationId: freshConversation.conversation_id,
      conversations: [freshConversation, ...persistedConversations],
    };
  } catch (error) {
    console.error('Failed to load chat conversations:', error);
    const conversation = createConversation();
    return {
      currentConversationId: conversation.conversation_id,
      conversations: [conversation],
    };
  }
};

export const saveConversationStore = async (state: ConversationStoreState) => {
  try {
    const persistedConversations = toPersistedConversations(state.conversations);

    if (persistedConversations.length === 0) {
      const exists = await RNFS.exists(CONVERSATION_STORE_FILE);
      if (exists) {
        await RNFS.unlink(CONVERSATION_STORE_FILE);
      }
      return;
    }

    await RNFS.writeFile(
      CONVERSATION_STORE_FILE,
      JSON.stringify({ conversations: persistedConversations }),
      'utf8',
    );
  } catch (error) {
    console.error('Failed to persist chat conversations:', error);
  }
};

export const clearConversationHistory = async () => {
  try {
    const exists = await RNFS.exists(CONVERSATION_STORE_FILE);
    if (exists) {
      await RNFS.unlink(CONVERSATION_STORE_FILE);
    }
    conversationHistoryRevision += 1;
  } catch (error) {
    console.error('Failed to clear chat conversations:', error);
  }
};

export const getConversationHistoryRevision = () => conversationHistoryRevision;

export const getDefaultConversationTitle = () => DEFAULT_CONVERSATION_TITLE;
