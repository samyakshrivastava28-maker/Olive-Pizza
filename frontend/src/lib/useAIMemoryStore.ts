import { create } from 'zustand';

export interface AIMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  products?: any[];
  source?: string;
  timestamp: Date;
  liked?: boolean;
}

interface AIMemoryState {
  messages: AIMessage[];
  isListening: boolean;
  autoVoiceEnabled: boolean;
  addMessage: (msg: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  setMessages: (messages: AIMessage[]) => void;
  clearMemory: () => void;
  setListening: (listening: boolean) => void;
  setAutoVoiceEnabled: (enabled: boolean) => void;
}

const INITIAL_WELCOME_MESSAGE: AIMessage = {
  id: 'welcome-1',
  role: 'ai',
  text: `Hello! 🍕 I'm Olive AI, your artisan pizza concierge. How can I satisfy your cravings today?`,
  timestamp: new Date()
};

export const useAIMemoryStore = create<AIMemoryState>((set) => ({
  messages: [INITIAL_WELCOME_MESSAGE],
  isListening: false,
  autoVoiceEnabled: false,
  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...msg,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date(),
        },
      ],
    })),
  setMessages: (messages) => set({ messages }),
  clearMemory: () => set({ messages: [INITIAL_WELCOME_MESSAGE] }),
  setListening: (isListening) => set({ isListening }),
  setAutoVoiceEnabled: (autoVoiceEnabled) => set({ autoVoiceEnabled }),
}));
