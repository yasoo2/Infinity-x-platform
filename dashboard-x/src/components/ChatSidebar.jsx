import { useState, useEffect } from 'react';
import apiClient from '../api/client';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.xelitesolutions.com';

export default function ChatSidebar({ 
  userId, 
  currentConversationId, 
  onSelectConversation,
  onNewConversation 
}) {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (userId) {
      loadConversations();
    }
  }, [userId]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.post(`${API_BASE}/api/chat-history/list`, {
        userId
      });

      if (response.data.ok) {
        setConversations(response.data.conversations);
      }
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (conversationId, e) => {
    e.stopPropagation();
    
    if (!confirm('هل تريد حذف هذه المحادثة؟')) return;

    try {
      const response = await apiClient.post(`${API_BASE}/api/chat-history/delete`, {
        conversationId
      });

      if (response.data.ok) {
        setConversations(prev => prev.filter(c => c._id !== conversationId));
        if (currentConversationId === conversationId) {
          onNewConversation();
        }
      }
    } catch (error) {
      console.error('Delete conversation error:', error);
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'الآن';
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return d.toLocaleDateString('ar-SA');
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-cardDark border-l border-borderDim flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="text-textDim hover:text-white transition-colors"
          title="فتح الشريط الجانبي"
        >
          ☰
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-cardDark border-l border-borderDim flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-borderDim flex items-center justify-between">
        <h2 className="text-lg font-bold">المحادثات</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewConversation}
            className="bg-primary hover:bg-primary/80 text-white px-3 py-1 rounded-lg text-sm transition-all duration-200"
            title="محادثة جديدة"
          >
            + جديد
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-textDim hover:text-white transition-colors"
            title="إخفاء الشريط الجانبي"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-textDim">
            <div className="text-2xl mb-2">🔄</div>
            <p>جاري التحميل...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-textDim">
            <div className="text-4xl mb-2">💬</div>
            <p>لا توجد محادثات بعد</p>
            <button
              onClick={onNewConversation}
              className="mt-4 text-primary hover:underline"
            >
              ابدأ محادثة جديدة
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv._id}
                onClick={() => onSelectConversation(conv._id)}
                className={`
                  group p-3 rounded-lg cursor-pointer transition-all duration-200
                  ${currentConversationId === conv._id
                    ? 'bg-primary/20 border border-primary/50'
                    : 'hover:bg-bgDark border border-transparent'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate mb-1">
                      {conv.title || 'محادثة جديدة'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-textDim">
                      <span>{formatDate(conv.updatedAt)}</span>
                      <span>•</span>
                      <span>{conv.messages?.length || 0} رسالة</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => handleDelete(conv._id, e)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-all duration-200 text-lg"
                    title="حذف"
                  >
                    🗑️
                  </button>
                </div>

                {conv.messages && conv.messages.length > 0 && (
                  <p className="text-xs text-textDim mt-2 truncate">
                    {conv.messages[conv.messages.length - 1]?.content?.substring(0, 50)}...
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-borderDim text-xs text-textDim text-center">
        {conversations.length} محادثة
      </div>
    </div>
  );
}
