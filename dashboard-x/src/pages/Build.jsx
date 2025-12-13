import { useState, useEffect, useCallback, useReducer } from 'react';
import { useSessionToken } from '../hooks/useSessionToken';
import apiClient from '../api/client';
import {
  RefreshCw,
  Rocket,
  Github,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Save,
  Loader2,
  ExternalLink,
} from 'lucide-react'; // استيراد أيقونات إضافية

//

// Reducer for build process state
const buildReducer = (state, action) => {
  switch (action.type) {
    case 'START_BUILD':
      return {
        ...state,
        building: true,
        buildProgress: 0,
        buildLogs: [],
        buildResult: null,
        error: '',
      };
    case 'ADD_LOG':
      return {
        ...state,
        buildLogs: [...state.buildLogs, action.payload],
      };
    case 'SET_PROGRESS':
      return {
        ...state,
        buildProgress: action.payload,
      };
    case 'SET_RESULT':
      return {
        ...state,
        buildResult: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'FINISH_BUILD':
      return {
        ...state,
        building: false,
      };
    case 'RESET_FORM':
      return {
        ...state,
        title: '',
        description: '',
        features: '',
      };
    default:
      return state;
  }
};

export default function Build() {
  const _TOKEN = useSessionToken();
  useEffect(() => {
    if (_TOKEN) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${_TOKEN}`;
    } else {
      delete apiClient.defaults.headers.common.Authorization;
    }
  }, [_TOKEN]);

  const [projectType, setProjectType] = useState('page');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState('');
  const [style, setStyle] = useState('modern');

  // GitHub settings (stored in localStorage)
  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_token') || '');
  const [githubUsername, setGithubUsername] = useState(localStorage.getItem('github_username') || '');

  // Build process state using useReducer
  const [buildState, dispatch] = useReducer(buildReducer, {
    building: false,
    buildProgress: 0,
    buildLogs: [],
    buildResult: null,
    error: '',
  });

  const { building, buildProgress, buildLogs, buildResult, error } = buildState;

  // Jobs list
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState(null);

  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    setJobsError(null);
    try {
      const res = await apiClient.get('/api/v1/factory/jobs');
      if (res.data.success || res.data.ok) {
        setJobs(res.data.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setJobsError('فشل تحميل المشاريع الأخيرة.');
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    try {
      const base = (typeof window !== 'undefined' && (localStorage.getItem('apiBaseUrl') || window.location.origin + '/api/v1')) || '/api/v1';
      const url = String(base).replace(/\/+$/,'') + '/factory/events';
      const es = new EventSource(url, { withCredentials: true });
      es.addEventListener('snapshot', (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (Array.isArray(d?.jobs)) {
            setJobs(d.jobs);
          }
        } catch { /* noop */ }
      });
      return () => { try { es.close(); } catch { /* noop */ } };
    } catch {
      const interval = setInterval(fetchJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchJobs]);

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    dispatch({ type: 'ADD_LOG', payload: { timestamp, message, type } });
  }, []);

  const handleBuild = async (e) => {
    e.preventDefault();

    if (!githubToken || !githubUsername) {
      dispatch({ type: 'SET_ERROR', payload: 'الرجاء إدخال رمز الوصول الشخصي (Token) واسم المستخدم (Username) الخاص بحساب GitHub في الإعدادات أولاً!' });
      return;
    }

    dispatch({ type: 'START_BUILD' });

    try {
      // Step 1: Starting
      addLog('🚀 جاري بدء عملية الإنشاء...', 'info');
      dispatch({ type: 'SET_PROGRESS', payload: 10 });

      // Step 2: AI Generation
      addLog('🤖 جاري توليد الكود البرمجي باستخدام تقنية Gemini AI...', 'info');
      dispatch({ type: 'SET_PROGRESS', payload: 30 });

      const featuresList = features
        .split('\n')
        .map(f => f.trim())
        .filter(f => f);

      const payload = {
        projectType,
        description: `${title}\n\n${description}`,
        style,
        features: featuresList,
        githubToken,
        githubUsername,
        repoName: title.toLowerCase().replace(/[^a-z0-9]/g, '-')
      };

      const response = await apiClient.post('/api/v1/page-builder/create-and-deploy', payload);

      if (response.data.success || response.data.ok) {
        addLog('✅ تم توليد الكود البرمجي بنجاح!', 'success');
        dispatch({ type: 'SET_PROGRESS', payload: 60 });

        // Step 3: GitHub Push
        addLog('📤 جاري رفع الكود البرمجي إلى GitHub...', 'info');
        dispatch({ type: 'SET_PROGRESS', payload: 80 });
        addLog(`✅ تم الرفع على: ${response.data.repoUrl || response.data.githubUrl}`, 'success');

        // Step 4: Deployment
        addLog('🌐 جاري نشر المشروع...', 'info');
        dispatch({ type: 'SET_PROGRESS', payload: 95 });

        if (response.data.deploymentUrl || response.data.liveUrl) {
          addLog(`✅ تم نشر المشروع بنجاح على: ${response.data.deploymentUrl || response.data.liveUrl}`, 'success');
        }

        dispatch({ type: 'SET_PROGRESS', payload: 100 });
        addLog('🎉 اكتملت عملية الإنشاء بنجاح!', 'success');

        dispatch({ type: 'SET_RESULT', payload: {
          ...response.data,
          githubUrl: response.data.repoUrl || response.data.githubUrl,
          liveUrl: response.data.deploymentUrl || response.data.liveUrl,
          filesGenerated: response.data.filesGenerated || 0,
          projectType,
        }});

        // Clear form
        setTitle('');
        setDescription('');
        setFeatures('');

        // Refresh jobs
        fetchJobs();
      }
    } catch (err) {
      console.error('Build error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'فشلت عملية الإنشاء';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      addLog(`❌ خطأ: ${errorMsg}`, 'error');
    } finally {
      dispatch({ type: 'FINISH_BUILD' });
    }
  };

  const saveGitHubSettings = () => {
    localStorage.setItem('github_token', githubToken);
    localStorage.setItem('github_username', githubUsername);
    alert('✅ تم حفظ إعدادات GitHub بنجاح!');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'QUEUED': return 'text-yellow-400';
      case 'WORKING': return 'text-blue-400';
      case 'DONE': return 'text-green-400';
      case 'FAILED': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'QUEUED': return <Loader2 size={16} className="animate-spin text-yellow-400" />;
      case 'WORKING': return <RefreshCw size={16} className="animate-spin text-blue-400" />;
      case 'DONE': return <CheckCircle size={16} className="text-green-400" />;
      case 'FAILED': return <XCircle size={16} className="text-red-400" />;
      default: return <Info size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-white">🎨 إنشاء مشروع جديد</h1>
        <p className="text-textDim">
          اكتب الوصف → الذكاء الاصطناعي ينشئ الكود → يُرفع على GitHub → يُنشر تلقائيًا!
        </p>
      </div>

      {/* GitHub Settings Banner */}
      {(!githubToken || !githubUsername) && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle size={24} className="text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-yellow-400 font-medium mb-1">⚠️ الرجاء إعداد GitHub أولاً!</p>
            <p className="text-sm text-yellow-300">
              انتقل إلى الأسفل وأدخل رمز الوصول الشخصي (Token) واسم المستخدم (Username) الخاص بحساب GitHub لتفعيل الإنشاء التلقائي.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Build Form */}
        <div className="card bg-bgLight p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white">تفاصيل المشروع</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm flex items-center gap-2">
              <XCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleBuild} className="space-y-4">
            <div>
              <label htmlFor="projectType" className="block text-sm font-medium text-textDim mb-2">
                نوع المشروع
              </label>
              <select
                id="projectType"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="input-field w-full bg-bgDark border-borderDim text-white rounded-md p-2"
                disabled={building}
              >
                <option value="page">صفحة واحدة (Landing Page)</option>
                <option value="website">موقع إلكتروني كامل (Multi-page)</option>
                <option value="store">متجر إلكتروني (E-commerce)</option>
              </select>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-textDim mb-2">
                عنوان المشروع *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field w-full bg-bgDark border-borderDim text-white rounded-md p-2"
                placeholder="مثال: موقع مطعم إيطالي"
                required
                disabled={building}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-textDim mb-2">
                وصف المشروع *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field w-full bg-bgDark border-borderDim text-white rounded-md p-2"
                rows={5}
                placeholder="مثال: صفحة رئيسية لمطعم إيطالي مع قائمة طعام، معرض صور للأطباق، نموذج حجز طاولة، ومعلومات الاتصال والموقع"
                required
                disabled={building}
              />
            </div>

            <div>
              <label htmlFor="style" className="block text-sm font-medium text-textDim mb-2">
                نمط التصميم
              </label>
              <select
                id="style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="input-field w-full bg-bgDark border-borderDim text-white rounded-md p-2"
                disabled={building}
              >
                <option value="modern">حديث (Modern)</option>
                <option value="minimal">بسيط (Minimal)</option>
                <option value="creative">إبداعي (Creative)</option>
                <option value="professional">احترافي (Professional)</option>
                <option value="playful">مرح (Playful)</option>
              </select>
            </div>

            <div>
              <label htmlFor="features" className="block text-sm font-medium text-textDim mb-2">
                ميزات إضافية (ميزة واحدة لكل سطر)
              </label>
              <textarea
                id="features"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                className="input-field w-full bg-bgDark border-borderDim text-white rounded-md p-2"
                rows={3}
                placeholder="نموذج تواصل&#10;معرض صور&#10;قسم آراء العملاء"
                disabled={building}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={building || !githubToken || !githubUsername}
            >
              {building ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> جاري الإنشاء...
                </>
              ) : (
                <>
                  <Rocket size={20} /> إنشاء ونشر
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Progress & Logs */}
        <div className="space-y-6">
          {/* Progress */}
          {(building || buildResult) && (
            <div className="card bg-bgLight p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-white">🔴 التقدم المباشر</h2>

              <div className="mb-4">
                <div className="flex justify-between text-sm text-textDim mb-2">
                  <span>التقدم</span>
                  <span>{buildProgress}%</span>
                </div>
                <div className="w-full bg-bgDark rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-500"
                    style={{ width: `${buildProgress}%` }}
                  />
                </div>
              </div>

              {/* Live Logs */}
              <div className="bg-bgDark rounded-lg p-4 max-h-64 overflow-y-auto border border-borderDim">
                <h3 className="text-sm font-semibold text-textDim mb-2">📝 السجلات</h3>
                <div className="space-y-1 font-mono text-xs">
                  {buildLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`
                        ${log.type === 'error' ? 'text-red-400' : ''}
                        ${log.type === 'success' ? 'text-green-400' : ''}
                        ${log.type === 'info' ? 'text-blue-400' : ''}
                      `}
                    >
                      <span className="text-textDim">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Build Result */}
          {buildResult && (
            <div className="card bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/50 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-green-400 flex items-center gap-2">
                <CheckCircle size={24} /> 🎉 اكتمل الإنشاء بنجاح!
              </h2>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-textDim mb-1">مستودع GitHub:</p>
                  <a
                    href={buildResult.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all flex items-center gap-1"
                  >
                    {buildResult.githubUrl} <ExternalLink size={16} />
                  </a>
                </div>

                {buildResult.liveUrl && (
                  <div>
                    <p className="text-sm text-textDim mb-1">الرابط المباشر للمشروع:</p>
                    <a
                      href={buildResult.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary hover:underline break-all flex items-center gap-1"
                    >
                      {buildResult.liveUrl} <ExternalLink size={16} />
                    </a>
                  </div>
                )}

                <div className="pt-3 border-t border-borderDim">
                  <p className="text-sm text-textDim">
                    عدد الملفات التي تم إنشاؤها: {buildResult.filesGenerated}
                  </p>
                  <p className="text-sm text-textDim">
                    نوع المشروع: {buildResult.projectType}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* GitHub Settings */}
          <div className="card bg-bgLight p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <Github size={24} /> ⚙️ إعدادات GitHub
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="githubUsername" className="block text-sm font-medium text-textDim mb-2">
                  اسم مستخدم GitHub *
                </label>
                <input
                  type="text"
                  id="githubUsername"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="اسم المستخدم الخاص بك"
                  className="input-field w-full bg-bgDark border-borderDim text-white rounded-md p-2"
                />
              </div>

              <div>
                <label htmlFor="githubToken" className="block text-sm font-medium text-textDim mb-2">
                  رمز الوصول الشخصي (Personal Access Token) لـ GitHub *
                </label>
                <input
                  type="password"
                  id="githubToken"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="input-field w-full bg-bgDark border-borderDim text-white rounded-md p-2"
                />
                <p className="text-xs text-textDim mt-1 flex items-center gap-1">
                  <Info size={14} /> احصل عليه من: <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">إعدادات GitHub</a>
                </p>
              </div>

              <button
                onClick={saveGitHubSettings}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Save size={20} /> حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="card bg-bgLight p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">📚 المشاريع الأخيرة</h2>

        {loadingJobs && (
          <div className="flex items-center justify-center py-8 text-textDim">
            <Loader2 size={24} className="animate-spin mr-2" /> جاري تحميل المشاريع...
          </div>
        )}

        {jobsError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm flex items-center gap-2">
            <XCircle size={18} />
            <span>{jobsError}</span>
          </div>
        )}

        {!loadingJobs && !jobsError && jobs.length === 0 ? (
          <p className="text-textDim text-center py-8 col-span-full">
            لا توجد مشاريع بعد. ابدأ بإنشاء أول مشروع لك!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.slice(0, 6).map((job) => (
              <div
                key={job._id}
                className="p-4 bg-bgDark rounded-lg border border-borderDim hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(job.status)}
                  <span className={`font-semibold text-sm ${getStatusColor(job.status)}`}>
                    {job.status === 'QUEUED' && 'في الانتظار'}
                    {job.status === 'WORKING' && 'قيد العمل'}
                    {job.status === 'DONE' && 'مكتمل'}
                    {job.status === 'FAILED' && 'فشل'}
                  </span>
                </div>

                <h3 className="font-medium mb-1 text-white">{job.title || job.projectType}</h3>
                <p className="text-sm text-textDim line-clamp-2 mb-2">
                  {job.shortDescription || 'لا يوجد وصف متاح.'}
                </p>

                {job.deploymentUrl && (
                  <a
                    href={job.deploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm flex items-center gap-1"
                  >
                    🌐 عرض مباشر <ExternalLink size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
