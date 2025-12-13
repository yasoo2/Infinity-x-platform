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

  // Joe Badge Component
  const JoeBadge = ({ size = 'md', state = 'ready' }) => {
    const base = 'inline-flex items-center justify-center rounded-full font-bold select-none';
    const sizes = {
      sm: 'w-5 h-5 text-[10px]',
      md: 'w-6 h-6 text-xs',
      lg: 'w-8 h-8 text-sm'
    };
    const states = {
      ready: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black',
      typing: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black animate-pulse',
      thinking: 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white animate-pulse',
      deploy: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white animate-pulse',
      offline: 'bg-gradient-to-br from-gray-600 to-gray-700 text-white'
    };
    const icons = {
      ready: '●',
      typing: '●',
      thinking: '◆',
      deploy: '▲',
      offline: '■'
    };
    return (
      <span className={`${base} ${sizes[size]} ${states[state]}`} title={state}>
        {icons[state]}
      </span>
    );
  };
  JoeBadge.propTypes = { size: PropTypes.oneOf(['sm', 'md', 'lg']), state: PropTypes.oneOf(['ready', 'typing', 'thinking', 'deploy', 'offline']) };

  // Styled Joe Text Component
  const StyledJoe = ({ className = '' }) => (
    <span className={`${className} text-yellow-400 font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-500`}>
      JOE
    </span>
  );
  StyledJoe.propTypes = { className: PropTypes.string };

  // Smart Image Component with size support
  const SmartImage = ({ src, alt = 'image', w, h }) => {
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
      <img src={src} alt={alt} className="rounded-lg border border-gray-700" style={{ width: w || undefined, height: h || undefined, objectFit: 'cover' }} />
    );
  };
  SmartImage.propTypes = { src: PropTypes.string.isRequired, alt: PropTypes.string, w: PropTypes.string, h: PropTypes.string };

  // HLS Video Component
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

  // Effects
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => {
      try {
        const h = Math.max(60, Math.min(window.innerHeight * 0.25, 200));
        setInputAreaHeight(h);
      } catch { setInputAreaHeight(100); }
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

  // Scroll management
  const scrollToBottom = (smooth = true) => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    } catch { /* noop */ }
  };

  useEffect(() => {
    if (showScrollRef.current) {
      scrollToBottom(false);
      showScrollRef.current = false;
    } else {
      scrollToBottom(true);
    }
  }, [messages]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      try {
        const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        setShowScrollButton(!atBottom);
      } catch { setShowScrollButton(false); }
    };
    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // File handling
  const handleFileClick = () => fileInputRef.current?.click();
  
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadPct(0);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    try {
      const { data } = await apiClient.post('/api/v1/file/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => setUploadPct(Math.round((p.loaded * 100) / p.total))
      });
      if (data?.urls?.length) {
        const urls = data.urls.map(u => `!size[2cmx2cm] \`${u}\``).join('\n');
        setInput(prev => prev + (prev ? '\n' : '') + urls);
      }
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setUploadPct(0);
      e.target.value = '';
    }
  };

  // GitHub integration
  const handleGithubSubmit = async (e) => {
    e.preventDefault();
    if (!ghUrl.trim()) return;
    setLinkLoading(true);
    try {
      const { data } = await apiClient.post('/api/v1/github/quick-commit', {
        repoUrl: ghUrl,
        branch: ghBranch,
        token: ghToken,
        commitMessage: ghCommitMessage
      });
      if (data?.success) {
        setInput(prev => prev + (prev ? '\n' : '') + `✅ ${lang === 'ar' ? 'تم رفع التغييرات إلى' : 'Changes pushed to'} ${ghUrl}`);
        setShowGithub(false);
      }
    } catch (e) {
      console.error('GitHub operation failed:', e);
    } finally {
      setLinkLoading(false);
    }
  };

  // Builder integration
  const handleBuilderSubmit = async (e) => {
    e.preventDefault();
    if (!builderDescription.trim()) return;
    setBuilderLoading(true);
    try {
      const { data } = await apiClient.post('/api/v1/factory/build', {
        description: builderDescription,
        repoName: builderRepoName,
        projectType: builderProjectType
      });
      if (data?.success) {
        setInput(prev => prev + (prev ? '\n' : '') + `✅ ${lang === 'ar' ? 'تم بناء المشروع' : 'Project built successfully'}`);
        setShowBuilder(false);
      }
    } catch (e) {
      console.error('Builder operation failed:', e);
    } finally {
      setBuilderLoading(false);
    }
  };

  // Gallery handling
  const loadUploads = async () => {
    setUploadsLoading(true);
    try {
      const items = await listUserUploads();
      setUploads(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error('Failed to load uploads:', e);
      setUploads([]);
    } finally {
      setUploadsLoading(false);
    }
  };

  useEffect(() => {
    if (showGallery) loadUploads();
  }, [showGallery]);

  // UI helpers
  const okPulse = (target, type = 'success') => {
    try {
      const el = document.querySelector(`[data-ok-target="${target}"]`);
      if (!el) return;
      el.classList.add(type === 'success' ? 'animate-pulse-once' : type === 'toggle' ? 'animate-pulse-twice' : 'animate-pulse-once');
      setTimeout(() => el.classList.remove('animate-pulse-once', 'animate-pulse-twice'), 600);
    } catch { /* noop */ }
  };

  // Drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      apiClient.post('/api/v1/file/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(({ data }) => {
        if (data?.urls?.length) {
          const urls = data.urls.map(u => `!size[2cmx2cm] \`${u}\``).join('\n');
          setInput(prev => prev + (prev ? '\n' : '') + urls);
        }
      }).catch(console.error);
    }
  };

  // Visual navigation
  const navigateVisual = (url) => {
    try {
      window.dispatchEvent(new CustomEvent('joe:navigate-visual', { detail: { url } }));
    } catch { /* noop */ }
  };

  // Render functions
  const renderContent = (text) => {
    const t = String(text || '');
    
    // Enhanced image detection for direct display
    const sizedBacktick = Array.from(t.matchAll(/!size\[(\S+?)x(\S+?)\]\s*`(https?:\/\/[^\s`]+)`/g)).map(m => ({ w: m[1], h: m[2], url: m[3] }));
    const mdBangBacktick = Array.from(t.matchAll(/!\s*`(https?:\/\/[^\s`]+)`/g)).map(m => m[1]);
    const mdImage = Array.from(t.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g)).map(m => m[1]);
    const bangPlain = Array.from(t.matchAll(/!\s*(https?:\/\/\S+)/g)).map(m => m[1]);
    const extImgs = (t.match(/https?:\/\/[^\s)]+/g) || []).filter(u => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(u));
    const whitelistHosts = ['placekitten.com','picsum.photos','images.unsplash.com'];
    const hostImgs = (t.match(/https?:\/\/[^\s)]+/g) || []).filter(u => { 
      try { 
        const h = new URL(u).hostname; 
        return whitelistHosts.includes(h); 
      } catch { 
        return false; 
      } 
    });
    
    // Combine all image URLs
    const allImageUrls = Array.from(new Set([...sizedBacktick.map(s=>s.url), ...mdBangBacktick, ...mdImage, ...bangPlain, ...extImgs, ...hostImgs]));
    const sizeMap = new Map(sizedBacktick.map(s => [s.url, { w: s.w, h: s.h }]));
    
    // If the message contains only image display syntax, render just the images
    if (allImageUrls.length > 0 && t.trim().match(/^!size\[[^\]]+\]\s*`https?:\/\/[^\s`]+`$/)) {
      return (
        <div className="mt-3 flex flex-wrap gap-3">
          {allImageUrls.slice(0, 4).map((src, i) => (
            <div key={`img-${i}`} className="block">
              <SmartImage src={src} alt="image" w={sizeMap.get(src)?.w} h={sizeMap.get(src)?.h} />
            </div>
          ))}
        </div>
      );
    }
    
    // Regular text processing with image display
    const urlRe = /((https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s)]+)?)/gi;
    const brands = ['google','جوجل','غوغل','youtube','يوتيوب','facebook','فيسبوك','instagram','انستقرام','tiktok','تيك توك','twitter','x','snapchat','سناب شات','linkedin','لينكدان','netflix','نيتفلكس','amazon','أمازون','apple','آبل','microsoft','مايكروسوفت','github','جيت هب','gitlab','جيت لاب','stackoverflow','ستاك أوفر فلو'];
    const brandPattern = new RegExp(`\\b(?:${brands.map(b=>b.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')).join('|')})\\b`,'gi');
    const isRTL = (lang === 'ar');
    
    const renderRich = (txt) => {
      if (!txt || typeof txt !== 'string') return txt;
      const parts = [];
      let last = 0;
      txt.replace(urlRe, (match, p1, offset) => {
        const i = offset;
        if (i > last) parts.push({ type: 'text', content: txt.slice(last, i) });
        const href = p1.startsWith('http') ? p1 : `https://${p1}`;
        const display = p1.replace(/^https?:\/\//, '').replace(/\/$/, '');
        parts.push({ type: 'link', href, display });
        last = i + match.length;
        return match;
      });
      if (last < txt.length) parts.push({ type: 'text', content: txt.slice(last) });
      return parts.map((p, i) => {
        if (p.type === 'link') {
          return (
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
          );
        }
        return p.content.replace(brandPattern, (m) => (
          <span key={`brand-${i}-${m}`} className="font-semibold text-yellow-300">{m}</span>
        ));
      });
    };
    
    // Process text with image detection
    const segments = [];
    let last = 0;
    const codeMatches = Array.from(t.matchAll(/```([\s\S]*?)```/g));
    for (const cm of codeMatches) {
      const i = cm.index;
      if (i > last) segments.push({ type: 'text', content: t.slice(last, i) });
      segments.push({ type: 'code', content: cm[1] });
      last = i + cm[0].length;
    }
    if (last < t.length) segments.push({ type: 'text', content: t.slice(last) });
    
    // Extract video URLs
    const rawVideoAll = (t.match(/https?:\/\/[^\s)]+/g) || []);
    const extVideos = rawVideoAll.filter(u => /\.(mp4|webm|ogg)(\?|$)/i.test(u));
    const mdVideo = Array.from(t.matchAll(/!video\[[^\]]*\]\((https?:\/\/[^)]+)\)/gi)).map(m => m[1]);
    const bangVideo = Array.from(t.matchAll(/!video\s*(https?:\/\/\S+)/gi)).map(m => m[1]);
    const videoWhitelist = ['cdn.discordapp.com','cdn.jsdelivr.net','storage.googleapis.com'];
    const hostVideos = rawVideoAll.filter(u => { 
      try { 
        const h = new URL(u).hostname; 
        return videoWhitelist.includes(h); 
      } catch { 
        return false; 
      } 
    });
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
            .replace(/!size\[[^\]]+\]\s*`https?:\/\/[^\s`]+`/g,'')
            .replace(/!\s*`https?:\/\/[^\s`]+`/g,'')
            .replace(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g,'')
            .replace(/!\s*https?:\/\/\S+/g,'')
            .split(/\n{2,}/)
            .map((para, pi) => {
            const lines = String(para).split(/\n/);
            const isBullets = lines.every(l => /^\s*(-|•)\s+/.test(l)) && lines.length > 1; 
            const isNumbers = lines.every(l => /^\s*\d+\.\s+/.test(l)) && lines.length > 1; 
            const isHeading = /^\s*#{1,3}\s+/.test(lines[0]) && lines.length === 1;
            return isHeading ? (
              (() => { 
                const m = lines[0].match(/^(\s*#{1,3})\s+(.*)$/); 
                const lvl = m && m[1] ? (m[1].trim().length) : 1; 
                const txt = m ? m[2] : lines[0].replace(/^\s*#+\s+/, ''); 
                const size = lvl === 1 ? 'text-2xl md:text-3xl' : (lvl === 2 ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'); 
                return (
                  <div key={`hd-${idx}-${pi}`} className={`mt-1 ${isRTL ? 'text-right' : 'text-left'}`} style={{ direction: isRTL ? 'rtl' : 'ltr', unicodeBidi: 'plaintext' }}>
                    <div className={`${size} font-extrabold tracking-tight text-yellow-300`}>{renderRich(txt)}</div>
                  </div>
                ); 
              })()
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
        {allImageUrls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {allImageUrls.slice(0, 4).map((src, i) => (
              <div key={`img-${i}`} className="block">
                <SmartImage src={src} alt="image" w={sizeMap.get(src)?.w} h={sizeMap.get(src)?.h} />
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

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <JoeBadge size="md" state={wsConnected ? (isProcessing ? 'typing' : 'ready') : 'offline'} />
            <StyledJoe className="tracking-wide" />
            <span className="text-xs text-gray-400 hidden sm:inline">
              {lang === 'ar' ? 'المساعد الذكي' : 'AI Assistant'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGallery(v => !v)}
              className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
              title={lang === 'ar' ? 'مكتبة الصور' : 'Image Gallery'}
            >
              <FiImage size={14} />
            </button>
            <button
              onClick={() => setViewMode(v => v === 'chat' ? 'minimal' : 'chat')}
              className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
              title={viewMode === 'chat' ? 'Minimal View' : 'Full View'}
            >
              <FiCompass size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="fixed inset-0 bg-yellow-500/10 border-2 border-dashed border-yellow-500/50 rounded-2xl flex items-center justify-center z-50 pointer-events-none">
            <div className="text-yellow-400 text-lg font-semibold">Drop files here</div>
          </div>
        )}

        {/* Welcome / Empty State */}
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-xl font-bold text-yellow-400 mb-2">
              {lang === 'ar' ? 'مرحباً! أنا جو' : 'Hello! I\'m Joe'}
            </h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {lang === 'ar' 
                ? 'أستطيع إنشاء الصور والتصميمات لك. جرب أن تقول: "صمم لي صورة قطة" أو "ارسم شعاراً"'
                : 'I can create images and designs for you. Try saying: "Design me a cat image" or "Draw a logo"'
              }
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setInput(lang === 'ar' ? 'صمم لي صورة قطة جميلة' : 'Design me a beautiful cat image')}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-yellow-400 rounded-lg text-sm transition-colors border border-gray-700"
              >
                🐱 {lang === 'ar' ? 'قطة جميلة' : 'Beautiful Cat'}
              </button>
              <button
                onClick={() => setInput(lang === 'ar' ? 'ارسم شعاراً لشركة تقنية' : 'Draw a logo for a tech company')}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-yellow-400 rounded-lg text-sm transition-colors border border-gray-700"
              >
                🏢 {lang === 'ar' ? 'شعار شركة' : 'Company Logo'}
              </button>
              <button
                onClick={() => setInput(lang === 'ar' ? 'صمم صورة طبيعة خلابة' : 'Design a stunning nature image')}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-yellow-400 rounded-lg text-sm transition-colors border border-gray-700"
              >
                🌿 {lang === 'ar' ? 'طبيعة خلابة' : 'Stunning Nature'}
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((msg, index) => {
            const isLast = index === messages.length - 1;
            const isProcessingLast = isProcessing && isLast;
            const hasActivity = (messages && messages.length > 0) || isProcessing || (Array.isArray(plan) && plan.length > 0);
            
            if (!hasActivity && msg.type === 'joe' && !msg.content) {
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
                      <div className="text-[10px] font-semibold text-yellow-300"><bdi dir={lang==='ar'? 'ltr': undefined} style={{ unicodeBidi: 'isolate' }}>Advanced AI Vision</bdi></div>
                      <p className="mt-0.5 text-[10px] text-gray-300">يرى ويحلل الصور والواجهات ويولد الكود تلقائياً.</p>
                    </div>
                    <div className="p-2 rounded-2xl bg-gray-900/60 border border-gray-800 shadow">
                      <div className="text-[10px] font-semibold text-yellow-300"><bdi dir={lang==='ar'? 'ltr': undefined} style={{ unicodeBidi: 'isolate' }}>Autonomous Execution</bdi></div>
                      <p className="mt-0.5 text-[10px] text-gray-300">ينفذ المهام المعقدة دون تدخل بشري.</p>
                    </div>
                    <div className="p-2 rounded-2xl bg-gray-900/60 border border-gray-800 shadow">
                      <div className="text-[10px] font-semibold text-yellow-300"><bdi dir={lang==='ar'? 'ltr': undefined} style={{ unicodeBidi: 'isolate' }}>Image Generation</bdi></div>
                      <p className="mt-0.5 text-[10px] text-gray-300">يصمم وينشئ الصور والرسومات حسب الطلب.</p>
                    </div>
                  </div>
                  <div className="text-center mt-3">
                    <span className="inline-block px-2.5 py-1 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black text-[10px]">{lang==='ar'?'ابدأ برسالة لـ Joe هنا':'Start by typing a message to Joe'}</span>
                  </div>
                </div>
              );
            }
            
            return (
              <div 
                key={msg.id || `${msg.createdAt||0}-${index}`} 
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} items-start gap-3 mb-4`}
              >
                {msg.type !== 'user' && (
                  <span className="mt-1">
                    {(() => { 
                      const hasThought = Array.isArray(plan) && plan.slice(-5).some(s => s?.type === 'thought'); 
                      const hasDeploy = Array.isArray(plan) && plan.slice(-5).some(s => { 
                        const t = String(s?.type||'').toLowerCase(); 
                        const txt = String(s?.title||s?.step||s?.content||''); 
                        return t==='deploy' || /deploy|push|publish|run|execute|start/i.test(txt); 
                      }); 
                      const badgeState = !wsConnected ? 'offline' : (isProcessing ? (hasDeploy ? 'deploy' : (hasThought ? 'thinking' : 'typing')) : 'ready'); 
                      return (<JoeBadge size="md" state={badgeState} />); 
                    })()}
                  </span>
                )}
                <div 
                  className={`relative max-w-[88%] sm:max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-4 ${
                    msg.type === 'user' 
                      ? 'bg-[#0b1220] text-gray-100 border border-yellow-500/50 shadow-lg ring-1 ring-yellow-500/30 transition-colors hover:shadow-xl' 
                      : 'bg-gray-800/90 text-gray-100 border border-gray-700/80 shadow-lg backdrop-blur-sm'
                  }`}
                >
                  <div className={`${String(msg.content||'').length > 1200 && !expandedIds.has(msg.id) ? 'max-h-80 overflow-hidden relative' : ''}`}>
                    {renderContent(msg.content)}
                    {String(msg.content||'').length > 1200 && !expandedIds.has(msg.id) && (
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-900/90 to-transparent flex items-end justify-center pb-2">
                        <button
                          onClick={() => setExpandedIds(prev => new Set([...prev, msg.id]))}
                          className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-full transition-colors"
                        >
                          {lang==='ar' ? 'عرض المزيد' : 'Show more'}
                        </button>
                      </div>
                    )}
                  </div>
                  {isProcessingLast && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-yellow-300">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                      {lang==='ar' ? 'يكتب...' : 'Typing...'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom(true)}
          className="fixed bottom-24 right-6 z-10 p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-yellow-400 rounded-full shadow-lg border border-gray-700 transition-all"
        >
          <FiArrowDown size={16} />
        </button>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-3">
          <div className={`flex flex-col gap-2 bg-gray-900/70 backdrop-blur-sm border border-gray-700/80 rounded-2xl px-5 py-4 shadow-xl transition-all brand-ring ${dragActive ? 'ring-2 ring-yellow-500/70' : 'focus-within:ring-2 focus-within:ring-yellow-500'}`}>
            
            {/* GitHub Panel */}
            {showGithub && (
              <div ref={ghPanelRef} className="absolute bottom-24 left-0 w-[320px] max-w-[90vw] bg-gray-900 border border-gray-700 rounded-xl shadow-lg p-4">
                <form onSubmit={handleGithubSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Repository URL</label>
                    <input
                      type="url"
                      value={ghUrl}
                      onChange={(e) => setGhUrl(e.target.value)}
                      placeholder="https://github.com/user/repo"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Branch</label>
                    <input
                      type="text"
                      value={ghBranch}
                      onChange={(e) => setGhBranch(e.target.value)}
                      placeholder="main"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Token</label>
                    <input
                      type="password"
                      value={ghToken}
                      onChange={(e) => setGhToken(e.target.value)}
                      placeholder="ghp_..."
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Commit Message</label>
                    <input
                      type="text"
                      value={ghCommitMessage}
                      onChange={(e) => setGhCommitMessage(e.target.value)}
                      placeholder="Update by JOE AI"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={linkLoading}
                      className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {linkLoading ? '...' : 'Push'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGithub(false)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Builder Panel */}
            {showBuilder && (
              <div className="absolute bottom-24 right-0 w-[400px] max-w-[90vw] bg-gray-900 border border-gray-700 rounded-xl shadow-lg p-4">
                <form onSubmit={handleBuilderSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{lang==='ar' ? 'وصف المشروع' : 'Project Description'}</label>
                    <textarea
                      value={builderDescription}
                      onChange={(e) => setBuilderDescription(e.target.value)}
                      placeholder={lang==='ar' ? 'صف المشروع الذي تريد بناءه...' : 'Describe the project you want to build...'}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 h-20 resize-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{lang==='ar' ? 'اسم المستودع' : 'Repository Name'}</label>
                    <input
                      type="text"
                      value={builderRepoName}
                      onChange={(e) => setBuilderRepoName(e.target.value)}
                      placeholder="my-project"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{lang==='ar' ? 'نوع المشروع' : 'Project Type'}</label>
                    <select
                      value={builderProjectType}
                      onChange={(e) => setBuilderProjectType(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="page">{lang==='ar' ? 'صفحة ويب' : 'Web Page'}</option>
                      <option value="app">{lang==='ar' ? 'تطبيق ويب' : 'Web App'}</option>
                      <option value="api">{lang==='ar' ? 'API' : 'API'}</option>
                      <option value="component">{lang==='ar' ? 'مكوّن' : 'Component'}</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={builderLoading}
                      className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {builderLoading ? '...' : (lang==='ar' ? 'ابنِ' : 'Build')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBuilder(false)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                    >
                      {lang==='ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Gallery Panel */}
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
                      uploads.map((item, i) => (
                        <div key={i} className="relative group">
                          <img 
                            src={item.publicUrl || item.absoluteUrl} 
                            alt="upload" 
                            className="w-full h-20 object-cover rounded-lg border border-gray-700 cursor-pointer hover:border-yellow-500 transition-colors"
                            onClick={() => setInput(prev => prev + (prev ? '\n' : '') + `!size[2cmx2cm] \`${item.publicUrl || item.absoluteUrl}\``)}
                            title={lang==='ar' ? 'انقر للإدراج' : 'Click to insert'}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteUserUpload(item.name).then(loadUploads).catch(console.error); }}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                            title={lang==='ar' ? 'حذف' : 'Delete'}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Input Row */}
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isProcessing && input.trim()) handleSend();
                  }
                }}
                placeholder={lang === 'ar' ? 'اكتب رسالتك هنا...' : 'Type your message here...'}
                className="flex-1 bg-transparent border-0 outline-none resize-none text-sm md:text-base text-gray-200 placeholder-gray-500 py-2 max-h-40"
                rows={1}
                style={{ minHeight: '2.5rem' }}
                disabled={isProcessing}
              />
              
              <div className="flex items-center gap-2">
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
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' 
                      : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700 border border-gray-700'
                  }`}
                  disabled={isProcessing}
                  title={isListening ? (lang==='ar' ? 'إيقاف التسجيل' : 'Stop Recording') : (lang==='ar' ? 'تسجيل صوتي' : 'Voice Input')}
                >
                  <FiMic size={14} />
                </button>
                
                <button
                  onClick={isProcessing ? stopProcessing : handleSend}
                  disabled={isProcessing ? false : !input.trim()}
                  className={`p-2 rounded-lg transition-colors ${
                    isProcessing 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' 
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isProcessing ? (lang==='ar' ? 'إيقاف' : 'Stop') : (lang==='ar' ? 'إرسال' : 'Send')}
                >
                  {isProcessing ? <FiStopCircle size={14} /> : <FiSend size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

MainConsole.propTypes = {
  isBottomPanelOpen: PropTypes.bool,
  isBottomCollapsed: PropTypes.bool
};

export default MainConsole;