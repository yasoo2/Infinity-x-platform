import { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.xelitesolutions.com';

export default function SelfDesign() {
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState('modern');
  const [features, setFeatures] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');

  const handleDesignLandingPage = async () => {
    try {
      setLoading(true);
      setError('');
      setGeneratedCode('');

      const featuresList = features
        .split(',')
        .map(f => f.trim())
        .filter(f => f);

      const response = await axios.post(`${API_BASE}/api/self-design/design-landing-page`, {
        style,
        features: featuresList
      });

      if (response.data.ok) {
        setGeneratedCode(response.data.code);
      } else {
        setError('Failed to generate landing page');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LandingPage.jsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🎨 Self-Design System
        </h1>
        <p className="text-gray-600">
          النظام يصمم صفحته الرئيسية بنفسه باستخدام الذكاء الاصطناعي
        </p>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">التصميم والإعدادات</h2>
        
        <div className="space-y-4">
          {/* Style Selection */}
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
              المميزات المراد إبرازها (مفصولة بفواصل)
            </label>
            <input
              type="text"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="AI-powered, Self-evolving, External integrations"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleDesignLandingPage}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري التصميم...
              </span>
            ) : (
              '🎨 صمم الصفحة الرئيسية'
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Generated Code Display */}
      {generatedCode && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">✅ الكود المولّد</h2>
            <button
              onClick={handleDownloadCode}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              📥 تحميل الكود
            </button>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 text-sm font-mono">
              <code>{generatedCode}</code>
            </pre>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📝 التعليمات:</h3>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
              <li>احفظ الكود في ملف <code className="bg-blue-100 px-1 rounded">LandingPage.jsx</code></li>
              <li>ضعه في مجلد <code className="bg-blue-100 px-1 rounded">src/pages/</code></li>
              <li>أضف المسار في <code className="bg-blue-100 px-1 rounded">App.jsx</code></li>
              <li>استمتع بالصفحة الرئيسية الجديدة! 🎉</li>
            </ol>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-900 mb-2">
          🤖 كيف يعمل Self-Design؟
        </h3>
        <ul className="space-y-2 text-purple-800">
          <li>✅ النظام يستخدم <strong>Gemini AI</strong> لتصميم صفحته</li>
          <li>✅ يولد كود React كامل مع Tailwind CSS</li>
          <li>✅ يربط الأزرار تلقائياً بصفحة Build</li>
          <li>✅ تصميم متجاوب ومتوافق مع جميع الأجهزة</li>
          <li>✅ جاهز للاستخدام مباشرة!</li>
        </ul>
      </div>
    </div>
  );
}
