import { createContext, useContext, useState, useCallback } from "react";
import { SessionContext } from "../session/SessionContext.jsx";

export const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user, login } = useContext(SessionContext) || {};
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const openChat = useCallback(() => {
    if (!user) {
      setIsLoginPromptOpen(true);
    } else {
      setIsChatOpen(true);
    }
  }, [user]);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const openLoginPrompt = useCallback(() => {
    setIsLoginPromptOpen(true);
  }, []);

  const closeLoginPrompt = useCallback(() => {
    setIsLoginPromptOpen(false);
  }, []);

  const goToLogin = useCallback(() => {
    setIsLoginPromptOpen(false);
    setIsLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
  }, []);

  const handleLoginSuccess = useCallback(
    (userData) => {
      if (login) {
        login(userData);
      }
      setIsLoginModalOpen(false);
      setIsChatOpen(true);
    },
    [login],
  );

  return (
    <ChatContext.Provider
      value={{
        isChatOpen,
        setIsChatOpen,
        isLoginPromptOpen,
        isLoginModalOpen,
        openChat,
        closeChat,
        openLoginPrompt,
        closeLoginPrompt,
        goToLogin,
        closeLoginModal,
        handleLoginSuccess,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

const defaultChatContext = {
  isChatOpen: false,
  setIsChatOpen: () => {},
  isLoginPromptOpen: false,
  isLoginModalOpen: false,
  openChat: () => {},
  closeChat: () => {},
  openLoginPrompt: () => {},
  closeLoginPrompt: () => {},
  goToLogin: () => {},
  closeLoginModal: () => {},
  handleLoginSuccess: () => {},
};

export function useChat() {
  const context = useContext(ChatContext);
  return context || defaultChatContext;
}

