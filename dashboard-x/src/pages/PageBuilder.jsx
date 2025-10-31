import { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.xelitesolutions.com';

export default function PageBuilder() {
  const [projectType, setProjectType] = useState('page');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('modern');
  const [features, setFeatures] = useState('');
  
  // GitHub settings
  const [githubToken, setGithubToken] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [repoName, setRepoName] = useState('');
  
  // Cloudflare settings (optional)
  const [cloudflareAccountId, setCloudflareAccountId] = useState('');
  const [cloudflareApiToken, setCloudflareApiToken] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('build');

  const handlePreview = async () => {
    try {
      setLoading(true);
      setError('');
      setPreview(null);

      const featuresList = features
        .split(',')
        .map(f => f.trim())
        .filter(f => f);

      const response = await axios.post(`${API_BASE}/api/page-builder/preview`, {
        projectType,
        description,
        style,
        features: featuresList
      });

      if (response.data.ok) {
        setPreview(response.data.code);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError('');
      setResult(null);

      if (!githubToken || !githubUsername) {
        setError('GitHub Token and Username are required for deployment');
        setLoading(false);
        return;
      }

      const featuresList = features
        .split(',')
        .map(f => f.trim())
        .filter(f => f);

      const response = await axios.post(`${API_BASE}/api/page-builder/create`, {
        projectType,
        description,
        style,
        features: featuresList,
        githubToken,
        githubUsername,
        repoName: repoName || undefined,
        cloudflareAccountId: cloudflareAccountId || undefined,
        cloudflareApiToken: cloudflareApiToken || undefined
      });

      if (response.data.ok) {
        setResult(response.data);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🎨 AI Page Builder
        </h1>
        <p className="text-gray-600">
          اكتب الوصف → AI يبرمج → رفع على GitHub → نشر تلقائي!
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('build')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'build'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🎨 Build
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'settings'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Build Tab */}
      {activeTab === 'build' && (
        <div className="space-y-6">
          {/* Project Configuration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">تفاصيل المشروع</h2>
            
            <div className="space-y-4">
              {/* Project Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع المشروع
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="page">صفحة واحدة (Landing Page)</option>
                  <option value="website">موقع كامل (Multi-page Website)</option>
                  <option value="store">متجر إلكتروني (E-commerce Store)</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  وصف المشروع *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: صفحة رئيسية لمطعم إيطالي مع قائمة طعام، معرض صور، ونموذج حجز طاولة"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                />
              </div>

              {/* Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نمط التصميم
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="modern">Modern - حديث</option>
                  <option value="minimal">Minimal - بسيط</option>
                  <option value="creative">Creative - إبداعي</option>
                  <option value="professional">Professional - احترافي</option>
                  <option value="playful">Playful - مرح</option>
                </select>
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ميزات إضافية (مفصولة بفواصل)
                </label>
                <input
                  type="text"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder="Contact form, Image gallery, Testimonials"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <button
                onClick={handlePreview}
                disabled={loading || !description}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'جاري التوليد...' : '👀 معاينة الكود'}
              </button>

              <button
                onClick={handleCreate}
                disabled={loading || !description || !githubToken || !githubUsername}
                className="bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 px-6 rounded-lg font-medium hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'جاري النشر...' : '🚀 بناء ونشر'}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">❌ {error}</p>
            </div>
          )}

          {/* Preview Display */}
          {preview && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold mb-4">👀 معاينة الكود</h3>
              <div className="space-y-4">
                {Object.entries(preview).map(([filename, code]) => (
                  <div key={filename}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{filename}</h4>
                      <span className="text-sm text-gray-500">{code.length} chars</span>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto max-h-96">
                      <pre className="text-green-400 text-sm font-mono">
                        <code>{code}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-2xl font-bold text-green-900 mb-4">✅ نجح النشر!</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-green-700 font-medium">Repository:</p>
                  <a 
                    href={result.githubUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {result.githubUrl}
                  </a>
                </div>
                {result.liveUrl && (
                  <div>
                    <p className="text-sm text-green-700 font-medium">Live URL:</p>
                    <a 
                      href={result.liveUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {result.liveUrl}
                    </a>
                  </div>
                )}
                <div>
                  <p className="text-sm text-green-700">Files Generated: {result.filesGenerated}</p>
                  <p className="text-sm text-green-700">Project Type: {result.projectType}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">إعدادات النشر</h2>
          
          <div className="space-y-6">
            {/* GitHub Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">GitHub Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub Username *
                  </label>
                  <input
                    type="text"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    placeholder="your-username"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub Personal Access Token *
                  </label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    احصل عليه من: https://github.com/settings/tokens
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repository Name (اختياري)
                  </label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="my-awesome-project"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    إذا تركته فارغاً، سيتم توليد اسم تلقائياً
                  </p>
                </div>
              </div>
            </div>

            {/* Cloudflare Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Cloudflare Pages (اختياري)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account ID
                  </label>
                  <input
                    type="text"
                    value={cloudflareAccountId}
                    onChange={(e) => setCloudflareAccountId(e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Token
                  </label>
                  <input
                    type="password"
                    value={cloudflareApiToken}
                    onChange={(e) => setCloudflareApiToken(e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          🚀 كيف يعمل Page Builder؟
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>✍️ اكتب وصف المشروع الذي تريده</li>
          <li>🤖 AI يولد الكود الكامل (HTML, CSS, JS)</li>
          <li>📤 رفع تلقائي على GitHub</li>
          <li>🌐 نشر على GitHub Pages أو Cloudflare</li>
          <li>🎉 رابط جاهز للمشاركة!</li>
        </ol>
      </div>
    </div>
  );
}
