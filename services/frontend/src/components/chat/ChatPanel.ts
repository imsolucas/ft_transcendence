// components/chat/ChatPanel.ts
import { t } from '../../i18n';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

export interface ChatMessage {
  id: number;
  username: string;
  avatar?: string;
  message: string;
  timestamp: string;
  isOwnMessage?: boolean;
}

interface ChatPanelOptions {
  title?: string;
  className?: string;
  onSendMessage?: (message: string) => void;
  messages?: ChatMessage[];
  collapsed?: boolean;
}

export function ChatPanel({
  title = 'Chat',
  className = '',
  onSendMessage,
  messages = [],
  collapsed = false,
}: ChatPanelOptions): HTMLElement {
  const container = document.createElement('div');
  container.className = `chat-panel ${className}`;
  
  const card = Card({
    className: 'flex flex-col h-full max-h-[500px]',
    children: '',
  });

  // Header
  const header = CardHeader({
    children: '',
  });

  const headerRow = document.createElement('div');
  headerRow.className = 'flex items-center justify-between';

  const titleEl = CardTitle({
    text: title,
    className: 'text-lg',
  });
  headerRow.appendChild(titleEl);

  // Collapse button
  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'text-gray-400 hover:text-white transition-colors';
  collapseBtn.innerHTML = collapsed ? '▲' : '▼';
  collapseBtn.addEventListener('click', () => {
    const chatContent = card.querySelector('.chat-content') as HTMLElement;
    const chatForm = card.querySelector('.chat-form') as HTMLElement;
    
    if (chatContent && chatForm) {
      const isCollapsed = chatContent.classList.contains('hidden');
      chatContent.classList.toggle('hidden');
      chatForm.classList.toggle('hidden');
      collapseBtn.innerHTML = isCollapsed ? '▼' : '▲';
    }
  });
  headerRow.appendChild(collapseBtn);

  header.appendChild(headerRow);
  card.appendChild(header);

  // Messages container
  const contentEl = CardContent({
    children: '',
    className: `chat-content flex-1 overflow-y-auto ${collapsed ? 'hidden' : ''}`,
  });
  contentEl.style.minHeight = '300px';
  contentEl.style.maxHeight = '350px';

  const messagesContainer = document.createElement('div');
  messagesContainer.id = 'chat-messages';
  messagesContainer.className = 'space-y-3';

  if (messages.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'text-center text-gray-400 text-sm py-8';
    emptyMsg.textContent = t('chat.noMessages') || 'No messages yet. Start the conversation!';
    messagesContainer.appendChild(emptyMsg);
  } else {
    messages.forEach(msg => {
      const messageEl = createMessageElement(msg);
      messagesContainer.appendChild(messageEl);
    });
  }

  contentEl.appendChild(messagesContainer);
  card.appendChild(contentEl);

  // Input form
  const formContainer = document.createElement('div');
  formContainer.className = `chat-form border-t border-gray-700 pt-4 ${collapsed ? 'hidden' : ''}`;

  const form = document.createElement('form');
  form.className = 'flex gap-2';

  const messageInput = Input({
    id: 'chat-message-input',
    placeholder: t('chat.typeMessage') || 'Type a message...',
    className: 'flex-1',
  });

  const sendBtn = Button({
    text: t('chat.send') || 'Send',
    variant: 'default',
    size: 'default',
  });

  form.appendChild(messageInput);
  form.appendChild(sendBtn);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = messageInput as HTMLInputElement;
    const message = input.value.trim();
    
    if (message && onSendMessage) {
      onSendMessage(message);
      input.value = '';
      
      // Add message to UI (optimistic update)
      const newMessage: ChatMessage = {
        id: Date.now(),
        username: 'You',
        message,
        timestamp: new Date().toLocaleTimeString(),
        isOwnMessage: true,
      };
      
      addMessageToChat(messagesContainer, newMessage);
    }
  });

  formContainer.appendChild(form);
  card.appendChild(formContainer);

  container.appendChild(card);

  return container;
}

function createMessageElement(message: ChatMessage): HTMLElement {
  const messageDiv = document.createElement('div');
  messageDiv.className = `flex gap-3 ${message.isOwnMessage ? 'flex-row-reverse' : ''}`;

  const avatar = Avatar({
    src: message.avatar,
    alt: message.username,
    fallback: message.username[0],
    size: 'sm',
  });
  messageDiv.appendChild(avatar);

  const contentDiv = document.createElement('div');
  contentDiv.className = `flex-1 ${message.isOwnMessage ? 'text-right' : ''}`;

  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex items-center gap-2 mb-1';

  const username = document.createElement('span');
  username.className = 'text-sm font-semibold text-white';
  username.textContent = message.username;

  const timestamp = document.createElement('span');
  timestamp.className = 'text-xs text-gray-400';
  timestamp.textContent = message.timestamp;

  if (message.isOwnMessage) {
    headerDiv.appendChild(timestamp);
    headerDiv.appendChild(username);
    headerDiv.className += ' justify-end';
  } else {
    headerDiv.appendChild(username);
    headerDiv.appendChild(timestamp);
  }

  const messageText = document.createElement('div');
  messageText.className = `text-sm p-3 rounded-lg ${
    message.isOwnMessage 
      ? 'bg-blue-600 text-white ml-auto inline-block' 
      : 'bg-gray-700 text-gray-200'
  }`;
  messageText.style.maxWidth = '80%';
  messageText.textContent = message.message;

  contentDiv.appendChild(headerDiv);
  contentDiv.appendChild(messageText);

  messageDiv.appendChild(contentDiv);

  return messageDiv;
}

function addMessageToChat(container: HTMLElement, message: ChatMessage): void {
  // Remove "no messages" placeholder if it exists
  const emptyMsg = container.querySelector('.text-center.text-gray-400');
  if (emptyMsg) {
    emptyMsg.remove();
  }

  const messageEl = createMessageElement(message);
  container.appendChild(messageEl);

  // Auto-scroll to bottom
  container.parentElement?.scrollTo({
    top: container.parentElement.scrollHeight,
    behavior: 'smooth',
  });
}

// Lobby/Game integration helper
export function createChatSidebar(options: ChatPanelOptions): HTMLElement {
  const sidebar = document.createElement('div');
  sidebar.className = 'fixed right-4 bottom-4 w-96 z-40';
  
  const chatPanel = ChatPanel({
    ...options,
    className: 'shadow-2xl',
  });
  
  sidebar.appendChild(chatPanel);
  
  return sidebar;
}

// Mock WebSocket chat for demo
export function setupMockChat(chatContainer: HTMLElement): void {
  let messageCount = 0;
  
  const mockMessages = [
    "Good luck everyone!",
    "Let's have a great game",
    "Ready when you are",
    "This is exciting!",
  ];
  
  // Simulate receiving messages every 10 seconds
  const interval = setInterval(() => {
    if (messageCount >= mockMessages.length) {
      clearInterval(interval);
      return;
    }
    
    const messagesContainer = chatContainer.querySelector('#chat-messages');
    if (messagesContainer) {
      const mockMessage: ChatMessage = {
        id: Date.now(),
        username: `Player${Math.floor(Math.random() * 3) + 1}`,
        message: mockMessages[messageCount],
        timestamp: new Date().toLocaleTimeString(),
        isOwnMessage: false,
      };
      
      addMessageToChat(messagesContainer, mockMessage);
      messageCount++;
    }
  }, 10000);
}

