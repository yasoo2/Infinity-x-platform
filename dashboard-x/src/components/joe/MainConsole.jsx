import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { FiMic, FiPaperclip, FiSend, FiStopCircle, FiCompass, FiArrowDown, FiLink, FiGitBranch, FiImage, FiTrash2, FiCopy } from 'react-icons/fi';
import { useJoeChatContext } from '../../context/JoeChatContext.jsx';
import apiClient from '../../api/client';
import { getSystemStatus, listUserUploads, deleteUserUpload } from '../../api/system';
import JoeScreen from '../JoeScreen.jsx';

const WelcomeScreen = ({ toolsCount }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-6">
    <div className="max-w-3xl">
      <FiCompass size={72} className="mb-6 text-blue-500 mx-auto" />
      <h1 className="text-3xl font-bold text-white mb-4">Welcome to Joe AI Assistant</h1>
      <p className="text-lg text-gray-400 mb-8">
        Your AI-powered engineering partner{typeof toolsCount==='number' && toolsCount>0 ? ` with ${toolsCount} tools and functions` : ''}. 
        Start by typing an instruction below, attaching a file, or using your voice.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        <div className="p-5 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors">
          <div className="text-3xl mb-3">💬</div>
          <h3 className="font-semibold text-white mb-2">Chat & Ask</h3>
          <p className="text-sm text-gray-400">Get instant answers and explanations</p>
        </div>
        <div className="p-5 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors">
          <div className="text-3xl mb-3">🛠️</div>
          <h3 className="font-semibold text-white mb-2">Build & Create</h3>
          <p className="text-sm text-gray-400">Generate projects and applications</p>
        </div>
        <div className="p-5 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors">
          <div className="text-3xl mb-3">🔍</div>
          <h3 className="font-semibold text-white mb-2">Analyze & Process</h3>
          <p className="text-sm text-gray-400">Work with data and generate insights</p>
        </div>
      </div>
    </div>
  </div>
);

WelcomeScreen.propTypes = {
  toolsCount: PropTypes.number,
};

const MainConsole = ({ isBottomPanelOpen, isBottomCollapsed }) => {
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const showScrollRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const inputAreaRef = useRef(null);
  const [inputAreaHeight, setInputAreaHeight] = React.useState(0);
  const [lang, setLang] = React.useState(() => {
    try { return localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'; } catch { return 'ar'; }
  });
  
  const [uploadPct, setUploadPct] = React.useState(0);
  const [linkLoading, setLinkLoading] = React.useState(false);
  const [showGithub, setShowGithub] = React.useState(false);
  const [ghUrl, setGhUrl] = React.useState('');
  const [ghBranch, setGhBranch] = React.useState('main');
  const [ghToken, setGhToken] = React.useState(() => {
    try { return localStorage.getItem('githubToken') || ''; } catch { return ''; }
  });
  const ghPanelRef = useRef(null);
  const [ghCommitMessage, setGhCommitMessage] = React.useState('Update by JOE AI');
  const [dragActive, setDragActive] = React.useState(false);
  const [showBuilder, setShowBuilder] = React.useState(false);
  const [builderDescription, setBuilderDescription] = React.useState('');
  const [builderRepoName, setBuilderRepoName] = React.useState('my-autonomous-project');
  const [builderProjectType, setBuilderProjectType] = React.useState('page');
  const [builderLoading, setBuilderLoading] = React.useState(false);
  const [toolsCount, setToolsCount] = React.useState(0);
  const [showGallery, setShowGallery] = React.useState(false);
  const [uploads, setUploads] = React.useState([]);
  const [uploadsLoading, setUploadsLoading] = React.useState(false);
  const [showBrowserPanel, setShowBrowserPanel] = React.useState(false);
  const [browserPanelMode, setBrowserPanelMode] = React.useState('mini');
  const [browserInitialUrl, setBrowserInitialUrl] = React.useState('');
  const [browserInitialSearch, setBrowserInitialSearch] = React.useState('');
  const galleryPanelRef = useRef(null);

  const { 
    messages, isProcessing, progress, currentStep, 
    input, setInput, isListening, handleSend, stopProcessing,
    handleVoiceInput, transcript, currentConversation,
    wsConnected, reconnectActive, reconnectAttempt, reconnectRemainingMs, reconnectDelayMs,
    plan
  } = useJoeChatContext();

  const lastContent = messages[messages.length - 1]?.content || '';
  
  const scrollToBottomIfNeeded = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance <= 20;
    if (!atBottom) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShowScrollButton(false);
    });
  };
  
  const prevMsgCountRef = useRef(messages.length);
  const lastSenderRef = useRef(messages[messages.length - 1]?.type);

  // Auto-scroll فقط إذا كان المستخدم في الأسفل بالفعل؛ واستخدم ضبط مباشر للتمرير لتقليل الاهتزاز
  useEffect(() => {
    scrollToBottomIfNeeded();
  }, [messages.length, lastContent]);

  // عند تبديل المحادثة، انتقل دائماً إلى آخر رسالة
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShowScrollButton(false);
    });
  }, [currentConversation]);

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const last = messages[messages.length - 1];
      if (last?.type === 'user') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const el = scrollContainerRef.current;
            if (!el) return;
            el.scrollTop = el.scrollHeight;
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setShowScrollButton(false);
          });
        });
      }
      if (last?.type !== 'user') {
        const el = scrollContainerRef.current;
        if (el) {
          const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
          if (distance <= 300) {
            requestAnimationFrame(() => {
              el.scrollTop = el.scrollHeight;
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              setShowScrollButton(false);
            });
          }
        }
      }
      prevMsgCountRef.current = messages.length;
      lastSenderRef.current = last?.type;
    }
  }, [messages]);

  

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript, setInput]);

  useEffect(() => {
    const onLang = () => {
      try { setLang(localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'); } catch { void 0; }
    };
    window.addEventListener('joe:lang', onLang);
    return () => window.removeEventListener('joe:lang', onLang);
  }, []);

  useEffect(() => {
    const onOpenBrowser = (e) => {
      try {
        const d = e && e.detail ? e.detail : {};
        const url = String(d?.url || '').trim();
        if (url) setBrowserInitialUrl(url);
        const q = String(d?.searchQuery || '').trim();
        if (q) setBrowserInitialSearch(q);
        setShowBrowserPanel(true);
        setBrowserPanelMode('mini');
      } catch { /* noop */ }
    };
    window.addEventListener('joe:open-browser', onOpenBrowser);
    return () => window.removeEventListener('joe:open-browser', onOpenBrowser);
  }, []);

  

  

  useEffect(() => {
    let active = true;
    let attempts = 0;
    const controller = new AbortController();
    const fetchOnce = async () => {
      try {
        const status = await getSystemStatus({ signal: controller.signal });
        const cnt = Number(status?.toolsCount || 0);
        if (!Number.isNaN(cnt)) {
          setToolsCount(cnt);
          if (cnt > 0) return;
        }
      } catch (err) {
        const m = String(err?.message || '');
        if (/canceled|abort(ed)?/i.test(m)) return;
      }
      attempts++;
      if (active && attempts < 5) setTimeout(fetchOnce, 1500);
    };
    fetchOnce();
    return () => { active = false; try { controller.abort(); } catch { /* ignore */ } };
  }, []);

  useEffect(() => {
    if (!ghToken) {
      try { setGhToken(localStorage.getItem('githubToken') || ''); } catch { void 0; }
    }
  }, [ghUrl, ghToken]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!showGithub) return;
      const el = ghPanelRef.current;
      if (el && !el.contains(e.target)) setShowGithub(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showGithub]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!showGallery) return;
      const el = galleryPanelRef.current;
      if (el && !el.contains(e.target)) setShowGallery(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showGallery]);

  const loadUploads = async () => {
    try {
      setUploadsLoading(true);
      const data = await listUserUploads({});
      setUploads(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setUploads([]);
    } finally {
      setUploadsLoading(false);
    }
  };

  const handleDeleteUpload = async (name) => {
    try {
      await deleteUserUpload(name, {});
      await loadUploads();
    } catch { void 0; }
  };

  const handleCopyUrl = async (url) => {
    try { await navigator.clipboard.writeText(url); } catch { void 0; }
  };

  

  useEffect(() => {
    const el = inputAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setInputAreaHeight(el.offsetHeight || 0);
    });
    ro.observe(el);
    setInputAreaHeight(el.offsetHeight || 0);
    const onResize = () => setInputAreaHeight(el.offsetHeight || 0);
    window.addEventListener('resize', onResize);
    return () => {
      try { ro.disconnect(); } catch { void 0; }
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    try { document.documentElement.style.setProperty('--joe-input-h', `${inputAreaHeight}px`); } catch { void 0; }
  }, [inputAreaHeight]);

  useEffect(() => {
    const updateMetrics = () => {
      const el = inputAreaRef.current;
      if (!el) return;
      const wrapper = el.querySelector('.max-w-5xl');
      const rect = wrapper?.getBoundingClientRect();
      if (!rect) return;
      try {
        const left = Math.round(rect.left);
        const right = Math.round(window.innerWidth - rect.right);
        const width = Math.round(rect.width);
        document.documentElement.style.setProperty('--joe-input-left', `${left}px`);
        document.documentElement.style.setProperty('--joe-input-right', `${right}px`);
        document.documentElement.style.setProperty('--joe-input-width', `${width}px`);
      } catch { void 0; }
    };
    updateMetrics();
    window.addEventListener('resize', updateMetrics);
    window.addEventListener('scroll', updateMetrics, { passive: true });
    return () => {
      window.removeEventListener('resize', updateMetrics);
      window.removeEventListener('scroll', updateMetrics);
    };
  }, [inputAreaHeight]);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 160;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    showScrollRef.current = !atBottom;
    setShowScrollButton(!atBottom);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    // initial check
    checkScroll();
    return () => el.removeEventListener('scroll', checkScroll);
  }, []);

  const handleFileClick = () => fileInputRef.current.click();
  const [okKey, setOkKey] = React.useState(null);
  const [okKind, setOkKind] = React.useState('success');
  const okPulse = (key, kind = 'success') => { setOkKey(key); setOkKind(kind); setTimeout(() => { setOkKey(null); setOkKind('success'); }, 800); };

  const uploadFiles = async (files) => {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    try {
      const { data } = await apiClient.post('/api/v1/file/upload', form, {
        onUploadProgress: (evt) => {
          const total = evt.total || 1;
          const pct = Math.round((evt.loaded / total) * 100);
          setUploadPct(pct);
        },
      });
      return data;
    } catch {
      return { success: false, error: 'upload_failed' };
    }
  };

  const collectDroppedFiles = async (items) => {
    const entries = [];
    try {
      for (const it of items) {
        if (it.kind === 'file' && typeof it.webkitGetAsEntry === 'function') {
          const en = it.webkitGetAsEntry();
          if (en) entries.push(en);
        }
      }
    } catch { /* ignore */ }
    if (!entries.length) {
      return [];
    }
    const readEntry = async (entry) => {
      return new Promise((resolve) => {
        try {
          if (entry.isFile) {
            entry.file((f) => resolve([f]));
          } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const all = [];
            const readBatch = () => {
              try {
                dirReader.readEntries(async (ents) => {
                  if (!ents.length) return resolve(all);
                  const results = await Promise.all(ents.map(readEntry));
                  for (const r of results) all.push(...r);
                  readBatch();
                });
              } catch { resolve(all); }
            };
            readBatch();
          } else {
            resolve([]);
          }
        } catch { resolve([]); }
      });
    };
    const nested = await Promise.all(entries.map(readEntry));
    return nested.flat();
  };

  const onDropFiles = async (e) => {
    e.preventDefault();
    setDragActive(false);
    try {
      let files = [];
      const items = e.dataTransfer?.items;
      if (items && items.length) {
        const collected = await collectDroppedFiles(items);
        files = collected.length ? collected : Array.from(e.dataTransfer?.files || []);
      } else {
        files = Array.from(e.dataTransfer?.files || []);
      }
      if (!files.length) return;
      const data = await uploadFiles(files);
      if (data?.success) {
        const list = (data.results || []).map((r, i) => {
          const name = r?.fileName || files[i]?.name || `file-${i+1}`;
          const size = files[i]?.size ? `${Math.round(files[i].size/1024)}KB` : '';
          const type = files[i]?.type || '';
          return `- ${name} ${size} ${type}`.trim();
        }).join('\n');
        const header = lang==='ar' ? 'تحليل المرفقات:' : 'Analyze attachments:';
        setInput(`${header}\n${list}`);
      } else {
        const err = lang==='ar' ? 'فشل رفع الملفات' : 'File upload failed';
        setInput(err);
      }
    } catch {
      const err = lang==='ar' ? 'فشل رفع الملفات' : 'File upload failed';
      setInput(err);
    }
  };

  const extractUrls = (text) => {
    const re = /(https?:\/\/[^\s]+)/g;
    const m = text.match(re) || [];
    // unique
    return Array.from(new Set(m));
  };

  const fetchLinksFromInput = async () => {
    const urls = extractUrls(input);
    if (!urls.length) return;
    try {
      setLinkLoading(true);
      const summaries = [];
      for (const u of urls) {
        try {
          const { data } = await apiClient.post('/api/v1/file/fetch-url', { url: u, deep: true, maxDepth: 4, maxItems: 20000 });
          summaries.push(`${u} → ${data?.mode==='github' ? (lang==='ar'?'تم استنساخ مخزن جيت هاب':'GitHub repo cloned') : (lang==='ar'?'تم تنزيل وتحليل المحتوى':'Fetched and analyzed')}`);
        } catch {
          summaries.push(`${u} → ${lang==='ar'?'فشل الجلب':'Fetch failed'}`);
        }
      }
      const header = lang==='ar' ? 'نتائج جلب الروابط:' : 'Link fetch results:';
      setInput(`${header}\n${summaries.join('\n')}`);
      handleSend();
    } catch { /* ignore */ }
    finally { setLinkLoading(false); }
  };

  const handleCreateAndDeploy = async () => {
    try {
      setBuilderLoading(true);
      const { data } = await apiClient.post('/api/v1/page-builder/create-and-deploy', {
        description: builderDescription || input || 'Autonomous build by Joe',
        projectType: builderProjectType,
        repoName: builderRepoName,
      });
      if (data?.success) {
        const msg = (lang==='ar')
          ? `تم بدء إنشاء ونشر المشروع\nالمستودع: ${data.repoUrl}\nالنشر: ${data.deploymentUrl}`
          : `Project creation & deployment initiated\nRepo: ${data.repoUrl}\nDeploy: ${data.deploymentUrl}`;
        setInput(msg);
        setShowBuilder(false);
      } else {
        const err = lang==='ar' ? 'فشل إنشاء/نشر المشروع' : 'Create/Deploy failed';
        setInput(`${err}: ${data?.error || ''}`.trim());
      }
    } catch {
      const err = lang==='ar' ? 'فشل إنشاء/نشر المشروع' : 'Create/Deploy failed';
      setInput(err);
    } finally {
      setBuilderLoading(false);
    }
  };

  const handleGithubAnalyze = async () => {
    const url = ghUrl.trim();
    if (!url) return;
    try {
      setLinkLoading(true);
      const { data } = await apiClient.post('/api/v1/file/fetch-url', { url, deep: true, maxDepth: 4, maxItems: 20000, token: ghToken, branch: ghBranch });
      const msg = data?.mode==='github'
        ? (lang==='ar' ? `تم استنساخ وتحليل المستودع: ${url}` : `Repository cloned and analyzed: ${url}`)
        : (lang==='ar' ? `تم جلب وتحليل المحتوى: ${url}` : `Fetched and analyzed: ${url}`);
      setInput(msg);
      handleSend();
      setShowGithub(false);
    } catch {
      const err = lang==='ar' ? 'فشل تحليل مستودع GitHub' : 'GitHub analysis failed';
      setInput(err);
      handleSend();
    } finally {
      setLinkLoading(false);
    }
  };

  const handleGithubCommit = async () => {
    const url = ghUrl.trim();
    if (!url) return;
    try {
      setLinkLoading(true);
      const { data } = await apiClient.post('/api/v1/file/github/commit', { url, message: ghCommitMessage, branch: ghBranch, token: ghToken });
      const msg = data?.success === false ? (lang==='ar'?'فشل الكومِت':'Commit failed') : (lang==='ar'?'تم تنفيذ الكومِت':'Commit executed');
      setInput(`${msg}`);
      handleSend();
    } catch {
      const err = lang==='ar' ? 'فشل الكومِت' : 'Commit failed';
      setInput(err);
      handleSend();
    } finally {
      setLinkLoading(false);
    }
  };

  const handleGithubPush = async () => {
    const url = ghUrl.trim();
    if (!url) return;
    try {
      setLinkLoading(true);
      const { data } = await apiClient.post('/api/v1/file/github/push', { url, branch: ghBranch, token: ghToken });
      const msg = data?.success === false ? (lang==='ar'?'فشل الدفع':'Push failed') : (lang==='ar'?'تم الدفع إلى الفرع':'Pushed to branch');
      setInput(`${msg} ${ghBranch}`);
      handleSend();
    } catch {
      const err = lang==='ar' ? 'فشل الدفع' : 'Push failed';
      setInput(err);
      handleSend();
    } finally {
      setLinkLoading(false);
    }
  };

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const data = await uploadFiles(files);
    if (data?.success) {
      const list = (data.results || []).map((r, i) => {
        const name = r?.fileName || files[i]?.name || `file-${i+1}`;
        const size = files[i]?.size ? `${Math.round(files[i].size/1024)}KB` : '';
        const type = files[i]?.type || '';
        return `- ${name} ${size} ${type}`.trim();
      }).join('\n');
      const header = lang==='ar' ? 'تحليل المرفقات:' : 'Analyze attachments:';
      setInput(`${header}\n${list}`);
    } else {
      const err = lang==='ar' ? 'فشل رفع الملفات' : 'File upload failed';
      setInput(err);
    }
  };


  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Messages Area - Spacious and Centered */}
      <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef} style={{ scrollBehavior: 'smooth', overscrollBehavior: 'auto', overflowAnchor: 'auto' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 border border-gray-800 rounded-xl bg-gray-900/60" style={{ paddingBottom: Math.max(24, inputAreaHeight + 24) }}>
          {messages.length === 0 ? (
            <WelcomeScreen toolsCount={toolsCount} />
          ) : (
            <div className="space-y-5">
              {(() => {
                const ordered = [...messages].sort((a, b) => {
                  const ta = typeof a.createdAt === 'number' ? a.createdAt : 0;
                  const tb = typeof b.createdAt === 'number' ? b.createdAt : 0;
                  if (ta !== tb) return ta - tb;
                  const wa = a.type === 'user' ? 0 : 1;
                  const wb = b.type === 'user' ? 0 : 1;
                  return wa - wb;
                });
                const renderContent = (text) => {
                  const t = String(text || '');
                  const urlRe = /((https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s)]+)?)/gi;
                  const parts = [];
                  let lastIndex = 0;
                  let m;
                  while ((m = urlRe.exec(t)) !== null) {
                    const i = m.index;
                    const raw = m[0];
                    const hasScheme = !!m[2];
                    const target = hasScheme ? raw : `https://${raw}`;
                    if (i > lastIndex) parts.push(t.slice(lastIndex, i));
                    parts.push({ href: target, display: raw });
                    lastIndex = i + raw.length;
                  }
                  if (lastIndex < t.length) parts.push(t.slice(lastIndex));
                  const brands = ['google','جوجل','غوغل','youtube','يوتيوب','facebook','فيسبوك','instagram','انستقرام','tiktok','تيك توك','twitter','x','snapchat','سناب شات','linkedin','لينكدان','netflix','نيتفلكس','amazon','أمازون','apple','آبل','microsoft','مايكروسوفت','github','جيت هب','gitlab','جيت لاب','stackoverflow','ستاك أوفر فلو'];
                  const brandPattern = new RegExp(`\\b(?:${brands.map(b=>b.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')).join('|')})\\b`,'gi');
                  const renderTextWithBrands = (s) => {
                    const nodes = [];
                    let idx = 0;
                    let mm;
                    while ((mm = brandPattern.exec(s)) !== null) {
                      const i = mm.index;
                      const w = mm[0];
                      if (i > idx) nodes.push(s.slice(idx, i));
                      nodes.push(
                        <a
                          key={`brand-${i}-${w}`}
                          href="#"
                          onClick={(e) => { e.preventDefault(); try { window.dispatchEvent(new CustomEvent('joe:open-browser', { detail: { searchQuery: w } })); } catch { /* noop */ } }}
                          className="underline text-blue-400"
                        >
                          {w}
                        </a>
                      );
                      idx = i + w.length;
                    }
                    if (idx < s.length) nodes.push(s.slice(idx));
                    return nodes;
                  };
                  const imageUrls = Array.from(new Set((t.match(/https?:\/\/[^\s)]+/g) || []).filter(u => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(u))));
                  return (
                    <>
                      <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                        {parts.map((p, i) => typeof p === 'string' ? renderTextWithBrands(p) : (
                          <a
                            key={`lnk-${i}`}
                            href={p.href}
                            onClick={(e) => { e.preventDefault(); try { window.dispatchEvent(new CustomEvent('joe:open-browser', { detail: { url: p.href } })); } catch { /* noop */ } }}
                            className="underline text-yellow-400 break-all"
                          >
                            {p.display || p.href}
                          </a>
                        ))}
                      </p>
                      {imageUrls.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {imageUrls.slice(0, 4).map((src, i) => (
                            <a
                              key={`img-${i}`}
                              href={src}
                              onClick={(e) => { e.preventDefault(); try { window.dispatchEvent(new CustomEvent('joe:open-browser', { detail: { url: src } })); } catch { /* noop */ } }}
                              className="block"
                            >
                              <img src={src} alt="image" className="max-h-56 rounded-lg border border-gray-700"/>
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  );
                };
                return ordered.map((msg, index) => (
                  <div 
                    key={msg.id || index} 
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[90%] sm:max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 ${
                        msg.type === 'user' 
                          ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-black border border-yellow-600 ring-1 ring-yellow-600/30 shadow-xl' 
                          : 'bg-gradient-to-br from-blue-900 to-gray-900 text-gray-100 border border-blue-800 ring-1 ring-blue-700/40 shadow-xl backdrop-blur-sm'
                      }`}
                    >
                    {msg.type !== 'user' && (
                      <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500 text-black font-bold">J</span>
                        <span className="uppercase tracking-wide">JOE</span>
                      </div>
                    )}
                    {renderContent(msg.content)}
                  </div>
                </div>
              ));
              })()}
              
              {/* Progress Bar */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="max-w-[75%] bg-gray-800/80 border border-gray-700 rounded-2xl px-5 py-4 shadow-md">
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="relative mt-2 h-8 overflow-hidden">
                      <style>{`@keyframes joeWalk{0%{transform:translateX(0) rotateY(0);}50%{transform:translateX(70%) rotateY(180deg);}100%{transform:translateX(0) rotateY(0);} }`}</style>
                      <div className="absolute inset-x-0 top-3 h-1 bg-gray-700 rounded-full"></div>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-500 text-black font-bold shadow-md" style={{ animation: 'joeWalk 2.4s infinite linear' }}>J</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-sm text-gray-300">{currentStep || 'Processing your request...'}</p>
                      <button
                        onClick={() => { setShowBrowserPanel(true); setBrowserPanelMode('mini'); }}
                        className="text-xs px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600"
                        title={lang==='ar' ? 'فتح شاشة جو داخل الجلسة' : 'Open Joe Screen inline'}
                      >
                        {lang==='ar' ? 'شاشة جو' : 'Joe Screen'}
                      </button>
                    </div>
                      {Array.isArray(plan) && plan.some(s => s?.type === 'tool_used') && (
                        <div className="mt-1">
                          <div className="text-xs text-gray-400 mb-1">{lang==='ar' ? 'الأدوات المستخدمة' : 'Tools Used'}</div>
                          <div className="flex flex-wrap gap-2">
                            {plan.filter(s => s?.type === 'tool_used').slice(-6).map((s, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-700 text-gray-200 border border-gray-600 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                {String(s?.content || '').trim() || 'tool'}
                              </span>
                            ))}
                          </div>
                          <div className="mt-2 max-h-28 overflow-y-auto bg-gray-800/60 border border-gray-700 rounded-md">
                            {plan.filter(s => s?.type === 'tool_used').slice(-12).map((s, i) => {
                              const name = String(s?.content || '').trim();
                              const d = s?.details || {};
                              const stage = String(d?.stage || '').toLowerCase();
                              const ms = typeof d?.ms === 'number' ? d.ms : null;
                              const summary = String(d?.summary || '').trim();
                              const args = d?.args;
                              const argsText = (() => {
                                try {
                                  if (!args) return '';
                                  const keys = Object.keys(args);
                                  if (keys.length === 0) return '';
                                  const pairs = keys.slice(0, 3).map(k => `${k}=${typeof args[k] === 'string' ? args[k] : JSON.stringify(args[k]).slice(0, 60)}`);
                                  return pairs.join(' ');
                                } catch { return ''; }
                              })();
                              const line = (() => {
                                if (stage === 'start') {
                                  return lang==='ar' ? `بدء ${name} ${argsText}`.trim() : `start ${name} ${argsText}`.trim();
                                }
                                if (stage === 'end') {
                                  const msText = ms != null ? `${ms}ms` : '';
                                  const sep = (msText && summary) ? ' – ' : '';
                                  const tail = `${msText}${sep}${summary}`.trim();
                                  return lang==='ar' ? `انتهى ${name} ${tail}`.trim() : `end ${name} ${tail}`.trim();
                                }
                                return name || (lang==='ar' ? 'أداة' : 'tool');
                              })();
                              return (
                                <div key={`log-${i}`} className="px-2 py-1 text-[11px] text-gray-300 border-b border-gray-700/60 last:border-b-0">
                                  {line}
                                </div>
                              );
                            })}
                          </div>
                          {(() => {
                            try {
                              const steps = plan.filter(s => s?.type === 'tool_used');
                              const lastImg = steps.slice().reverse().find(s => /generateImage|dall|image/i.test(String(s?.content || '')));
                              const d = lastImg?.details || {};
                              const stage = String(d?.stage || '').toLowerCase();
                              if (stage !== 'end') return null;
                              const collectUrls = (text) => {
                                try { return Array.from(new Set(String(text||'').match(/https?:\/\/[^\s)]+/g) || [])); } catch { return []; }
                              };
                              const urls = [
                                ...collectUrls(d?.summary || ''),
                                ...collectUrls(JSON.stringify(d?.args || {}))
                              ];
                              const imgUrl = urls.find(u => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(u)) || urls.find(u => /\/uploads\//.test(u));
                              if (!imgUrl) return null;
                              return (
                                <div className="mt-3">
                                  <div className="text-xs text-gray-400 mb-1">{lang==='ar' ? 'معاينة الصورة الناتجة' : 'Generated Image Preview'}</div>
                                  <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="block">
                                    <img src={imgUrl} alt="generated" className="max-h-56 rounded-lg border border-gray-700" />
                                  </a>
                                </div>
                              );
                            } catch { return null; }
                          })()}
                        </div>
                      )}
                    {(() => {
                      try {
                        const steps = Array.isArray(plan) ? plan.filter(s => s?.type === 'tool_used') : [];
                        const hasImg = steps.some(s => /generateImage|dall|image/i.test(String(s?.content || '')));
                        if (!isProcessing || !hasImg) return null;
                        const last = steps.slice().reverse().find(s => /generateImage|dall|image/i.test(String(s?.content || '')));
                        const d = last?.details || {};
                        const stage = String(d?.stage || '').toLowerCase();
                        const args = d?.args || {};
                        const prompt = String(args?.prompt || args?.description || args?.text || '').trim();
                        if (stage === 'end') return null;
                        return (
                          <div className="mt-3 bg-gray-800/80 border border-gray-700 rounded-2xl p-4">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-yellow-500 text-black font-bold">I</span>
                              <span>{lang==='ar' ? 'جاري إنشاء الصورة' : 'Image is being generated'}</span>
                            </div>
                            {prompt && (
                              <div className="mt-2 text-xs text-gray-400">{prompt}</div>
                            )}
                            <div className="mt-3 h-40 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-700 shadow-inner animate-pulse"></div>
                          </div>
                        );
                      } catch { return null; }
                    })()}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
      </div>
      {/* Scroll To Bottom - Floating Button */}
      <button
          onClick={() => {
            const el = scrollContainerRef.current;
            if (!el) return;
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setShowScrollButton(false);
          }}
          title={lang==='ar'?'إلى الأسفل':'Scroll to Bottom'}
          className={`fixed z-50 ${showScrollButton ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} transition-opacity hidden sm:block`}
          style={{ 
            bottom: `calc(var(--joe-input-h, 56px) + env(safe-area-inset-bottom, 0px) + ${(isBottomPanelOpen && isBottomCollapsed) ? 48 : 16}px)`,
            left: 'var(--joe-input-left, 16px)'
          }}
        >
          <span className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-yellow-600 text-black hover:bg-yellow-700 border border-yellow-600 shadow-lg">
            <FiArrowDown size={18} />
          </span>
        </button>
      </div>

      {/* Embedded Joe Screen Panel */}
      {showBrowserPanel && (
        <div className={(() => {
          const base = 'fixed z-50 bg-gray-900/98 border border-gray-800 rounded-xl shadow-2xl overflow-hidden';
          if (browserPanelMode === 'full') return base + ' inset-0';
          if (browserPanelMode === 'half') return base + ' top-0 right-0 h-full w-1/2';
          return base + ' bottom-4 right-4 w-[400px] h-[280px]';
        })()}>
          <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
            <div className="text-xs text-gray-300">{lang==='ar' ? 'شاشة جو المدمجة' : 'Embedded Joe Screen'}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setBrowserPanelMode('mini')} className="text-xs px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600">{lang==='ar' ? 'تصغير' : 'Mini'}</button>
              <button onClick={() => setBrowserPanelMode('half')} className="text-xs px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600">{lang==='ar' ? 'نصف الشاشة' : 'Half'}</button>
              <button onClick={() => setBrowserPanelMode('full')} className="text-xs px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600">{lang==='ar' ? 'ملء الشاشة' : 'Full'}</button>
              <button onClick={() => setShowBrowserPanel(false)} className="text-xs px-2 py-1 rounded-md bg-red-700 hover:bg-red-600 text-white border border-red-600">{lang==='ar' ? 'إغلاق' : 'Close'}</button>
            </div>
          </div>
          <div className="w-full h-full">
            <JoeScreen
              isProcessing={isProcessing}
              progress={progress}
              wsLog={[]}
              onTakeover={() => {}}
              onClose={() => setShowBrowserPanel(false)}
              initialUrl={browserInitialUrl}
            />
          </div>
        </div>
      )}
      

      {/* Conversations strip removed to avoid duplication with left SidePanel */}

      {/* Input Area - Fixed at Bottom, Centered and Spacious */}
      <div className="border-t border-gray-800 bg-gray-900/98 backdrop-blur-sm" ref={inputAreaRef}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-3">
            <div className={`flex items-end gap-3 bg-gray-900/90 border border-gray-700 rounded-2xl px-5 py-4 transition-all relative brand-ring ${dragActive ? 'ring-2 ring-yellow-500/70' : 'focus-within:ring-2 focus-within:ring-yellow-500'}`}
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setDragActive(false); }}
            onDrop={onDropFiles}
          >
            {dragActive && (
              <div className="absolute inset-0 rounded-2xl border-2 border-yellow-500/60 bg-yellow-500/5 flex items-center justify-center text-xs text-yellow-300 pointer-events-none">
                {lang==='ar' ? 'اسحب الملفات وافلت هنا' : 'Drop files here'}
              </div>
            )}
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                const composing = e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229;
                if (composing) return;
                if (e.key === 'Enter' && !e.shiftKey && typeof input === 'string' && input.trim()) {
                  e.preventDefault();
                  if (isProcessing) {
                    try { stopProcessing(); } catch { /* ignore */ }
                  }
                  handleSend();
                }
              }}
              placeholder="Message Joe... (Shift+Enter for new line)"
              className="flex-1 bg-transparent outline-none resize-none text-white placeholder-gray-500 text-sm leading-relaxed border border-gray-700 rounded-md px-3"
              rows={1}
              style={{ height: '42px', minHeight: '42px', maxHeight: '42px' }}
              
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              
              <div className="relative inline-flex items-center">
              <button 
                onClick={() => { okPulse('links','success'); fetchLinksFromInput(); }}
                className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
                disabled={isProcessing}
                title={lang==='ar'?'جلب الروابط من النص':'Fetch links from input'}
              >
                <FiLink size={14} />
              </button>
              {okKey==='links' && (<span className={`absolute -top-1 -right-1 text-[10px] px-1 py-0.5 rounded-full ${okKind==='toggle' ? 'bg-yellow-500 border-yellow-400' : 'bg-green-600 border-green-500'} text-black shadow-sm`}>✓</span>)}
              </div>
              <button
                onClick={() => { okPulse('github','toggle'); setShowGithub(v => !v); }}
                className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
                disabled={isProcessing}
                title={lang==='ar'?'لوحة GitHub':'GitHub Panel'}
              >
                <FiGitBranch size={14} />
              </button>
              <button
                onClick={() => { okPulse('gallery','toggle'); setShowGallery(v => { const next = !v; if (next) loadUploads(); return next; }); }}
                className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
                disabled={isProcessing}
                title={lang==='ar'?'معرض الصور':'Image Gallery'}
              >
                <FiImage size={14} />
              </button>
              <button
                onClick={() => { okPulse('builder','toggle'); setShowBuilder(v => !v); }}
                className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
                disabled={isProcessing}
                title={lang==='ar'?'بناء ذاتي':'Autonomous Build'}
              >
                <FiCompass size={14} />
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                multiple
                accept="*/*"
                className="hidden" 
              />
              
              <button 
                onClick={() => { okPulse('attach','success'); handleFileClick(); }} 
                className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700" 
                disabled={isProcessing}
                title="Attach File"
              >
                <FiPaperclip size={14} />
              </button>
              {uploadPct > 0 && uploadPct < 100 && (
                <span className="text-[10px] text-yellow-300">{uploadPct}%</span>
              )}
              
              <button 
                onClick={() => { okPulse('voice','toggle'); handleVoiceInput(); }} 
                className={`p-2 rounded-lg transition-colors ${
                  isListening 
                    ? 'text-red-500 bg-red-500/10 animate-pulse' 
                    : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700'
                }`}
                disabled={isProcessing}
                title="Voice Input"
              >
                <FiMic size={14} />
              </button>

              {isProcessing ? (
                <button 
                  onClick={() => { okPulse('stop','success'); stopProcessing(); }} 
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <FiStopCircle size={16} />
                  إيقاف
                </button>
              ) : (
                <button 
                  onClick={() => { okPulse('send','success'); handleSend(); }} 
                  disabled={!input.trim()} 
                  className="p-2 text-black bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Send Message"
                >
                  <FiSend size={16} />
                </button>
              )}
          </div>
        </div>
        {linkLoading && (
            <div className="absolute right-3 top-3 flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-yellow-300">{lang==='ar'?'جلب الروابط':'Fetching links'}</span>
            </div>
          )}
        {showGithub && (
            <div ref={ghPanelRef} className="absolute right-3 bottom-14 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-lg p-3">
              <p className="text-xs text-gray-300 mb-2">{lang==='ar'?'تحليل مستودع GitHub':'Analyze GitHub Repo'}</p>
              <input
                type="text"
                value={ghUrl}
                onChange={(e) => setGhUrl(e.target.value)}
                placeholder={lang==='ar'?'رابط المستودع':'Repository URL'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 mb-2"
              />
              <input
                type="password"
                value={ghToken}
                onChange={(e) => { setGhToken(e.target.value); try { localStorage.setItem('githubToken', e.target.value); } catch { void 0; } }}
                placeholder={lang==='ar'?'التوكن':'Token'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 mb-2"
              />
              <input
                type="text"
                value={ghBranch}
                onChange={(e) => setGhBranch(e.target.value)}
                placeholder={lang==='ar'?'الفرع (افتراضي main)':'Branch (default main)'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 mb-2"
              />
              <input
                type="text"
                value={ghCommitMessage}
                onChange={(e) => setGhCommitMessage(e.target.value)}
                placeholder={lang==='ar'?'رسالة الكومِت':'Commit message'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 mb-2"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowGithub(false)}
                  className="px-2 py-1 text-xs rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600"
                >
                  {lang==='ar'?'إلغاء':'Cancel'}
                </button>
                <button
                  onClick={handleGithubAnalyze}
                  className="px-2 py-1 text-xs rounded-lg bg-yellow-600 text-black hover:bg-yellow-700"
                >
                  {lang==='ar'?'استنساخ وتحليل':'Clone & Analyze'}
                </button>
                <button
                  onClick={handleGithubCommit}
                  className="px-2 py-1 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  {lang==='ar'?'كومِت':'Commit'}
                </button>
                <button
                  onClick={handleGithubPush}
                  className="px-2 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                  {lang==='ar'?'دفع':'Push'}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">{lang==='ar'?'للخاصة: يلزم GITHUB_TOKEN':'Private repos require GITHUB_TOKEN'}</p>
            </div>
          )}
        {showGallery && (
          <div ref={galleryPanelRef} className="absolute right-3 bottom-14 w-[480px] max-w-[92vw] bg-gray-900 border border-gray-700 rounded-xl shadow-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-300">{lang==='ar'?'مكتبة الصور':'Image Gallery'}</p>
              <button onClick={loadUploads} className="text-[11px] px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600">{lang==='ar'?'تحديث':'Refresh'}</button>
            </div>
            {uploadsLoading ? (
              <div className="flex items-center gap-2 text-xs text-yellow-300"><span className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />{lang==='ar'?'جاري التحميل':'Loading'}</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {uploads.length === 0 ? (
                  <div className="col-span-3 text-[12px] text-gray-500">{lang==='ar'?'لا توجد صور':'No images found'}</div>
                ) : (
                  uploads.map((it, i) => (
                    <div key={`${it.name}-${i}`} className="relative group border border-gray-700 rounded-md overflow-hidden">
                      <img src={it.absoluteUrl} alt={it.name} className="w-full h-28 object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gray-900/70 text-[11px] text-gray-300 px-2 py-1 truncate">{it.name}</div>
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleCopyUrl(it.absoluteUrl)} className="p-1 rounded bg-gray-800 text-gray-200 hover:bg-gray-700" title={lang==='ar'?'نسخ الرابط':'Copy URL'}><FiCopy size={12} /></button>
                        <button onClick={() => handleDeleteUpload(it.name)} className="p-1 rounded bg-red-700 text-white hover:bg-red-800" title={lang==='ar'?'حذف':'Delete'}><FiTrash2 size={12} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        {showBuilder && (
          <div className="absolute right-3 bottom-14 w-[320px] bg-gray-900 border border-gray-700 rounded-xl shadow-lg p-3">
            <p className="text-xs text-gray-300 mb-2">{lang==='ar'?'إنشاء ونشر مشروع':'Create & Deploy Project'}</p>
            <textarea
              value={builderDescription}
              onChange={(e) => setBuilderDescription(e.target.value)}
              placeholder={lang==='ar'?'وصف المشروع (الوظائف والمتطلبات)':'Project description (features & requirements)'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 mb-2 resize-y"
              rows={3}
            />
            <input
              type="text"
              value={builderRepoName}
              onChange={(e) => setBuilderRepoName(e.target.value)}
              placeholder={lang==='ar'?'اسم المستودع':'Repository name'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 mb-2"
            />
            <select
              value={builderProjectType}
              onChange={(e) => setBuilderProjectType(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white mb-2"
            >
              <option value="page">{lang==='ar'?'صفحة/واجهة':'Page/UI'}</option>
              <option value="app">{lang==='ar'?'تطبيق':'App'}</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBuilder(false)}
                className="px-2 py-1 text-xs rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600"
              >
                {lang==='ar'?'إلغاء':'Cancel'}
              </button>
              <button
                onClick={handleCreateAndDeploy}
                className="px-2 py-1 text-xs rounded-lg bg-yellow-600 text-black hover:bg-yellow-700 disabled:opacity-60"
                disabled={builderLoading}
              >
                {builderLoading ? (lang==='ar'?'جاري...':'Working...') : (lang==='ar'?'إنشاء ونشر':'Create & Deploy')}
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">{lang==='ar'?'يتطلب صلاحيات ADMIN':'Requires ADMIN role'}</p>
          </div>
        )}
          
        {/* Robot moved to Joe page and enhanced */}
      </div>
      {/* Reconnect Mini Chip - Fixed at bottom-right */}
      {(!wsConnected && reconnectActive) && (
        <div className="fixed right-6 z-50 select-none pointer-events-none" style={{ bottom: Math.max(12, inputAreaHeight + 12) }}>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900/85 border border-yellow-500/40 shadow-lg backdrop-blur-sm">
            <span className="text-[10px] font-medium text-yellow-300">
              {lang==='ar' ? 'إعادة الاتصال' : 'Reconnect'} {Math.ceil((reconnectRemainingMs||0)/1000)}s
            </span>
            <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-500 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, 100 - ((reconnectRemainingMs||0) / Math.max(1, reconnectDelayMs||1))*100))}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400">#{reconnectAttempt}</span>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default MainConsole;
MainConsole.propTypes = {
  isBottomPanelOpen: PropTypes.bool,
  isBottomCollapsed: PropTypes.bool,
};
