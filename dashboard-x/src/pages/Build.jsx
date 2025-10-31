import { useState, useEffect } from 'react';
import { useSessionToken } from '../hooks/useSessionToken';
import apiClient from '../api/client';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.xelitesolutions.com';

export default function Build() {
  const { token } = useSessionToken();
  const [projectType, setProjectType] = useState('page');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState('');
  const [style, setStyle] = useState('modern');
  
  // GitHub settings (stored in localStorage)
  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_token') || '');
  const [githubUsername, setGithubUsername] = useState(localStorage.getItem('github_username') || '');
  
  // Building state
  const [building, setBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildLogs, setBuildLogs] = useState([]);
  const [buildResult, setBuildResult] = useState(null);
  const [error, setError] = useState('');
  
  // Jobs list
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await apiClient.get('/api/factory/jobs');
      if (res.data.ok) {
        setJobs(res.data.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setBuildLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const handleBuild = async (e) => {
    e.preventDefault();
    
    if (!githubToken || !githubUsername) {
      setError('يرجى إدخال GitHub Token و Username في الإعدادات أولاً!');
      return;
    }

    setError('');
    setBuildResult(null);
    setBuilding(true);
    setBuildProgress(0);
    setBuildLogs([]);

    try {
      // Step 1: Starting
      addLog('🚀 بدء عملية البناء...', 'info');
      setBuildProgress(10);

      // Step 2: AI Generation
      addLog('🤖 توليد الكود باستخدام Gemini AI...', 'info');
      setBuildProgress(30);

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

      const response = await apiClient.post(`${API_BASE}/api/page-builder/create`, payload);

      if (response.data.ok) {
        addLog('✅ تم توليد الكود بنجاح!', 'success');
        setBuildProgress(60);

        // Step 3: GitHub Push
        addLog('📤 رفع الكود على GitHub...', 'info');
        setBuildProgress(80);
        addLog(`✅ تم الرفع على: ${response.data.githubUrl}`, 'success');

        // Step 4: Deployment
        addLog('🌐 نشر المشروع...', 'info');
        setBuildProgress(95);

        if (response.data.liveUrl) {
          addLog(`✅ المشروع منشور على: ${response.data.liveUrl}`, 'success');
        }

        setBuildProgress(100);
        addLog('🎉 اكتمل البناء بنجاح!', 'success');
        
        setBuildResult(response.data);
        
        // Clear form
        setTitle('');
        setDescription('');
        setFeatures('');
        
        // Refresh jobs
        fetchJobs();
      }
    } catch (err) {
      console.error('Build error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'فشل البناء';
      setError(errorMsg);
      addLog(`❌ خطأ: ${errorMsg}`, 'error');
    } finally {
      setBuilding(false);
    }
  };

  const saveGitHubSettings = () => {
    localStorage.setItem('github_token', githubToken);
    localStorage.setItem('github_username', githubUsername);
    alert('✅ تم حفظ إعدادات GitHub!');
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
      case 'QUEUED': return '⏳';
      case 'WORKING': return '⚙️';
      case 'DONE': return '✅';
      case 'FAILED': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🎨 Build New Project</h1>
        <p className="text-textDim">
          اكتب الوصف → AI يبني → رفع على GitHub → نشر تلقائي!
        </p>
      </div>

      {/* GitHub Settings Banner */}
      {(!githubToken || !githubUsername) && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
          <p className="text-yellow-400 font-medium mb-2">⚠️ يرجى إعداد GitHub أولاً!</p>
          <p className="text-sm text-yellow-300">
            انتقل إلى الأسفل وأدخل GitHub Token و Username لتفعيل البناء التلقائي.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Build Form */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">تفاصيل المشروع</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleBuild} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                نوع المشروع
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="input-field w-full"
                disabled={building}
              >
                <option value="page">صفحة واحدة (Landing Page)</option>
                <option value="website">موقع كامل (Multi-page)</option>
                <option value="store">متجر إلكتروني (E-commerce)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                عنوان المشروع *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field w-full"
                placeholder="مثال: موقع مطعم إيطالي"
                required
                disabled={building}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                وصف المشروع *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field w-full"
                rows={5}
                placeholder="مثال: صفحة رئيسية لمطعم إيطالي مع قائمة طعام، معرض صور للأطباق، نموذج حجز طاولة، ومعلومات الاتصال والموقع"
                required
                disabled={building}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                نمط التصميم
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="input-field w-full"
                disabled={building}
              >
                <option value="modern">Modern - حديث</option>
                <option value="minimal">Minimal - بسيط</option>
                <option value="creative">Creative - إبداعي</option>
                <option value="professional">Professional - احترافي</option>
                <option value="playful">Playful - مرح</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                ميزات إضافية (سطر لكل ميزة)
              </label>
              <textarea
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                className="input-field w-full"
                rows={3}
                placeholder="Contact form&#10;Image gallery&#10;Testimonials section"
                disabled={building}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={building || !githubToken || !githubUsername}
            >
              {building ? '⚙️ جاري البناء...' : '🚀 بناء ونشر'}
            </button>
          </form>
        </div>

        {/* Live Progress & Logs */}
        <div className="space-y-6">
          {/* Progress */}
          {building && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">🔴 عرض مباشر (Live)</h2>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm text-textDim mb-2">
                  <span>التقدم</span>
                  <span>{buildProgress}%</span>
                </div>
                <div className="w-full bg-bgDark rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-500 animate-pulse"
                    style={{ width: `${buildProgress}%` }}
                  />
                </div>
              </div>

              {/* Live Logs */}
              <div className="bg-bgDark rounded-lg p-4 max-h-64 overflow-y-auto">
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
            <div className="card bg-gradient-to-br from-green-500/10 to-teal-500/10 border-green-500/50">
              <h2 className="text-xl font-semibold mb-4 text-green-400">🎉 نجح البناء!</h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-textDim mb-1">GitHub Repository:</p>
                  <a
                    href={buildResult.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {buildResult.githubUrl} ↗
                  </a>
                </div>

                {buildResult.liveUrl && (
                  <div>
                    <p className="text-sm text-textDim mb-1">Live URL:</p>
                    <a
                      href={buildResult.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary hover:underline break-all"
                    >
                      {buildResult.liveUrl} ↗
                    </a>
                  </div>
                )}

                <div className="pt-3 border-t border-borderDim">
                  <p className="text-sm text-textDim">
                    Files Generated: {buildResult.filesGenerated}
                  </p>
                  <p className="text-sm text-textDim">
                    Project Type: {buildResult.projectType}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* GitHub Settings */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">⚙️ إعدادات GitHub</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-textDim mb-2">
                  GitHub Username *
                </label>
                <input
                  type="text"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="your-username"
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-textDim mb-2">
                  GitHub Personal Access Token *
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="input-field w-full"
                />
                <p className="text-xs text-textDim mt-1">
                  احصل عليه من: <a href="https://github.com/settings/tokens" target="_blank" className="text-primary hover:underline">GitHub Settings</a>
                </p>
              </div>

              <button
                onClick={saveGitHubSettings}
                className="btn-secondary w-full"
              >
                💾 حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">📚 المشاريع السابقة</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.length === 0 ? (
            <p className="text-textDim text-center py-8 col-span-full">
              لا توجد مشاريع بعد. ابدأ بإنشاء أول مشروع!
            </p>
          ) : (
            jobs.slice(0, 6).map((job) => (
              <div
                key={job._id}
                className="p-4 bg-bgLight rounded-lg border border-borderDim hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getStatusIcon(job.status)}</span>
                  <span className={`font-semibold text-sm ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                
                <h3 className="font-medium mb-1">{job.title || job.projectType}</h3>
                <p className="text-sm text-textDim line-clamp-2 mb-2">
                  {job.shortDescription}
                </p>

                {job.deploymentUrl && (
                  <a
                    href={job.deploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    🌐 View Live ↗
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
