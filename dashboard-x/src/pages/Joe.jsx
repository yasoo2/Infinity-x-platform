import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/joe/TopBar';
import UsersTable from '../components/UsersTable';
import CardStat from '../components/CardStat';
import { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from '../api/system';
import SidePanel from '../components/joe/SidePanel';
import MainConsole from '../components/joe/MainConsole';
import RightPanel from '../components/joe/RightPanel';
import BottomPanel from '../components/joe/BottomPanel';
import { JoeChatProvider, useJoeChatContext } from '../context/JoeChatContext';
import useAuth from '../hooks/useAuth';

const JoeContent = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'; } catch { return 'en'; }
  });
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [isStatusPanelOpen, setIsStatusPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isBorderSettingsOpen, setIsBorderSettingsOpen] = useState(false);
  const [panelStyles, setPanelStyles] = useState({ left: { color: '#1f2937', width: 1, radius: 0 }, right: { color: '#1f2937', width: 1, radius: 0 } });
  const [usersData, setUsersData] = useState({ users: [], stats: null });
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState({ email: '', phone: '', password: '', role: 'admin' });
  const CountryCodePicker = ({ onSelect }) => {
    const [open, setOpen] = useState(false);
    const ref = React.useRef(null);
    const codes = [
      { code: '+1', name: 'USA/Canada', flag: '🇺🇸' },
      { code: '+44', name: 'UK', flag: '🇬🇧' },
      { code: '+33', name: 'France', flag: '🇫🇷' },
      { code: '+49', name: 'Germany', flag: '🇩🇪' },
      { code: '+39', name: 'Italy', flag: '🇮🇹' },
      { code: '+34', name: 'Spain', flag: '🇪🇸' },
      { code: '+91', name: 'India', flag: '🇮🇳' },
      { code: '+971', name: 'UAE', flag: '🇦🇪' },
      { code: '+966', name: 'Saudi', flag: '🇸🇦' },
      { code: '+970', name: 'Palestine', flag: '🇵🇸' },
      { code: '+20', name: 'Egypt', flag: '🇪🇬' },
      { code: '+212', name: 'Morocco', flag: '🇲🇦' },
      { code: '+213', name: 'Algeria', flag: '🇩🇿' },
      { code: '+216', name: 'Tunisia', flag: '🇹🇳' },
      { code: '+218', name: 'Libya', flag: '🇱🇾' },
      { code: '+963', name: 'Syria', flag: '🇸🇾' },
      { code: '+962', name: 'Jordan', flag: '🇯🇴' },
      { code: '+973', name: 'Bahrain', flag: '🇧🇭' },
      { code: '+974', name: 'Qatar', flag: '🇶🇦' },
      { code: '+968', name: 'Oman', flag: '🇴🇲' },
      { code: '+965', name: 'Kuwait', flag: '🇰🇼' },
      { code: '+90', name: 'Turkey', flag: '🇹🇷' },
    ];

    React.useEffect(() => {
      const onDocClick = (e) => {
        if (!ref.current) return;
        if (open && !ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener('mousedown', onDocClick, true);
      return () => document.removeEventListener('mousedown', onDocClick, true);
    }, [open]);

    return (
      <div className="relative" ref={ref}>
        <button type="button" onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); setOpen((v)=>!v); }} className="px-2 py-2 bg-gray-800 text-white rounded text-xs flex items-center gap-1">
          <span>كود الدولة</span>
          <span className="opacity-70">📱</span>
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-56 max-h-56 overflow-auto bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
            {codes.map(({ code, name, flag })=> (
              <button key={code} type="button" onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); onSelect(code); setOpen(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800">
                <span className="text-lg">{flag}</span>
                <span className="flex-1">{name}</span>
                <span className="text-gray-400">{code}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
  const [leftWidth, setLeftWidth] = useState(288);
  const [rightWidth, setRightWidth] = useState(320);
  const [dragLeft, setDragLeft] = useState(false);
  const [dragRight, setDragRight] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const onLang = () => {
      try { setLang(localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'); } catch {}
    };
    window.addEventListener('joe:lang', onLang);
    return () => window.removeEventListener('joe:lang', onLang);
  }, []);

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    try { localStorage.setItem('lang', next); } catch {}
    setLang(next);
    try { window.dispatchEvent(new CustomEvent('joe:lang', { detail: { lang: next } })); } catch {}
  };

  useEffect(() => {
    if (isMobile) {
      setIsSidePanelOpen(false);
      setIsRightPanelOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('joePanelBorders');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.left && parsed?.right) setPanelStyles(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('joePanelBorders', JSON.stringify(panelStyles));
    } catch {}
  }, [panelStyles]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('joePanelWidths');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.left) setLeftWidth(parsed.left);
        if (parsed?.right) setRightWidth(parsed.right);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('joePanelWidths', JSON.stringify({ left: leftWidth, right: rightWidth }));
    } catch {}
  }, [leftWidth, rightWidth]);

  const {
    conversations: conversationsList,
    currentConversationId,
    handleConversationSelect,
    handleNewConversation,
    isProcessing,
    plan,
    wsLog,
    renameConversation,
    deleteConversation,
    pinToggle,
    duplicateConversation,
    clearMessages,
  } = useJoeChatContext();

  const robotRef = React.useRef(null);
  const pupilLeftRef = React.useRef(null);
  const pupilRightRef = React.useRef(null);
  const [robotActive, setRobotActive] = useState(false);
  useEffect(() => {
    const onMouseMove = (e) => {
      const el = robotRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const max = 4;
      const tx = Math.max(-max, Math.min(max, (dx / rect.width) * 16));
      const ty = Math.max(-max, Math.min(max, (dy / rect.height) * 16));
      if (pupilLeftRef.current) pupilLeftRef.current.style.transform = `translate(${tx}px, ${ty}px)`;
      if (pupilRightRef.current) pupilRightRef.current.style.transform = `translate(${tx}px, ${ty}px)`;
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  const toggleSidePanel = () => setIsSidePanelOpen(!isSidePanelOpen);
  const toggleRightPanel = () => setIsRightPanelOpen(!isRightPanelOpen);
  const toggleBottomPanel = () => setIsBottomPanelOpen(!isBottomPanelOpen);
  const toggleStatusPanel = () => {
    setIsRightPanelOpen(prev => {
      const next = !prev;
      setIsStatusPanelOpen(next);
      return next;
    });
  };
  const toggleBorderSettings = () => setIsBorderSettingsOpen(!isBorderSettingsOpen);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        setUsersError('');
        const data = await getAdminUsers();
        setUsersData({ users: data.users || [], stats: data.stats || null });
      } catch (e) {
        const msg = e.status === 403 ? 'الوصول ممنوع: يجب تسجيل الدخول كسوبر أدمن.' : (e.message || 'فشل تحميل المستخدمين');
        setUsersError(msg);
      } finally {
        setUsersLoading(false);
      }
    };
    if (isBorderSettingsOpen) {
      fetchUsers();
    }
  }, [isBorderSettingsOpen]);

  const handleCreateUser = async () => {
    try {
      setUsersLoading(true);
      await createAdminUser({
        email: newUser.email,
        phone: newUser.phone || undefined,
        password: newUser.password,
        role: newUser.role,
      });
      setNewUser({ email: '', phone: '', password: '', role: 'admin' });
      const data = await getAdminUsers();
      setUsersData({ users: data.users || [], stats: data.stats || null });
    } catch (e) {
      setUsersError(e.message || 'فشل إضافة المستخدم');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;
    try {
      setUsersLoading(true);
      const payload = { email: editUser.email, phone: editUser.phone, role: editUser.role };
      if (editUser.password) payload.password = editUser.password;
      await updateAdminUser(editUser._id, payload);
      setEditUser(null);
      const data = await getAdminUsers();
      setUsersData({ users: data.users || [], stats: data.stats || null });
    } catch (e) {
      setUsersError(e.message || 'فشل تعديل المستخدم');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      setUsersLoading(true);
      await deleteAdminUser(user._id);
      const data = await getAdminUsers();
      setUsersData({ users: data.users || [], stats: data.stats || null });
    } catch (e) {
      setUsersError(e.message || 'فشل حذف المستخدم');
    } finally {
      setUsersLoading(false);
    }
  };

  const leftStyle = { borderRight: `${panelStyles.left.width}px solid ${panelStyles.left.color}`, borderRadius: panelStyles.left.radius };
  const rightStyle = { borderLeft: `${panelStyles.right.width}px solid ${panelStyles.right.color}`, borderRadius: panelStyles.right.radius };
  const setStyle = (side, key, value) => {
    setPanelStyles(prev => ({ ...prev, [side]: { ...prev[side], [key]: value } }));
  };

  useEffect(() => {
    const onMove = (e) => {
      const min = 200;
      const max = 600;
      if (dragLeft) {
        const w = Math.max(min, Math.min(max, e.clientX));
        setLeftWidth(w);
      }
      if (dragRight) {
        const w = Math.max(min, Math.min(max, window.innerWidth - e.clientX));
        setRightWidth(w);
      }
    };
    const onUp = () => {
      setDragLeft(false);
      setDragRight(false);
    };
    if (dragLeft || dragRight) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [dragLeft, dragRight]);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      
        {/* Top Bar - Enhanced */}
      <TopBar 
        onToggleRight={toggleRightPanel}
        onToggleBottom={toggleBottomPanel}
        isRightOpen={isRightPanelOpen}
        isBottomOpen={isBottomPanelOpen}
        onToggleLeft={toggleSidePanel}
        isLeftOpen={isSidePanelOpen}
        onToggleStatus={toggleStatusPanel}
        isStatusOpen={isStatusPanelOpen}
        onToggleBorderSettings={toggleBorderSettings}
        isBorderSettingsOpen={isBorderSettingsOpen}
        isSuperAdmin={(user?.role === 'super_admin')}
      />
      {isBorderSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-5xl p-6 shadow-2xl">
            <button onClick={()=>setIsBorderSettingsOpen(false)} className="md:hidden absolute top-4 right-4 bg-gray-800 hover:bg-gray-700 text-white rounded p-2">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-xl font-bold">إدارة المستخدمين</h3>
              <div className="flex items-center gap-2">
                <button onClick={()=>navigate('/dashboard/users')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded">فتح صفحة المستخدمين</button>
                <button onClick={()=>navigate('/dashboard/super-admin')} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded">إدارة متقدمة</button>
                <button onClick={()=>setIsBorderSettingsOpen(false)} className="px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-700">إغلاق</button>
              </div>
            </div>
            {usersError && (
              <div className="mb-3 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{usersError}</div>
            )}
            {usersData.stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <CardStat title="Active Now" value={usersData.stats.totalActiveNow || 0} iconName="Activity" />
                <CardStat title="Super Admins" value={usersData.stats.totalSupers || 0} iconName="Users" />
                <CardStat title="Admins" value={usersData.stats.totalAdmins || 0} iconName="Users" />
                <CardStat title="Users" value={usersData.stats.totalUsers || 0} iconName="Users" />
              </div>
            )}
            {/* Current user info */}
            <div className="mb-6 p-4 border border-gray-700 rounded-lg bg-gray-800/40">
              <h4 className="font-semibold mb-3">المستخدم الحالي</h4>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="px-3 py-1 rounded bg-gray-700 text-white">{user?.email || 'غير معروف'}</span>
                <span className="px-3 py-1 rounded bg-gray-700 text-white">الدور: {user?.role || 'user'}</span>
                {(() => {
                  const me = usersData.users?.find(u => u.email && user?.email && u.email.toLowerCase() === user.email.toLowerCase());
                  return me ? (
                    <>
                      <span className="px-3 py-1 rounded bg-gray-700 text-white">الهاتف: {me.phone || 'N/A'}</span>
                      <span className="px-3 py-1 rounded bg-gray-700 text-white">آخر دخول: {me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString('ar') : '—'}</span>
                    </>
                  ) : null;
                })()}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-start">
              <div className="md:col-span-2">
                <UsersTable users={usersData.users} onEdit={setEditUser} onDelete={handleDeleteUser} />
              </div>
              <div className="md:col-span-1">
                <p className="text-sm text-gray-400 mb-3">إضافة مستخدم جديد</p>
                <div className="space-y-3">
                  {/* Country code picker + phone input */}
                  <div className="flex items-center gap-2">
                    <CountryCodePicker onSelect={(code) => setNewUser({...newUser, phone: `${code}${newUser.phone?.replace(/^\+?\d+/, '') || ''}`})} />
                    <input className="flex-1 px-3 py-2 bg-gray-800 text-white rounded" placeholder="Phone" value={newUser.phone} onChange={(e)=>setNewUser({...newUser, phone: e.target.value})} />
                  </div>
                  <input className="w-full px-3 py-2 bg-gray-800 text-white rounded" placeholder="Email" value={newUser.email} onChange={(e)=>setNewUser({...newUser, email: e.target.value})} />
                  <input className="w-full px-3 py-2 bg-gray-800 text-white rounded" placeholder="Password" type="password" value={newUser.password} onChange={(e)=>setNewUser({...newUser, password: e.target.value})} />
                  <select className="w-full px-3 py-2 bg-gray-800 text-white rounded" value={newUser.role} onChange={(e)=>setNewUser({...newUser, role: e.target.value})}>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="user">User</option>
                  </select>
                  <button disabled={usersLoading} onClick={handleCreateUser} className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow">{usersLoading ? 'جاري المعالجة...' : 'إضافة'}</button>
                </div>
              </div>
            </div>

            {/* Logged-in users only */}
            <div className="mt-2">
              <h4 className="font-semibold mb-3">المستخدمون الذين سجّلوا الدخول</h4>
              <UsersTable users={(usersData.users || []).filter(u => !!u.lastLoginAt)} />
            </div>

            {editUser && (
              <div className="mt-2 p-4 border border-gray-700 rounded-lg bg-gray-800/40">
                <p className="text-sm text-gray-400 mb-3">تعديل المستخدم</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="px-3 py-2 bg-gray-800 text-white rounded" placeholder="Email" value={editUser.email} onChange={(e)=>setEditUser({...editUser, email: e.target.value})} />
                  <div className="flex items-center gap-2">
                    <CountryCodePicker onSelect={(code) => setEditUser({...editUser, phone: `${code}${(editUser.phone||'').replace(/^\+?\d+/, '')}`})} />
                    <input className="flex-1 px-3 py-2 bg-gray-800 text-white rounded" placeholder="Phone" value={editUser.phone || ''} onChange={(e)=>setEditUser({...editUser, phone: e.target.value})} />
                  </div>
                  <select className="px-3 py-2 bg-gray-800 text-white rounded" value={editUser.role} onChange={(e)=>setEditUser({...editUser, role: e.target.value})}>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="user">User</option>
                  </select>
                  <input className="px-3 py-2 bg-gray-800 text-white rounded" placeholder="New Password (optional)" type="password" value={editUser.password || ''} onChange={(e)=>setEditUser({...editUser, password: e.target.value})} />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={()=>setEditUser(null)} className="px-4 py-2 bg-gray-800 text-white rounded">إلغاء</button>
                  <button disabled={usersLoading} onClick={handleUpdateUser} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">حفظ</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Removed ActivityBar to free space and use TopBar toggles */}
        {isSidePanelOpen && !isMobile && (
          <div className={`relative z-10 bg-gray-900 flex-shrink-0 ${panelStyles.left.width === 0 ? 'border-r border-gray-800' : ''}`} style={{ ...leftStyle, width: leftWidth }}>
            <SidePanel 
              conversations={conversationsList} 
              currentConversationId={currentConversationId}
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              onRenameConversation={renameConversation}
              onDeleteConversation={deleteConversation}
              onPinToggle={pinToggle}
              onDuplicate={duplicateConversation}
              onClear={clearMessages}
            />
            <div
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setDragLeft(true); }}
              className="absolute top-0 right-0 h-full cursor-col-resize z-20 select-none"
              style={{ width: '2px', background: 'rgba(107,114,128,0.5)' }}
            />
          </div>
        )}
        {isSidePanelOpen && isMobile && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsSidePanelOpen(false)}>
            <div className={`absolute left-0 top-14 bottom-0 w-[85%] max-w-xs bg-gray-900 ${panelStyles.left.width === 0 ? 'border-r border-gray-800' : ''}`} style={leftStyle} onClick={(e)=>e.stopPropagation()}>
              <SidePanel 
                conversations={conversationsList} 
                currentConversationId={currentConversationId}
                onConversationSelect={handleConversationSelect}
                onNewConversation={handleNewConversation}
                onRenameConversation={renameConversation}
                onDeleteConversation={deleteConversation}
                onPinToggle={pinToggle}
                onDuplicate={duplicateConversation}
                onClear={clearMessages}
              />
            </div>
          </div>
        )}
        {/* Main Console - Center (Flexible) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`flex-1 overflow-hidden ${isBottomPanelOpen ? '' : 'h-full'}`}>
            <MainConsole key={currentConversationId} />
          </div>

          {/* Bottom Panel - Logs (Collapsible) */}
          {isBottomPanelOpen && (
            <div className="h-48 border-t border-gray-800 bg-gray-900 flex-shrink-0">
              <BottomPanel logs={wsLog} />
            </div>
          )}
        </div>

        {/* Right Panel - Plan & Tools (Collapsible) */}
        {isRightPanelOpen && !isMobile && (
          <div className="relative z-10 bg-gray-900 flex-shrink-0" style={{ ...rightStyle, width: rightWidth }}>
            <RightPanel isProcessing={isProcessing} plan={plan} forceStatus={isStatusPanelOpen} />
            <div
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setDragRight(true); }}
              className="absolute top-0 left-0 h-full cursor-col-resize z-20 select-none"
              style={{ width: '2px', background: 'rgba(107,114,128,0.5)' }}
            />
          </div>
        )}
        {isRightPanelOpen && isMobile && (
          <div className="fixed inset-0 z-40" onClick={()=>setIsRightPanelOpen(false)}>
            <div className="absolute right-0 top-14 bottom-0 w-[85%] max-w-xs bg-gray-900" style={rightStyle} onClick={(e)=>e.stopPropagation()}>
              <RightPanel isProcessing={isProcessing} plan={plan} forceStatus={isStatusPanelOpen} />
            </div>
          </div>
        )}
      </div>
      <style>{`
        #joe-container { position: fixed; bottom: 30px; left: 30px; width: 120px; height: 140px; cursor: pointer; z-index: 1000; transition: transform 0.3s ease; }
        #joe-container:hover { transform: scale(1.1); }
        #joe-container .chat-bubble { position: absolute; bottom: 140px; left: 0; background: #fff; padding: 10px 15px; border-radius: 15px 15px 15px 0; box-shadow: 0 5px 15px rgba(0,0,0,0.1); font-size: 14px; color: #333; opacity: 0; transform: translateY(10px); transition: all 0.3s ease; pointer-events: none; width: 180px; text-align: center; }
        #joe-container:hover .chat-bubble, #joe-container.active .chat-bubble { opacity: 1; transform: translateY(0); }
        #joe-container svg { width: 100%; height: 100%; overflow: visible; }
        .floating-body { animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .eye-lids { animation: blink 4s infinite; transform-origin: center; }
        @keyframes blink { 0%, 96% { transform: scaleY(1); } 98% { transform: scaleY(0.1); } 100% { transform: scaleY(1); } }
        .arm-right { transform-origin: 15% 15%; animation: wave 3s ease-in-out infinite; }
        @keyframes wave { 0% { transform: rotate(0deg); } 50% { transform: rotate(-15deg); } 100% { transform: rotate(0deg); } }
        .thinking .pupil { fill: #00ff00; }
        .thinking .antenna-light { animation: pulse 0.5s infinite alternate; }
        @keyframes pulse { from { fill: #ff4d4d; opacity: 0.5; } to { fill: #ff0000; opacity: 1; } }
      `}</style>
      <div id="joe-container" ref={robotRef} onClick={()=>setRobotActive(v=>!v)} className={(robotActive || isProcessing) ? 'active' : ''}>
        <div className="chat-bubble">{lang === 'ar' ? 'مرحباً! أنا Joe المهندس. هل تحتاج مساعدة في الكود؟' : "Hello! I'm Joe the engineer. Need help with code?"}</div>
        <svg viewBox="0 0 200 240" className={(robotActive || isProcessing) ? 'thinking' : ''}>
          <g className="floating-body">
            <rect x="40" y="150" width="20" height="50" rx="10" fill="#BDC3C7"/>
            <g className="arm-right" transform="translate(140, 150)">
              <rect x="0" y="0" width="20" height="50" rx="10" fill="#BDC3C7"/>
            </g>
            <rect x="50" y="140" width="100" height="90" rx="20" fill="#F1C40F"/>
            <rect x="50" y="210" width="100" height="20" rx="10" fill="#F39C12"/>
            <rect x="110" y="160" width="30" height="35" rx="5" fill="#D35400" opacity="0.2"/>
            <rect x="115" y="155" width="5" height="25" rx="2" fill="#ECF0F1"/>
            <rect x="85" y="130" width="30" height="15" fill="#7F8C8D"/>
            <rect x="40" y="40" width="120" height="100" rx="25" fill="#ECF0F1"/>
            <line x1="100" y1="40" x2="100" y2="15" stroke="#7F8C8D" strokeWidth="5"/>
            <circle className="antenna-light" cx="100" cy="15" r="8" fill="#E74C3C"/>
            <g>
              <circle cx="75" cy="90" r="15" fill="#2C3E50"/>
              <circle ref={pupilLeftRef} className="pupil" cx="75" cy="90" r="5" fill="white"/>
              <circle cx="125" cy="90" r="15" fill="#2C3E50"/>
              <circle ref={pupilRightRef} className="pupil" cx="125" cy="90" r="5" fill="white"/>
              <path d="M 85 115 Q 100 125 115 115" stroke="#2C3E50" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <g className="eye-lids">
                <rect x="55" y="70" width="40" height="40" fill="#ECF0F1" transform="scale(1, 0)"/>
                <rect x="105" y="70" width="40" height="40" fill="#ECF0F1" transform="scale(1, 0)"/>
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
};

const Joe = () => (
  <JoeChatProvider>
    <JoeContent />
  </JoeChatProvider>
);

export default Joe;
