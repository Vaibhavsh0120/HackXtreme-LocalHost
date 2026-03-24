export type ConversationRole = 'user' | 'assistant';

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
  timestamp: string;
  tokensPerSecond?: number;
  totalTokens?: number;
  isError?: boolean;
  wasCancelled?: boolean;
}

export interface ConversationRecord {
  conversation_id: string;
  title: string;
  created_at: string;
  messages: ConversationMessage[];
}

export interface ConversationStoreState {
  currentConversationId: string;
  conversations: ConversationRecord[];
}
