import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
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

CountryCodePicker.propTypes = {
  onSelect: PropTypes.func.isRequired,
};

const JoeContent = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'; } catch { return 'en'; }
  });
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(() => {
    try {
      const v = localStorage.getItem('joeBottomOpen');
      return v ? v === 'true' : false;
    } catch {
      return false;
    }
  });
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(true);
  const [isStatusPanelOpen, setIsStatusPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isBorderSettingsOpen, setIsBorderSettingsOpen] = useState(false);
  const [panelStyles, setPanelStyles] = useState({ left: { color: '#1f2937', width: 1, radius: 0 }, right: { color: '#1f2937', width: 1, radius: 0 } });
  const [usersData, setUsersData] = useState({ users: [], stats: null });
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState({ email: '', phone: '', password: '', role: 'admin' });
  const toggleBottomPanel = () => setIsBottomPanelOpen(!isBottomPanelOpen);
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
      try { setLang(localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'); } catch { void 0; }
    };
    window.addEventListener('joe:lang', onLang);
    return () => window.removeEventListener('joe:lang', onLang);
  }, []);

  // تم استبدال وظيفة تبديل اللغة باختصار لوحة المفاتيح Ctrl/Cmd+L أدناه

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
    } catch { void 0; }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('joePanelBorders', JSON.stringify(panelStyles));
    } catch { void 0; }
  }, [panelStyles]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('joePanelWidths');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.left) setLeftWidth(parsed.left);
        if (parsed?.right) setRightWidth(parsed.right);
      }
    } catch { void 0; }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('joePanelWidths', JSON.stringify({ left: leftWidth, right: rightWidth }));
    } catch { void 0; }
  }, [leftWidth, rightWidth]);

  useEffect(() => {
    try { localStorage.setItem('joeBottomOpen', String(isBottomPanelOpen)); } catch { void 0; }
  }, [isBottomPanelOpen]);

  const {
    conversations: conversationsList,
    currentConversationId,
    handleConversationSelect,
    handleNewConversation,
    isProcessing,
    plan,
    wsLog,
    wsConnected,
    renameConversation,
    deleteConversation,
    pinToggle,
    duplicateConversation,
    clearMessages,
    setInput,
    addLogToChat,
    addAllLogsToChat,
  } = useJoeChatContext();

  const robotRef = React.useRef(null);
  const pupilLeftRef = React.useRef(null);
  const pupilRightRef = React.useRef(null);
  const [robotActive, setRobotActive] = useState(false);
  const [robotCorner, setRobotCorner] = useState('bl');
  const [robotScale, setRobotScale] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem('joeRobotScale'));
      return Number.isFinite(v) && v > 0 ? v : 1;
    } catch {
      return 1;
    }
  });
  const [robotPos, setRobotPos] = useState(() => {
    try {
      const raw = localStorage.getItem('joeRobotPos');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [robotSize, setRobotSize] = useState({ w: 120, h: 140 });
  const [dragState, setDragState] = useState(null);
  const wasDragging = React.useRef(false);
  const ROBOT_MARGIN = 16;
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

  const computeRobotSize = useCallback(() => {
    const vw = window.innerWidth;
    let base = { w: 120, h: 140 };
    if (vw < 640) base = { w: 88, h: 104 };
    else if (vw < 1024) base = { w: 104, h: 122 };
    return {
      w: Math.round(base.w * robotScale),
      h: Math.round(base.h * robotScale),
    };
  }, [robotScale]);

  const getRectForCorner = useCallback((corner) => {
    const vw = window.innerWidth; const vh = window.innerHeight;
    const { w, h } = robotSize;
    if (corner === 'bl') return { left: ROBOT_MARGIN, top: vh - h - ROBOT_MARGIN, right: ROBOT_MARGIN + w, bottom: vh - ROBOT_MARGIN };
    if (corner === 'br') return { left: vw - w - ROBOT_MARGIN, top: vh - h - ROBOT_MARGIN, right: vw - ROBOT_MARGIN, bottom: vh - ROBOT_MARGIN };
    if (corner === 'tl') return { left: ROBOT_MARGIN, top: ROBOT_MARGIN, right: ROBOT_MARGIN + w, bottom: ROBOT_MARGIN + h };
    return { left: vw - w - ROBOT_MARGIN, top: ROBOT_MARGIN, right: vw - ROBOT_MARGIN, bottom: ROBOT_MARGIN + h };
  }, [robotSize]);

  const rectOverlapArea = (a, b) => {
    const xOverlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const yOverlap = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return xOverlap * yOverlap;
  };

  const findBestCorner = useCallback(() => {
    const candidates = ['bl','br','tl','tr'];
    const elements = Array.from(document.querySelectorAll('button,a,input,textarea,select,[role="dialog"],[data-joe-important="true"]'));
    const vis = elements.filter(el => {
      const s = getComputedStyle(el);
      return s.visibility !== 'hidden' && s.display !== 'none' && s.pointerEvents !== 'none';
    }).map(el => el.getBoundingClientRect());
    let best = 'bl';
    let bestScore = Number.POSITIVE_INFINITY;
    for (const c of candidates) {
      const r = getRectForCorner(c);
      const score = vis.reduce((sum, vr) => sum + rectOverlapArea(r, vr), 0);
      if (score < bestScore) { bestScore = score; best = c; }
    }
    setRobotCorner(best);
  }, [getRectForCorner]);

  const findBestCornerRef = React.useRef(findBestCorner);
  useEffect(() => {
    findBestCornerRef.current = findBestCorner;
  }, [findBestCorner]);

  const onRobotPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const el = robotRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const startOffsetX = e.clientX - rect.left;
    const startOffsetY = e.clientY - rect.top;
    setDragState({ offsetX: startOffsetX, offsetY: startOffsetY });
    wasDragging.current = false;
    let currLeft = rect.left;
    let currTop = rect.top;
    const onMove = (ev) => {
      const vw = window.innerWidth; const vh = window.innerHeight;
      currLeft = Math.max(0, Math.min(vw - robotSize.w, ev.clientX - startOffsetX));
      currTop = Math.max(0, Math.min(vh - robotSize.h, ev.clientY - startOffsetY));
      setDragState((s) => ({ ...s, left: currLeft, top: currTop }));
      wasDragging.current = true;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const vw = window.innerWidth; const vh = window.innerHeight; const { w, h } = robotSize;
      const centers = {
        bl: { x: ROBOT_MARGIN + w / 2, y: vh - ROBOT_MARGIN - h / 2 },
        br: { x: vw - ROBOT_MARGIN - w / 2, y: vh - ROBOT_MARGIN - h / 2 },
        tl: { x: ROBOT_MARGIN + w / 2, y: ROBOT_MARGIN + h / 2 },
        tr: { x: vw - ROBOT_MARGIN - w / 2, y: ROBOT_MARGIN + h / 2 },
      };
      const cx = currLeft + w / 2; const cy = currTop + h / 2;
      let best = 'bl'; let bestD = Infinity;
      for (const k of ['bl','br','tl','tr']) {
        const c = centers[k]; const d = Math.hypot(cx - c.x, cy - c.y);
        if (d < bestD) { bestD = d; best = k; }
      }
      setRobotPos({ left: currLeft, top: currTop });
      setRobotCorner(best);
      setDragState(null);
      setTimeout(() => { wasDragging.current = false; }, 0);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  useEffect(() => {
    const onResize = () => { setRobotSize(computeRobotSize()); findBestCornerRef.current(); };
    const onScroll = () => findBestCornerRef.current();
    setRobotSize(computeRobotSize());
    findBestCornerRef.current();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    const onOpenProviders = () => setRobotActive(true);
    window.addEventListener('joe:openProviders', onOpenProviders);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('joe:openProviders', onOpenProviders);
    };
  }, [computeRobotSize]);

  useEffect(() => {
    const onKey = (e) => {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        const next = lang === 'ar' ? 'en' : 'ar';
        try { localStorage.setItem('lang', next); } catch { void 0; }
        setLang(next);
        try { window.dispatchEvent(new CustomEvent('joe:lang', { detail: { lang: next } })); } catch { void 0; }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lang]);

  useEffect(() => {
    try { localStorage.setItem('joeRobotScale', String(robotScale)); } catch { void 0; }
  }, [robotScale]);

  useEffect(() => {
    try { localStorage.setItem('joeRobotPos', robotPos ? JSON.stringify(robotPos) : ''); } catch { void 0; }
  }, [robotPos]);

  const toggleSidePanel = () => setIsSidePanelOpen(!isSidePanelOpen);
  const toggleRightPanel = () => setIsRightPanelOpen(!isRightPanelOpen);
  
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
        isRightOpen={isRightPanelOpen}
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
            <button onClick={()=>setIsBorderSettingsOpen(false)} className="md:hidden absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded p-2">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-xl font-bold">إدارة المستخدمين</h3>
              <div className="flex items-center gap-2">
                <button onClick={()=>navigate('/dashboard/users')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded">فتح صفحة المستخدمين</button>
                <button onClick={()=>navigate('/dashboard/super-admin')} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded">إدارة متقدمة</button>
                <button onClick={()=>setIsBorderSettingsOpen(false)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded">إغلاق</button>
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
        {isSidePanelOpen && (
          <div className={`relative z-0 bg-gray-900 flex-shrink-0 ${panelStyles.left.width === 0 ? 'border-r border-gray-800' : ''}`} style={{ ...leftStyle, width: isMobile ? Math.min(leftWidth, 360) : leftWidth }}>
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
              lang={lang}
            />
            <div
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setDragLeft(true); }}
              className="absolute top-0 right-0 h-full cursor-col-resize z-20 select-none"
              style={{ width: '2px', background: 'rgba(107,114,128,0.5)' }}
            />
          </div>
        )}
        {/* Main Console - Center (Flexible) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`flex-1 overflow-hidden ${isBottomPanelOpen ? '' : 'h-full'}`}>
            <MainConsole key={currentConversationId} />
          </div>

          {/* Bottom Panel - Logs (Collapsible) */}
          {isBottomPanelOpen && (
            <div className={`${isBottomCollapsed ? 'h-0' : 'h-48'} border-t border-gray-800 bg-gray-900 flex-shrink-0 overflow-hidden`}
            >
              <BottomPanel 
                logs={wsLog} 
                collapsed={isBottomCollapsed}
                onToggleCollapse={() => setIsBottomCollapsed(v => !v)}
                onAddLogToChat={(log) => addLogToChat(log)}
                onAddAllLogs={() => addAllLogsToChat()}
              />
            </div>
          )}
        </div>

        {/* Right Panel - Plan & Tools (Collapsible) */}
        {isRightPanelOpen && !isMobile && (
          <div className="relative z-10 bg-gray-900 flex-shrink-0" style={{ ...rightStyle, width: rightWidth }}>
            <RightPanel isProcessing={isProcessing} plan={plan} forceStatus={isStatusPanelOpen} wsConnected={wsConnected} />
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
              <RightPanel isProcessing={isProcessing} plan={plan} forceStatus={isStatusPanelOpen} wsConnected={wsConnected} />
            </div>
          </div>
        )}
      </div>
      <style>{`
        #joe-container { position: fixed; cursor: pointer; z-index: 1000; transition: transform 0.3s ease; }
        #joe-container:hover { transform: scale(1.06); }
        #joe-container .chat-bubble { position: absolute; bottom: 140px; left: 0; background: #fff; padding: 10px 15px; border-radius: 15px 15px 15px 0; box-shadow: 0 5px 15px rgba(0,0,0,0.1); font-size: 14px; color: #333; opacity: 0; transform: translateY(10px); transition: all 0.3s ease; pointer-events: none; width: 180px; text-align: center; }
        #joe-container:hover .chat-bubble, #joe-container.active .chat-bubble { opacity: 1; transform: translateY(0); }
        #joe-container svg { width: 100%; height: 100%; overflow: visible; }
        .floating-body { animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        #joe-container.playful { animation: wander 4s ease-in-out infinite; }
        @keyframes wander { 0%,100% { transform: translateX(0); } 50% { transform: translateX(6px); } }
        .eye-lids { animation: blink 4s infinite; transform-origin: center; }
        @keyframes blink { 0%, 96% { transform: scaleY(1); } 98% { transform: scaleY(0.1); } 100% { transform: scaleY(1); } }
        .arm-right { transform-origin: 15% 15%; animation: wave 3s ease-in-out infinite; }
        @keyframes wave { 0% { transform: rotate(0deg); } 50% { transform: rotate(-15deg); } 100% { transform: rotate(0deg); } }
        .thinking .pupil { fill: #00ff00; }
        .thinking .antenna-light { animation: pulse 0.5s infinite alternate; }
        @keyframes pulse { from { fill: #ff4d4d; opacity: 0.5; } to { fill: #ff0000; opacity: 1; } }
      `}</style>
      {(() => {
        const s = { position: 'fixed', width: `${robotSize.w}px`, height: `${robotSize.h}px`, zIndex: 1000, touchAction: 'none' };
        if (dragState && typeof dragState.left === 'number' && typeof dragState.top === 'number') {
          Object.assign(s, { left: dragState.left, top: dragState.top });
        } else {
          if (robotPos && typeof robotPos.left === 'number' && typeof robotPos.top === 'number') {
            const vw = window.innerWidth; const vh = window.innerHeight;
            const left = Math.max(0, Math.min(vw - robotSize.w, robotPos.left));
            const top = Math.max(0, Math.min(vh - robotSize.h, robotPos.top));
            Object.assign(s, { left, top });
          } else {
            if (robotCorner === 'bl') Object.assign(s, { left: ROBOT_MARGIN, bottom: ROBOT_MARGIN });
            if (robotCorner === 'br') Object.assign(s, { right: ROBOT_MARGIN, bottom: ROBOT_MARGIN });
            if (robotCorner === 'tl') Object.assign(s, { left: ROBOT_MARGIN, top: ROBOT_MARGIN });
            if (robotCorner === 'tr') Object.assign(s, { right: ROBOT_MARGIN, top: ROBOT_MARGIN });
          }
        }
        const cls = (robotActive || isProcessing) ? 'active playful' : '';
        return (
          <div id="joe-container" ref={robotRef} onPointerDown={onRobotPointerDown} onClick={()=>{ if (wasDragging.current) return; setRobotActive(v=>!v); }} className={cls} style={s}>
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
            {robotActive && (
              <div className="absolute" style={{ bottom: robotCorner.includes('b') ? robotSize.h + 8 : undefined, top: robotCorner.includes('t') ? robotSize.h + 8 : undefined, left: robotCorner.includes('l') ? 0 : undefined, right: robotCorner.includes('r') ? 0 : undefined }}>
                <div className="min-w-[200px] max-w-[240px] p-3 rounded-xl bg-gray-900 border border-yellow-600 text-white shadow-2xl">
                  <div className="text-sm mb-2">{lang === 'ar' ? 'مساعد جو — اختصر الوقت:' : 'Joe Assistant — quick actions:'}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={(e)=>{ e.stopPropagation(); setInput(prev=>prev ? prev+"\n\n— رجاءً قدّم ملخصًا واضحًا." : '— رجاءً قدّم ملخصًا واضحًا.'); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'تلخيص':'Summarize'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); setInput('اقترح أوامر مفيدة بحسب السياق الحالي'); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'اقتراح أوامر':'Suggest cmds'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); try { window.dispatchEvent(new CustomEvent('joe:openProviders')); } catch { void 0; } }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?"مزودي الذكاء":"AI Providers"}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); findBestCorner(); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'تحريك لمكان فارغ':'Find empty spot'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); setRobotCorner('bl'); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'نقل: يسار-أسفل':'Move BL'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); setRobotCorner('br'); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'نقل: يمين-أسفل':'Move BR'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); setRobotCorner('tl'); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'نقل: يسار-أعلى':'Move TL'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); setRobotCorner('tr'); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'نقل: يمين-أعلى':'Move TR'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); setRobotScale(0.85); setRobotSize(computeRobotSize()); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'حجم صغير':'Small'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); setRobotScale(1.0); setRobotSize(computeRobotSize()); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'حجم متوسط':'Medium'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); setRobotScale(1.25); setRobotSize(computeRobotSize()); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'حجم كبير':'Large'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); toggleSidePanel(); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'لوحة اليسار':'Left Panel'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); toggleRightPanel(); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'لوحة اليمين':'Right Panel'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); toggleBottomPanel(); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'سجلّ النظام':'Logs'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); handleNewConversation(); }} className="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-black text-xs">{lang==='ar'?'جلسة جديدة':'New Chat'}</button>
                    <button onClick={(e)=>{ e.stopPropagation(); if (currentConversationId) clearMessages(currentConversationId); }} className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs">{lang==='ar'?'مسح الرسائل':'Clear msgs'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

const Joe = () => (
  <JoeChatProvider>
    <JoeContent />
  </JoeChatProvider>
);

export default Joe;
CountryCodePicker.propTypes = {
  onSelect: PropTypes.func.isRequired,
};
