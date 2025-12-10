import React, { useEffect, useRef, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import { FiMic, FiPaperclip, FiSend, FiStopCircle, FiCompass, FiArrowDown, FiLink, FiGitBranch, FiImage, FiTrash2, FiCopy } from 'react-icons/fi';
import { useJoeChatContext } from '../../context/JoeChatContext.jsx';
import apiClient from '../../api/client';
import { getSystemStatus, listUserUploads, deleteUserUpload } from '../../api/system';
import Hls from 'hls.js';

 

const MainConsole = ({ isBottomPanelOpen, isBottomCollapsed }) => {
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const contentRef = useRef(null);
  const showScrollRef = useRef(false);
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const [isUserPinned, setIsUserPinned] = React.useState(false);
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
  
  const galleryPanelRef = useRef(null);
  const [viewMode, setViewMode] = React.useState('chat');
  const [expandedIds, setExpandedIds] = React.useState(new Set());

  

  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => {
      try {
        const height = Number(vv?.height || 0);
        const offsetTop = Number(vv?.offsetTop || 0);
        const total = Number(window.innerHeight || height);
        const keyboard = Math.max(0, total - height - offsetTop);
        document.documentElement.style.setProperty('--joe-keyboard-offset', `${keyboard}px`);
      } catch { /* noop */ }
    };
    update();
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update, { passive: true });
    } else {
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, { passive: true });
    }
    return () => {
      try { vv?.removeEventListener('resize', update); } catch { /* noop */ }
      try { vv?.removeEventListener('scroll', update); } catch { /* noop */ }
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
  }, []);

  const { 
    messages, isProcessing, progress, 
    input, setInput, isListening, handleSend, stopProcessing,
    handleVoiceInput, transcript, currentConversation,
    wsConnected, reconnectActive, reconnectAttempt, reconnectRemainingMs, reconnectDelayMs,
    plan
  } = useJoeChatContext();

  const autoRunsRef = useRef(0);
  useEffect(() => {
    try {
      const hasPlan = Array.isArray(plan) && plan.length > 0;
      if (!isProcessing && hasPlan && autoRunsRef.current < 3) {
        setInput('تابع تنفيذ المهمة حتى الإتمام، افحص قائمة المهام غير المنجزة وأكملها تلقائيًا، ثم اعرض النتائج النهائية بشكل صحيح ومنسق.');
        handleSend();
        autoRunsRef.current += 1;
      }
    } catch { /* noop */ }
  }, [isProcessing, plan.length]);

  const StyledJoe = ({ className = '' }) => {
    const isRTL = (lang === 'ar');
    return (
      <bdi dir={isRTL ? 'rtl' : undefined} style={{ unicodeBidi: 'isolate', display: 'inline-flex' }} className={`mx-1 inline-flex items-baseline font-semibold tracking-wide text-gray-100 ${className}`}>
        <span>J</span>
        <span>o</span>
        <span className="text-yellow-500">e</span>
      </bdi>
    );
  };
  StyledJoe.propTypes = { className: PropTypes.string };

  const SmartImage = ({ src, alt = 'image' }) => {
    const [ok, setOk] = React.useState(false);
    React.useEffect(() => {
      let cancelled = false;
      try {
        const img = new Image();
        img.onload = () => { if (!cancelled) setOk(true); };
        img.onerror = () => { if (!cancelled) setOk(false); };
        img.src = src;
      } catch { setOk(false); }
      return () => { cancelled = true; };
    }, [src]);
    if (!ok) return null;
    return (
      <img src={src} alt={alt} className="max-h-56 rounded-lg border border-gray-700" />
    );
  };
  SmartImage.propTypes = { src: PropTypes.string.isRequired, alt: PropTypes.string };

  const HlsVideo = ({ src }) => {
    const ref = React.useRef(null);
    React.useEffect(() => {
      const video = ref.current;
      if (!video) return;
      let hls;
      try {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = src;
        } else if (Hls.isSupported()) {
          hls = new Hls({ maxBufferLength: 10 });
          hls.loadSource(src);
          hls.attachMedia(video);
        } else {
          video.src = src;
        }
      } catch { /* noop */ }
      return () => { try { hls?.destroy(); } catch { /* noop */ } };
    }, [src]);
    return <video ref={ref} controls className="max-h-64 w-full rounded-lg border border-gray-700 bg-black" />;
  };
  HlsVideo.propTypes = { src: PropTypes.string.isRequired };

  const JoeBadge = ({ size = 'sm', state = 'ready' }) => {
    const px = size === 'lg' ? 52 : (size === 'md' ? 40 : 28);
    const gradId = React.useMemo(() => `joeHexGrad-${Math.random().toString(36).slice(2)}`, []);
    const hatGradId = React.useMemo(() => `joeHatGrad-${Math.random().toString(36).slice(2)}`, []);
    const palette = (() => {
      if (state === 'offline') return ['#9ca3af', '#6b7280', '#374151'];
      if (state === 'ready') return ['#fde047', '#f59e0b', '#eab308'];
      return ['#f87171', '#ef4444', '#dc2626'];
    })();
    const strokeColor = palette[2];
    return (
      <span className="inline-flex items-center justify-center" style={{ width: px, height: px }}>
        <svg viewBox="0 0 64 64" width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={palette[0]} />
              <stop offset="60%" stopColor={palette[1]} />
              <stop offset="100%" stopColor={palette[2]} />
            </linearGradient>
            <linearGradient id={hatGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="23" fill="none" stroke={`url(#${gradId})`} strokeWidth="3">
            {state !== 'offline' && (<animate attributeName="stroke-opacity" values="1;0.85;1" dur="3s" repeatCount="indefinite" />)}
          </circle>
          <rect x="17" y="17" width="30" height="30" rx="12" fill="#0b1220" opacity="0.95" />
          <g>
            <ellipse cx="28" cy="32" rx="4.5" ry="3" fill="#ffffff">
              <animate attributeName="ry" values="3;1.2;3" dur="2.6s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="36" cy="32" rx="4.5" ry="3" fill="#ffffff">
              <animate attributeName="ry" values="3;1.2;3" dur="2.6s" begin="0.6s" repeatCount="indefinite" />
            </ellipse>
            <circle cx="28" cy="32" r="1.5" fill={strokeColor}>
              <animate attributeName="cx" values="27.6;28.4;27.6" dur="2.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="36" cy="32" r="1.5" fill={strokeColor}>
              <animate attributeName="cx" values="35.6;36.4;35.6" dur="2.2s" begin="0.4s" repeatCount="indefinite" />
            </circle>
          </g>
          <g>
            <ellipse cx="32" cy="20" rx="12" ry="5" fill={`url(#${hatGradId})`} opacity="0.95">
              <animateTransform attributeName="transform" type="rotate" values="0 32 20;1.5 32 20;0 32 20;-1.5 32 20;0 32 20" dur="6s" repeatCount="indefinite" />
            </ellipse>
            <rect x="22" y="22" width="20" height="2.5" rx="1.25" fill="#eab308" />
          </g>
        </svg>
      </span>
    );
  };
  JoeBadge.propTypes = { size: PropTypes.oneOf(['sm','md','lg']), state: PropTypes.oneOf(['ready','thinking','typing','deploy','offline']) };

  const lastContent = messages[messages.length - 1]?.content || '';
  const lastScrollHeightRef = useRef(0);
  const lastScrollTopRef = useRef(0);
  
  const runWithAutoScroll = (fn) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const prevBehavior = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    try { fn(el); } finally { el.style.scrollBehavior = prevBehavior || 'smooth'; }
  };

  function checkScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 160;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    const nextShow = !atBottom;
    showScrollRef.current = nextShow;
    if (showScrollButton !== nextShow) setShowScrollButton(nextShow);
    if (isUserPinned !== nextShow) setIsUserPinned(nextShow);
    lastScrollTopRef.current = el.scrollTop;
    lastScrollHeightRef.current = el.scrollHeight;
  }

  const scrollToBottomIfNeeded = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance <= 20;
    if (!atBottom) return;
    requestAnimationFrame(() => {
      runWithAutoScroll((node) => { node.scrollTop = node.scrollHeight; });
      setShowScrollButton(false);
    });
  };
  
  const prevMsgCountRef = useRef(messages.length);
  const lastSenderRef = useRef(messages[messages.length - 1]?.type);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const prevH = lastScrollHeightRef.current || el.scrollHeight;
    const prevTop = lastScrollTopRef.current || el.scrollTop;
    const prevDistance = prevH - prevTop - el.clientHeight;
    const wasAtBottom = prevDistance <= 20;
    requestAnimationFrame(() => {
      const newH = el.scrollHeight;
      const delta = newH - prevH;
      if (!wasAtBottom && delta > 0) {
        runWithAutoScroll((node) => { node.scrollTop = prevTop + delta; });
      } else if (wasAtBottom) {
        runWithAutoScroll((node) => { node.scrollTop = node.scrollHeight; });
        setShowScrollButton(false);
      }
      lastScrollHeightRef.current = el.scrollHeight;
      lastScrollTopRef.current = el.scrollTop;
    });
  }, [messages.length, lastContent, inputAreaHeight, isUserPinned]);

  // لا تفرض النزول عند تبديل المحادثة؛ يظل السلوك حرًا
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // تحديث مؤشر الزر فقط
    checkScroll();
  }, [currentConversation]);

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const last = messages[messages.length - 1];
      const lastType = last?.type;
      // لا ننزل تلقائيًا إلا عند إدخال المستخدم لرسالة جديدة
      if (!isUserPinned && lastType === 'user') {
        requestAnimationFrame(() => {
          const el = scrollContainerRef.current;
          if (!el) return;
          runWithAutoScroll((node) => { node.scrollTop = node.scrollHeight; });
          setShowScrollButton(false);
        });
      }
      prevMsgCountRef.current = messages.length;
      lastSenderRef.current = lastType;
    }
  }, [messages, isUserPinned]);

  // عند التحديث/إعادة التحميل الأولي: انزل مرة واحدة إلى أسفل
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      runWithAutoScroll((node) => { node.scrollTop = node.scrollHeight; });
      setShowScrollButton(false);
    });
  }, []);

  

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
    try {
      const ev = new CustomEvent(showGithub ? 'joe:overlay:open' : 'joe:overlay:close', { detail: { source: 'githubPanel', open: showGithub } });
      window.dispatchEvent(ev);
    } catch { /* noop */ }
  }, [showGithub]);

  useEffect(() => {
    try {
      const ev = new CustomEvent(showGallery ? 'joe:overlay:open' : 'joe:overlay:close', { detail: { source: 'galleryPanel', open: showGallery } });
      window.dispatchEvent(ev);
    } catch { /* noop */ }
  }, [showGallery]);

  

  

  

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

  

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    // initial check
    checkScroll();
    return () => el.removeEventListener('scroll', checkScroll);
  }, []);

  useEffect(() => {
    const sc = scrollContainerRef.current;
    const target = contentRef.current;
    if (!sc || !target) return;
    const ro = new ResizeObserver(() => {
      const prevH = lastScrollHeightRef.current || sc.scrollHeight;
      const prevTop = lastScrollTopRef.current || sc.scrollTop;
      const prevDistance = prevH - prevTop - sc.clientHeight;
      const wasAtBottom = prevDistance <= 20;
      const newH = sc.scrollHeight;
      const delta = newH - prevH;
      if (!wasAtBottom && delta > 0) {
        runWithAutoScroll((node) => { node.scrollTop = prevTop + delta; });
      } else if (wasAtBottom && !isUserPinned) {
        runWithAutoScroll((node) => { node.scrollTop = node.scrollHeight; });
        setShowScrollButton(false);
      }
      lastScrollHeightRef.current = sc.scrollHeight;
      lastScrollTopRef.current = sc.scrollTop;
    });
    ro.observe(target);
    lastScrollHeightRef.current = sc.scrollHeight;
    lastScrollTopRef.current = sc.scrollTop;
    return () => { try { ro.disconnect(); } catch { /* ignore */ } };
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
    <div className="flex flex-col h-screen min-w-0 w-full bg-gray-900">
      <div className="flex items-center justify-end px-4 md:px-8 py-2 border-b border-gray-800"></div>
      {viewMode === 'agent' ? (
        <div className="flex-1 flex gap-4">
          <div className="w-1/5 border-r border-gray-800 p-3 space-y-3">
            <div className="text-sm text-gray-300">لوحة التحكم</div>
            <div className="p-2 rounded-lg bg-gray-800 border border-gray-700">
              <div className="flex items-center gap-2">
                {(() => { const hasThought = Array.isArray(plan) && plan.slice(-5).some(s => s?.type === 'thought'); const hasDeploy = Array.isArray(plan) && plan.slice(-5).some(s => { const t = String(s?.type||'').toLowerCase(); const txt = String(s?.title||s?.step||s?.content||''); return t==='deploy' || /deploy|push|publish|run|execute|start/i.test(txt); }); const badgeState = !wsConnected ? 'offline' : (isProcessing ? (hasDeploy ? 'deploy' : (hasThought ? 'thinking' : 'typing')) : 'ready'); return (<JoeBadge size="lg" state={badgeState} />); })()}
                <div>
                  <div className="text-xs text-gray-200"><StyledJoe /> Agent</div>
                  <div className={`text-[11px] ${wsConnected? 'text-green-300':'text-red-300'}`}>{wsConnected? (lang==='ar'?'متصل':'Online') : (lang==='ar'?'غير متصل':'Offline')}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-1/2 p-3 overflow-y-auto">
            <div className="text-sm text-gray-300 mb-2">سجل النشاط</div>
            <div className="space-y-3">
              {Array.isArray(plan) && plan.map((ev, i)=>{
                const t = String(ev?.type||'').toLowerCase();
                const title = t==='thought' ? (lang==='ar'?'تفكير':'Thought') : (t==='action'? (lang==='ar'?'إجراء':'Action') : (t==='observation' ? (lang==='ar'?'ملاحظة':'Observation') : (lang==='ar'?'أداة':'Tool')));
                const bgCls = t==='thought' ? 'bg-[#f7f7f7] text-gray-900' : (t==='action' ? 'bg-[#fff3cd] text-gray-900' : (t==='observation' ? 'bg-[#e7f3ff] text-gray-900' : 'bg-gray-900 text-gray-200'));
                const leftBorderCls = t==='thought' ? 'border-l-4 border-l-gray-500' : (t==='action' ? 'border-l-4 border-l-yellow-400' : (t==='observation' ? 'border-l-4 border-l-blue-600' : 'border-l border-gray-700'));
                const badgeCls = t==='thought' ? 'bg-gray-600 text-white' : (t==='action' ? 'bg-yellow-500 text-black' : (t==='observation' ? 'bg-blue-600 text-white' : 'bg-gray-500 text-black'));
                const details = ev?.details || {};
                const summary = String(details?.summary || '').trim();
                const ms = typeof details?.ms === 'number' ? `${details.ms}ms` : '';
                const args = details?.args || ev?.details || null;
                const argsText = (()=>{ try { if (!args) return ''; const keys = Object.keys(args); if (!keys.length) return ''; return keys.slice(0,3).map(k=>`${k}=${typeof args[k]==='string'?args[k]:JSON.stringify(args[k]).slice(0,60)}`).join(' ');} catch { return ''; } })();
                return (
                  <div key={`ev-${i}`} className={`rounded-xl p-3 ${bgCls} ${leftBorderCls}`}> 
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${badgeCls} text-xs font-bold`}>{title[0]}</span>
                        <div className="text-xs">{title}</div>
                      </div>
                      {ms && <div className="text-[11px] text-gray-600">{ms}</div>}
                    </div>
                    <div className="mt-2 text-sm break-words">{String(ev?.content||'').trim() || String(ev?.tool || '').trim()}</div>
                    {argsText && <div className="mt-1 text-[11px] text-gray-700">{argsText}</div>}
                    {summary && <div className="mt-1 text-[12px] text-gray-700">{summary}</div>}
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef} style={{ scrollBehavior: 'smooth', overscrollBehavior: 'contain', overflowAnchor: 'none' }}>
        <div ref={contentRef} className="max-w-5xl mx-auto px-4 md:px-8 py-8 rounded-3xl ring-1 ring-gray-700/50 bg-gray-900/40 backdrop-blur-sm shadow-xl" style={{ paddingBottom: Math.max(24, inputAreaHeight + 24) }}>
          {(() => {
            const hasActivity = (messages && messages.length > 0) || isProcessing || (Array.isArray(plan) && plan.length > 0);
            if (!hasActivity) {
              return (
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-base md:text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-500">JOE</div>
                    <p className="mt-1 text-[10px] md:text-[11px] text-gray-300">{lang==='ar' ? 'شريكك الذكي لبناء وتحليل وتنفيذ المشاريع التقنية.' : 'Your intelligent partner to build, analyze, and execute tech.'}</p>
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 ${lang==='ar'?'text-right':'text-left'}`} style={{ direction: lang==='ar'?'rtl':'ltr' }}>
                    <div className="p-2 rounded-2xl bg-gray-900/60 border border-gray-800 shadow">
                      <div className="text-[10px] font-semibold text-yellow-300"><bdi dir={lang==='ar'? 'ltr': undefined} style={{ unicodeBidi: 'isolate' }}>Code & Systems Builder</bdi></div>
                      <p className="mt-0.5 text-[10px] text-gray-300">يبني تطبيقات وخدمات كاملة من الفكرة حتى النشر.</p>
                    </div>
                    <div className="p-2 rounded-2xl bg-gray-900/60 border border-gray-800 shadow">
                      <div className="text-[10px] font-semibold text-yellow-300"><bdi dir={lang==='ar'? 'ltr': undefined} style={{ unicodeBidi: 'isolate' }}>Smart Debugger</bdi></div>
                      <p className="mt-0.5 text-[10px] text-gray-300">يتتبّع مشاكل الأداء والـ CORS والـ WebSocket ويقترح إصلاحات واضحة.</p>
                    </div>
                    <div className="p-2 rounded-2xl bg-gray-900/60 border border-gray-800 shadow">
                      <div className="text-[10px] font-semibold text-yellow-300">📚 <bdi dir={lang==='ar'? 'ltr': undefined} style={{ unicodeBidi: 'isolate' }}>Repo & Docs Navigator</bdi></div>
                      <p className="mt-0.5 text-[10px] text-gray-300">يتصفّح المستودعات، يفهم بنية المشروع ويولّد تقارير منظمة.</p>
                    </div>
                    <div className="p-2 rounded-2xl bg-gray-900/60 border border-gray-800 shadow">
                      <div className="text-[10px] font-semibold text-yellow-300">🤖 <bdi dir={lang==='ar'? 'ltr': undefined} style={{ unicodeBidi: 'isolate' }}>Automation & Agents Orchestrator</bdi></div>
                      <p className="mt-0.5 text-[10px] text-gray-300">يؤتمت المهام ويُنسّق العوامل الذكية داخل مشروعك بسلاسة.</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="inline-block px-2.5 py-1 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black text-[10px]">{lang==='ar'?'ابدأ برسالة لـ Joe هنا':'Start by typing a message to Joe'}</span>
                  </div>
                </div>
              );
            }
            return (
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-base md:text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-500">JOE</div>
                  <p className="mt-1 text-[10px] md:text-[11px] text-gray-300">{lang==='ar' ? 'شريكك الذكي لبناء وتحليل وتنفيذ المشاريع التقنية.' : 'Your intelligent partner to build, analyze, and execute tech.'}</p>
                </div>
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 ${lang==='ar'?'text-right':'text-left'}`} style={{ direction: lang==='ar'?'rtl':'ltr' }}>
                  <div className="p-2 rounded-2xl bg-gray-900/60 border border-gray-800 shadow">
                    <div className="text-[10px] font-semibold text-yellow-300"><bdi dir={lang==='ar'? 'ltr': undefined} style={{ unicodeBidi: 'isolate' }}>Code & Systems Builder</bdi></div>
                    <p className="mt-0.5 text-[10px] text-gray-300">يبني تطبيقات وخدمات كاملة من الفكرة حتى النشر.</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-gray-900/60 border border-gray-800 shadow">
                    <div className="text-[10px] font-semibold text-yellow-300"><bdi dir={lang==='ar'? 'ltr': undefined} style={{ unicodeBidi: 'isolate' }}>Smart Debugger</bdi></div>
                    <p className="mt-0.5 text-[10px] text-gray-300">يتتبّع مشاكل الأداء والـ CORS والـ WebSocket ويقترح إصلاحات واضحة.</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-gray-900/60 border border-gray-800 shadow">
                    <div className="text-[10px] font-semibold text-yellow-300">📚 <bdi dir={lang==='ar'? 'ltr': undefined} style={{ unicodeBidi: 'isolate' }}>Repo & Docs Navigator</bdi></div>
                    <p className="mt-0.5 text-[10px] text-gray-300">يتصفّح المستودعات، يفهم بنية المشروع ويولّد تقارير منظمة.</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-gray-900/60 border border-gray-800 shadow">
                    <div className="text-[10px] font-semibold text-yellow-300">🤖 <bdi dir={lang==='ar'? 'ltr': undefined} style={{ unicodeBidi: 'isolate' }}>Automation & Agents Orchestrator</bdi></div>
                    <p className="mt-0.5 text-[10px] text-gray-300">يؤتمت المهام ويُنسّق العوامل الذكية داخل مشروعك بسلاسة.</p>
                  </div>
                </div>
              {(() => {
                const ordered = [...messages].sort((a, b) => {
                  const ta = typeof a.createdAt === 'number' ? a.createdAt : 0;
                  const tb = typeof b.createdAt === 'number' ? b.createdAt : 0;
                  if (ta !== tb) return ta - tb;
                  const wa = a.type === 'user' ? 0 : 1;
                  const wb = b.type === 'user' ? 0 : 1;
                  return wa - wb;
                });
                const orderedDedup = ordered.filter((m, i) => {
                  if (i === 0) return true;
                  const prev = ordered[i - 1];
                  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
                  const sameType = prev.type === m.type;
                  const sameText = norm(prev.content) === norm(m.content);
                  const dt = Math.abs(Number(m.createdAt || 0) - Number(prev.createdAt || 0));
                  return !(sameType && sameText && dt <= 2000);
                });
                const coalesced = [];
                for (const m of orderedDedup) {
                  const last = coalesced[coalesced.length - 1];
                  const dt = Math.abs(Number(m.createdAt || 0) - Number(last?.createdAt || 0));
                  const sameSender = !!(last && last.type === m.type);
                  const isJoe = String(m.type || '') !== 'user';
                  const sCurr = String(m.content || '');
                  const sPrev = String(last?.content || '');
                  const similar = sameSender && isJoe && dt <= 3000 && (sCurr.startsWith(sPrev) || sPrev.startsWith(sCurr));
                  if (similar) {
                    const longer = sCurr.length >= sPrev.length ? sCurr : sPrev;
                    const merged = { ...m, content: longer, id: m.id || last.id, createdAt: Math.max(Number(m.createdAt || 0), Number(last.createdAt || 0)) };
                    coalesced[coalesced.length - 1] = merged;
                  } else {
                    coalesced.push(m);
                  }
                }
                const renderContent = (text) => {
                  const t = String(text || '');
                  const urlRe = /((https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s)]+)?)/gi;
                  const brands = ['google','جوجل','غوغل','youtube','يوتيوب','facebook','فيسبوك','instagram','انستقرام','tiktok','تيك توك','twitter','x','snapchat','سناب شات','linkedin','لينكدان','netflix','نيتفلكس','amazon','أمازون','apple','آبل','microsoft','مايكروسوفت','github','جيت هب','gitlab','جيت لاب','stackoverflow','ستاك أوفر فلو'];
                  const brandPattern = new RegExp(`\\b(?:${brands.map(b=>b.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')).join('|')})\\b`,'gi');
                  const isRTL = (lang === 'ar');
                  const renderRich = (s) => {
                    const parts = [];
                    let lastIndex = 0;
                    let m;
                    while ((m = urlRe.exec(s)) !== null) {
                      const i = m.index;
                      const raw = m[0];
                      const hasScheme = !!m[2];
                      const target = hasScheme ? raw : `https://${raw}`;
                      if (i > lastIndex) parts.push(s.slice(lastIndex, i));
                      parts.push({ href: target, display: raw });
                      lastIndex = i + raw.length;
                    }
                    if (lastIndex < s.length) parts.push(s.slice(lastIndex));
                    const renderEnglish = (text) => {
                      if (!isRTL) return [text];
                      const s2 = String(text || '');
                      const nodes = [];
                      let last = 0;
                      let mm;
                      const re = /[A-Za-z][A-Za-z0-9@#._-]*/g;
                      while ((mm = re.exec(s2)) !== null) {
                        const i = mm.index;
                        if (i > last) nodes.push(s2.slice(last, i));
                        nodes.push(<bdi key={`ltr-${i}`} dir="ltr" style={{ unicodeBidi: 'isolate', display: 'inline-block' }}>{mm[0]}</bdi>);
                        last = i + mm[0].length;
                      }
                      if (last < s2.length) nodes.push(s2.slice(last));
                      return nodes;
                    };
                    const renderBrands = (str) => {
                      const nodes = [];
                      let idx = 0;
                      let mm;
                      const input = String(str || '');
                      const renderJoe = (chunk) => {
                        const out = [];
                        const re = /\bJoe\b/g;
                        let li = 0;
                        let nm;
                        while ((nm = re.exec(chunk)) !== null) {
                          const i = nm.index;
                          if (i > li) {
                            const seg = renderEnglish(chunk.slice(li, i));
                            for (const n of seg) out.push(n);
                          }
                          out.push(<StyledJoe key={`joe-${i}`} />);
                          li = i + nm[0].length;
                        }
                        if (li < chunk.length) {
                          const seg = renderEnglish(chunk.slice(li));
                          for (const n of seg) out.push(n);
                        }
                        return out;
                      };
                      while ((mm = brandPattern.exec(input)) !== null) {
                        const i = mm.index;
                        const w = mm[0];
                        if (i > idx) {
                          const pre = renderJoe(input.slice(idx, i));
                          for (const p of pre) nodes.push(p);
                        }
                        nodes.push(
                          <a
                            key={`brand-${i}-${w}`}
                            href="#"
                            onClick={(e) => { e.preventDefault(); try { window.dispatchEvent(new CustomEvent('joe:open-browser', { detail: { searchQuery: w } })); } catch { /* noop */ } }}
                            className="underline text-blue-400"
                            dir={isRTL ? 'ltr' : undefined}
                            style={{ unicodeBidi: 'isolate', display: 'inline-block' }}
                          >
                            {w}
                          </a>
                        );
                        idx = i + w.length;
                      }
                      if (idx < input.length) {
                        const tail = renderJoe(input.slice(idx));
                        for (const t of tail) nodes.push(t);
                      }
                      return nodes;
                    };
                    return parts.map((p, i) => typeof p === 'string' ? renderBrands(p) : (
                      <a
                        key={`lnk-${i}`}
                        href={p.href}
                        onClick={(e) => { e.preventDefault(); try { window.dispatchEvent(new CustomEvent('joe:open-browser', { detail: { url: p.href } })); } catch { /* noop */ } }}
                        className="underline text-yellow-400 break-all"
                        dir={isRTL ? 'ltr' : undefined}
                        style={{ unicodeBidi: 'isolate', display: 'inline-block' }}
                      >
                        {p.display || p.href}
                      </a>
                    ));
                  };
                  const segments = [];
                  const codeRe = /```([\s\S]*?)```/g;
                  let last = 0;
                  let cm;
                  while ((cm = codeRe.exec(t)) !== null) {
                    const i = cm.index;
                    if (i > last) segments.push({ type: 'text', content: t.slice(last, i) });
                    segments.push({ type: 'code', content: cm[1] });
                    last = i + cm[0].length;
                  }
                  if (last < t.length) segments.push({ type: 'text', content: t.slice(last) });
                  const rawUrlsAll = (t.match(/https?:\/\/[^\s)]+/g) || []);
                  const extImgs = rawUrlsAll.filter(u => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(u));
                  const mdBangBacktick = Array.from(t.matchAll(/!\s*`(https?:\/\/[^\s`]+)`/g)).map(m => m[1]);
                  const mdImage = Array.from(t.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g)).map(m => m[1]);
                  const bangPlain = Array.from(t.matchAll(/!\s*(https?:\/\/\S+)/g)).map(m => m[1]);
                  const whitelistHosts = ['via.placeholder.com','placekitten.com','picsum.photos','images.unsplash.com'];
                  const hostImgs = rawUrlsAll.filter(u => { try { const h = new URL(u).hostname; return whitelistHosts.includes(h); } catch { return false; } });
                  const imageUrls = Array.from(new Set([...extImgs, ...mdBangBacktick, ...mdImage, ...bangPlain, ...hostImgs]));
                  const rawVideoAll = rawUrlsAll;
                  const extVideos = rawVideoAll.filter(u => /\.(mp4|webm|ogg)(\?|$)/i.test(u));
                  const mdVideo = Array.from(t.matchAll(/!video\[[^\]]*\]\((https?:\/\/[^)]+)\)/gi)).map(m => m[1]);
                  const bangVideo = Array.from(t.matchAll(/!video\s*(https?:\/\/\S+)/gi)).map(m => m[1]);
                  const videoWhitelist = ['cdn.discordapp.com','cdn.jsdelivr.net','storage.googleapis.com'];
                  const hostVideos = rawVideoAll.filter(u => { try { const h = new URL(u).hostname; return videoWhitelist.includes(h); } catch { return false; } });
                  const videoUrls = Array.from(new Set([...extVideos, ...mdVideo, ...bangVideo, ...hostVideos]));
                  return (
                    <>
                      {segments.map((seg, idx) => seg.type === 'code' ? (
                        <div key={`blk-${idx}`} className="mt-2">
                          <div className="relative group">
                            <pre className="bg-gray-900/70 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 text-[12px] overflow-x-auto shadow-inner" style={{ direction: 'ltr', textAlign: 'left' }}><code>{seg.content}</code></pre>
                            <button
                              onClick={() => { try { navigator.clipboard.writeText(seg.content); } catch { /* noop */ } }}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-0 text-gray-300 hover:text-gray-100"
                              title={lang==='ar' ? 'نسخ' : 'Copy'}
                            >
                              <FiCopy size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        String(seg.content || '')
                          .replace(/!\s*`https?:\/\/[^\s`]+`/g,'')
                          .replace(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g,'')
                          .replace(/!\s*https?:\/\/\S+/g,'')
                          .split(/\n{2,}/)
                          .map((para, pi) => {
                          const lines = String(para).split(/\n/);
                          const isBullets = lines.every(l => /^\s*(-|•)\s+/.test(l)) && lines.length > 1; const isNumbers = lines.every(l => /^\s*\d+\.\s+/.test(l)) && lines.length > 1; const isHeading = /^\s*#{1,3}\s+/.test(lines[0]) && lines.length === 1;
                          return isHeading ? (
                            (() => { const m = lines[0].match(/^(\s*#{1,3})\s+(.*)$/); const lvl = m && m[1] ? (m[1].trim().length) : 1; const txt = m ? m[2] : lines[0].replace(/^\s*#+\s+/, ''); const size = lvl === 1 ? 'text-2xl md:text-3xl' : (lvl === 2 ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'); return (<div key={`hd-${idx}-${pi}`} className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`} style={{ direction: isRTL ? 'rtl' : 'ltr', unicodeBidi: 'plaintext' }}><div className={`${size} font-extrabold tracking-tight text-yellow-300`}>{renderRich(txt)}</div></div>); })()
                          ) : isBullets ? (
                            <ul key={`ul-${idx}-${pi}`} className={`text-sm md:text-base leading-relaxed list-disc ${isRTL ? 'pr-5 text-right' : 'pl-5 text-left'} text-gray-200`} style={{ direction: isRTL ? 'rtl' : 'ltr', unicodeBidi: 'plaintext' }}>
                              {lines.map((l, li) => (
                                <li key={`li-${idx}-${pi}-${li}`}>{renderRich(l.replace(/^\s*(-|•)\s+/, ''))}</li>
                              ))}
                            </ul>
                          ) : isNumbers ? (
                            <ol key={`ol-${idx}-${pi}`} className={`text-sm md:text-base leading-relaxed list-decimal ${isRTL ? 'pr-5 text-right' : 'pl-5 text-left'} text-gray-200`} style={{ direction: isRTL ? 'rtl' : 'ltr', unicodeBidi: 'plaintext' }}>
                              {lines.map((l, li) => (
                                <li key={`oli-${idx}-${pi}-${li}`}>{renderRich(l.replace(/^\s*\d+\.\s+/, ''))}</li>
                              ))}
                            </ol>
                          ) : (
                            <p key={`p-${idx}-${pi}`} className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words text-gray-200 ${isRTL ? 'text-right' : 'text-left'}`} style={{ direction: isRTL ? 'rtl' : 'ltr', unicodeBidi: 'plaintext' }}>
                              {renderRich(para)}
                            </p>
                          );
                        })
                      ))}
                      {imageUrls.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {imageUrls.slice(0, 4).map((src, i) => (
                            <div key={`img-${i}`} className="block">
                              <SmartImage src={src} alt="image" />
                            </div>
                          ))}
                        </div>
                      )}
                      {videoUrls.length > 0 && (
                        <div className="mt-3 flex flex-col gap-3">
                          {videoUrls.slice(0, 2).map((src, i) => (
                            <div key={`vid-${i}`} className="w-full">
                              {/\.m3u8(\?|$)/i.test(src) ? (
                                <HlsVideo src={src} />
                              ) : (
                                <video src={src} controls className="max-h-64 w-full rounded-lg border border-gray-700 bg-black" preload="metadata" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                };
                return coalesced.map((msg, index) => (
                  <div 
                    key={msg.id || `${msg.createdAt||0}-${index}`} 
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} items-start gap-3 mb-4`}
                  >
                    {msg.type !== 'user' && (
                      <span className="mt-1">
                        {(() => { const hasThought = Array.isArray(plan) && plan.slice(-5).some(s => s?.type === 'thought'); const badgeState = isProcessing ? 'typing' : (hasThought ? 'thinking' : 'ready'); return (<JoeBadge size="md" state={badgeState} />); })()}
                      </span>
                    )}
                    <div 
                      className={`relative max-w-[88%] sm:max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-4 ${
                        msg.type === 'user' 
                          ? 'bg-[#0b1220] text-gray-100 border border-yellow-500/50 shadow-lg ring-1 ring-yellow-500/30 transition-colors hover:shadow-xl' 
                          : 'bg-gray-900/70 text-gray-100 border border-gray-700 shadow-lg ring-1 ring-white/10 transition-colors hover:shadow-xl'
                      }`}
                    >
                      {msg.type === 'user' ? (
                        <div className="hidden" />
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
                          {(() => { const hasThought = Array.isArray(plan) && plan.slice(-5).some(s => s?.type === 'thought'); const hasDeploy = Array.isArray(plan) && plan.slice(-5).some(s => { const t = String(s?.type||'').toLowerCase(); const txt = String(s?.title||s?.step||s?.content||''); return t==='deploy' || /deploy|push|publish|run|execute|start/i.test(txt); }); const badgeState = !wsConnected ? 'offline' : (isProcessing ? (hasDeploy ? 'deploy' : (hasThought ? 'thinking' : 'typing')) : 'ready'); return (<JoeBadge size="sm" state={badgeState} />); })()}
                          <StyledJoe className="tracking-wide" />
                        </div>
                      )}
                      <div className={`${String(msg.content||'').length > 1200 && !expandedIds.has(msg.id) ? 'max-h-80 overflow-hidden relative' : ''}`}>
                        {renderContent(msg.content)}
                        {String(msg.content||'').length > 1200 && !expandedIds.has(msg.id) && (
                          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-900/90 to-transparent flex items-end justify-center pb-2">
                            <button
                              onClick={() => setExpandedIds(prev => { const next = new Set(prev); next.add(msg.id); return next; })}
                              className="px-3 py-1.5 text-[12px] rounded bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600"
                            >
                              {lang==='ar' ? 'عرض المزيد' : 'Show more'}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        {expandedIds.has(msg.id) && (
                          <button
                            onClick={() => setExpandedIds(prev => { const next = new Set(prev); next.delete(msg.id); return next; })}
                            className="px-2 py-1 text-[11px] rounded bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600"
                          >
                            {lang==='ar' ? 'إخفاء' : 'Collapse'}
                          </button>
                        )}
                        {msg.type !== 'user' && (
                          <button
                            onClick={() => { try { navigator.clipboard.writeText(String(msg.content||'')); } catch { /* noop */ } }}
                            className="p-0 text-gray-300 hover:text-gray-100"
                            title={lang==='ar' ? 'نسخ' : 'Copy'}
                          >
                            <FiCopy size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()}

              {isProcessing && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-800/70 backdrop-blur-sm text-gray-200 border border-gray-700 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: '140ms' }} />
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: '280ms' }} />
                    <span className="text-xs ml-2">{(() => { const hasThought = Array.isArray(plan) && plan.slice(-5).some(s => s?.type === 'thought'); return lang==='ar' ? (<><StyledJoe /> {hasThought ? 'يفكر الآن…' : 'يكتب الآن…'}</>) : (<><StyledJoe /> {hasThought ? 'is thinking…' : 'is typing…'}</>); })()}</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            );
          })()}
        </div>
      </div>
      )}
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
            bottom: `calc(var(--joe-input-h, 56px) + env(safe-area-inset-bottom, 0px) + var(--joe-keyboard-offset, 0px) + ${(isBottomPanelOpen && isBottomCollapsed) ? 48 : 16}px)`,
            left: 'var(--joe-input-left, 16px)'
          }}
        >
          <span className="w-10 h-10 inline-flex items:center justify-center rounded-full bg-yellow-600 text-black hover:bg-yellow-700 border border-yellow-600 shadow-lg">
            <FiArrowDown size={18} />
          </span>
        </button>

      {/* Conversations strip removed to avoid duplication with left SidePanel */}

      {/* Input Area - Bottom, Centered, Responsive, Safe-area aware */}
      <div className="sticky bottom-0 z-30 border-t border-gray-800 bg-gray-900/98 backdrop-blur-sm" ref={inputAreaRef} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--joe-keyboard-offset, 0px))' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-3">
          <div className={`flex flex-col gap-2 bg-gray-900/70 backdrop-blur-sm border border-gray-700/80 rounded-2xl px-5 py-4 shadow-xl transition-all relative brand-ring ${dragActive ? 'ring-2 ring-yellow-500/70' : 'focus-within:ring-2 focus-within:ring-yellow-500'}`}
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setDragActive(false); }}
          onDrop={onDropFiles}
          >
            {Array.isArray(plan) && plan.length > 0 && (
              <div className="mb-2 border border-yellow-500/40 bg-yellow-500/10 rounded-xl p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-yellow-300">قائمة المهام</span>
                  <span className="text-[11px] text-yellow-200">{plan.filter(p=>String(p?.type||'').toLowerCase()==='action').length} مهمة</span>
                </div>
                <div className="mt-1 max-h-24 overflow-auto space-y-1">
                  {plan.filter(p=>String(p?.type||'').toLowerCase()==='action').slice(-6).map((p, i) => (
                    <div key={`task-${i}`} className="text-[12px] text-yellow-100 border border-yellow-500/30 rounded-lg px-2 py-1">
                      {String(p?.content||p?.title||p?.step||'مهمة').slice(0,120)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {dragActive && (
              <div className="absolute inset-0 rounded-2xl border-2 border-yellow-500/60 bg-yellow-500/5 flex items-center justify-center text-xs text-yellow-300 pointer-events-none">
                {lang==='ar' ? 'اسحب الملفات وافلت هنا' : 'Drop files here'}
              </div>
            )}
            <div className="hidden" />
            <div className="flex items-end gap-3 w-full">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onInput={(e) => { try { const ta = e.currentTarget; ta.style.height = 'auto'; const maxH = 160; ta.style.height = Math.min(maxH, ta.scrollHeight) + 'px'; } catch { /* noop */ } }}
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
              placeholder={lang==='ar' ? 'اكتب رسالة لـ Joe…' : 'Message Joe...'}
              className="flex-1 bg-gray-900/40 outline-none resize-none text-white placeholder-gray-500 text-sm leading-relaxed border border-gray-700 rounded-xl px-4 focus:bg-gray-900/50 focus:border-yellow-500"
              rows={2}
              style={{ minHeight: '44px', maxHeight: '160px' }}
              
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
                  className="px-4 py-2 text-black bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 rounded-xl shadow-lg shadow-yellow-500/30 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
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
                        <button onClick={() => handleCopyUrl(it.absoluteUrl)} className="p-0 text-gray-300 hover:text-gray-100" title={lang==='ar'?'نسخ الرابط':'Copy URL'}><FiCopy size={12} /></button>
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
      </div>
      </div>
      </div>
  );
};

export default MainConsole;
