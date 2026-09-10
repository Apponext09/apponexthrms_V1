import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: number;
  sender: 'ai' | 'user';
  text: string;
  prefill?: {
    startDate: string;
    endDate: string;
    leaveTypeCode: string;
    reason: string;
    submitted?: boolean;
  };
}

interface AiChatState {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: number, updates: Partial<ChatMessage>) => void;
  clearChat: () => void;
}

export const useAiChatStore = create<AiChatState>()(
  persist(
    (set) => ({
      messages: [
        { id: 1, sender: 'ai', text: 'Hello! I am your AI HR Assistant. You can ask me any queries regarding company leave policies, and I can also parse your sentences to apply for leave! Try saying: "Apply sick leave tomorrow".' },
      ],
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      updateMessage: (id, updates) => set((state) => ({
        messages: state.messages.map(m => m.id === id ? { ...m, ...updates } : m)
      })),
      clearChat: () => set({ messages: [
        { id: 1, sender: 'ai', text: 'Hello! I am your AI HR Assistant. You can ask me any queries regarding company leave policies, and I can also parse your sentences to apply for leave! Try saying: "Apply sick leave tomorrow".' },
      ] }),
    }),
    {
      name: 'ai-chat-storage',
    }
  )
);
