import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

interface AIState {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
}

const initialGreeting: ChatMessage = {
  role: 'ai',
  text: "Hi! I'm the Olive Pizza AI. How can I help you choose a pizza today?"
};

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      isOpen: false,
      setIsOpen: (isOpen) => set({ isOpen }),
      messages: [initialGreeting],
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      clearMessages: () => set({ messages: [initialGreeting] }),
    }),
    {
      name: 'ai-chat-storage', // unique name
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage so it survives refresh but clears on tab close
      partialize: (state) => ({ messages: state.messages }), // Only persist messages, not isOpen
    }
  )
);
