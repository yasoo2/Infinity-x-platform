  import React, { useState, useEffect, useCallback, useRef } from 'react';
  import PropTypes from 'prop-types';
  import { Plus, Trash2, MessageSquare, Loader2, ChevronLeft, ChevronRight, History } from 'lucide-react'; // أيقونات Lucide
  import { getChatSessions, deleteChatSession, getGuestToken, withAbort } from '../api/system';
  import apiClient from '../api/client';

  // API base غير مستخدم بعد التحويل إلى دوال system.js

  export default function ChatSidebar({
    userId,
    currentConversationId,
    onSelectConversation,
    onNewConversation,
    onCollapse // الآن يتم استخدامها
  }) {
    const [conversations, setConversations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false); // حالة داخلية للطي
    const lastAbortRef = useRef(null);

    // دالة لتبديل حالة الطي
    const toggleCollapse = () => {
      setIsCollapsed(prev => !prev);
      if (onCollapse) {
        onCollapse(!isCollapsed); // إبلاغ المكون الأب بحالة الطي الجديدة
      }
    };

    useEffect(() => {
      const ensureTokenAndLoad = async () => {
        try {
          const existing = localStorage.getItem('sessionToken');
          if (!existing) {
            const tok = await getGuestToken();
            if (tok?.token) localStorage.setItem('sessionToken', tok.token);
          }
        } catch { /* ignore */ }
        try {
          const { data } = await apiClient.get('/api/v1/health', { timeout: 3000 });
          if (data) await loadConversations();
        } catch { /* ignore */ }
      };
      if (userId) {
        ensureTokenAndLoad();
      }
    }, [userId, loadConversations]);

    const loadConversations = useCallback(async () => {
      if (lastAbortRef.current) {
        try { lastAbortRef.current.abort(); } catch { /* ignore */ }
      }
      const { controller, signal } = withAbort();
      lastAbortRef.current = controller;
      setIsLoading(true);
      try {
        const data = await getChatSessions({ signal });
        if (data?.success) {
          // توحيد البنية للاستخدام الحالي
          const sessions = (data.sessions || []).map((s) => ({
            _id: s._id || s.id || s.sessionId,
            title: s.title || s.name || 'محادثة بدون عنوان',
            updatedAt: s.updatedAt || s.lastUpdated || new Date().toISOString(),
            messages: s.messages || s.interactions || [],
          }));
          setConversations(sessions);
        }
      } catch (error) {
        if (error?.code === 'ERR_CANCELED' || /canceled|abort(ed)?/i.test(String(error?.message || ''))) {
          return undefined;
        }
        console.warn('Load conversations error:', error);
        // يمكن إضافة إشعار للمستخدم هنا
      } finally {
        setIsLoading(false);
      }
      return undefined;
    }, []);

    useEffect(() => {
      return () => {
        try { lastAbortRef.current?.abort(); } catch { /* ignore */ }
      };
    }, []);

    const handleDelete = async (conversationId, e) => {
      e.stopPropagation(); // منع تحديد المحادثة عند النقر على زر الحذف

      if (!confirm('هل أنت متأكد أنك تريد حذف هذه المحادثة؟')) return;

      try {
        const { signal } = withAbort();
        const resp = await deleteChatSession(conversationId, { signal });
        if (resp?.success) {
          setConversations(prev => prev.filter(c => c._id !== conversationId));
          if (currentConversationId === conversationId) onNewConversation();
        }
      } catch (error) {
        console.warn('Delete conversation error:', error);
        // يمكن إضافة إشعار للمستخدم هنا
      }
    };

    const formatDate = (dateString) => {
      const d = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - d.getTime(); // الفرق بالمللي ثانية

      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const weeks = Math.floor(days / 7);
      const months = Math.floor(days / 30);
      const years = Math.floor(days / 365);

      if (seconds < 60) return 'الآن';
      if (minutes < 60) return `منذ ${minutes} دقيقة`;
      if (hours < 24) return `منذ ${hours} ساعة`;
      if (days < 7) return `منذ ${days} يوم`;
      if (weeks < 4) return `منذ ${weeks} أسبوع`;
      if (months < 12) return `منذ ${months} شهر`;
      return `منذ ${years} سنة`;
    };

    if (isCollapsed) {
      return (
        <div className="
          w-12 h-screen bg-gray-900 border-r border-gray-700
          flex flex-col items-center justify-center
          transition-all duration-300 ease-in-out
        ">
          <button
            onClick={toggleCollapse}
            className="
              p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white
              transition-colors duration-200
            "
            title="توسيع الشريط الجانبي"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      );
    }

    return (
      <div className="
        w-80 h-screen bg-gray-900 border-r border-gray-700
        flex flex-col flex-shrink-0
        transition-all duration-300 ease-in-out
      ">
        {/* Header */}
        <div className="
          p-4 border-b border-gray-700
          flex items-center justify-between
          text-white
        ">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <History size={20} />
            سجل المحادثات
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewConversation}
              className="
                p-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white
                flex items-center justify-center
                transition-colors duration-200
              "
              title="محادثة جديدة"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={toggleCollapse}
              className="
                p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white
                transition-colors duration-200
              "
              title="طي الشريط الجانبي"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
          {isLoading ? (
            <div className="p-4 text-center text-gray-400">
              <Loader2 className="animate-spin mx-auto text-teal-500 mb-3" size={32} />
              <p className="text-lg">جاري تحميل المحادثات...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <MessageSquare className="mx-auto text-gray-500 mb-3" size={48} />
              <p className="text-lg mb-4">لا توجد محادثات سابقة.</p>
              <button
                onClick={onNewConversation}
                className="
                  text-teal-400 hover:text-teal-300 underline
                  flex items-center gap-1 mx-auto
                "
              >
                <Plus size={16} /> ابدأ محادثة جديدة
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv._id}
                  onClick={() => onSelectConversation(conv._id)}
                  className={`
                    group p-3 rounded-lg cursor-pointer transition-all duration-200
                    flex items-center justify-between gap-3
                    ${currentConversationId === conv._id
                      ? 'bg-teal-700/30 border border-teal-600 text-white shadow-md'
                      : 'hover:bg-gray-800 border border-transparent text-gray-200'
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate mb-1">
                      {conv.title || 'محادثة بدون عنوان'} {/* تم تغيير "محادثة جديدة" إلى "محادثة بدون عنوان" */}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{formatDate(conv.updatedAt)}</span>
                      <span>•</span>
                      <span>{conv.messages?.length || 0} رسالة</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(conv._id, e)}
                    className="
                      opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400
                      transition-all duration-200 p-1 rounded-full hover:bg-gray-700
                    "
                    title="حذف المحادثة"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="
          p-3 border-t border-gray-700
          text-xs text-gray-500 text-center
        ">
          عرض {conversations.length} محادثة
        </div>
      </div>
    );
  }

  ChatSidebar.propTypes = {
    userId: PropTypes.string,
    currentConversationId: PropTypes.string,
    onSelectConversation: PropTypes.func.isRequired,
    onNewConversation: PropTypes.func.isRequired,
    onCollapse: PropTypes.func,
  };
