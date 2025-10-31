import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.xelitesolutions.com';

export default function UniversalStoreIntegration() {
  const [platforms, setPlatforms] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState('shopify');
  const [storeUrl, setStoreUrl] = useState('');
  const [authType, setAuthType] = useState('token');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [customEndpoints, setCustomEndpoints] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [connectionResult, setConnectionResult] = useState(null);
  const [products, setProducts] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/universal-store/platforms`);
      if (response.data.ok) {
        setPlatforms(response.data.platforms);
      }
    } catch (err) {
      console.error('Error fetching platforms:', err);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');
      setConnectionResult(null);

      const payload = {
        platform: selectedPlatform,
        storeUrl,
        authType,
        apiKey,
        apiSecret,
        accessToken,
        customEndpoints: customEndpoints ? JSON.parse(customEndpoints) : null
      };

      const response = await axios.post(`${API_BASE}/api/universal-store/connect`, payload);

      if (response.data.ok) {
        setConnectionResult(response.data);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      setProducts(null);

      const payload = {
        platform: selectedPlatform,
        storeUrl,
        authType,
        apiKey,
        apiSecret,
        accessToken,
        customEndpoints: customEndpoints ? JSON.parse(customEndpoints) : null,
        limit: 10
      };

      const response = await axios.post(`${API_BASE}/api/universal-store/fetch-products`, payload);

      if (response.data.ok) {
        setProducts(response.data.products);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setError('');
      setAnalysis(null);

      const payload = {
        platform: selectedPlatform,
        storeUrl,
        authType,
        apiKey,
        apiSecret,
        accessToken,
        customEndpoints: customEndpoints ? JSON.parse(customEndpoints) : null,
        analysisGoals: 'Comprehensive store optimization'
      };

      const response = await axios.post(`${API_BASE}/api/universal-store/analyze`, payload);

      if (response.data.ok) {
        setAnalysis(response.data.analysis);
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
          🌐 Universal Store Integration
        </h1>
        <p className="text-gray-600">
          ربط مع **أي متجر إلكتروني** - Shopify, WooCommerce, Magento, Custom APIs, وأكثر!
        </p>
      </div>

      {/* Platform Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">إعدادات المنصة</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Platform Selection */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر المنصة
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name} ({platform.authType})
                </option>
              ))}
            </select>
          </div>

          {/* Store URL */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رابط المتجر
            </label>
            <input
              type="text"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              placeholder="https://your-store.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Auth Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع المصادقة
            </label>
            <select
              value={authType}
              onChange={(e) => setAuthType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="token">Token / API Key</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="apikey">API Key Header</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key / Username
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key or Username"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* API Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Secret / Password (اختياري)
            </label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="API Secret or Password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Token (اختياري)
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Access Token"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Custom Endpoints */}
          {selectedPlatform === 'custom' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Endpoints (JSON)
              </label>
              <textarea
                value={customEndpoints}
                onChange={(e) => setCustomEndpoints(e.target.value)}
                placeholder='{"products": "/api/products", "test": "/api/health"}'
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <button
            onClick={handleConnect}
            disabled={loading || !storeUrl}
            className="bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 px-6 rounded-lg font-medium hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'جاري الاتصال...' : '🔗 اختبار الاتصال'}
          </button>

          <button
            onClick={handleFetchProducts}
            disabled={loading || !storeUrl}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'جاري الجلب...' : '📦 جلب المنتجات'}
          </button>

          <button
            onClick={handleAnalyze}
            disabled={loading || !storeUrl}
            className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-6 rounded-lg font-medium hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'جاري التحليل...' : '🔍 تحليل المتجر'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Connection Result */}
      {connectionResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-green-900 mb-2">✅ اتصال ناجح!</h3>
          <p className="text-green-800"><strong>المنصة:</strong> {connectionResult.platform}</p>
          <p className="text-green-800"><strong>الرابط:</strong> {connectionResult.storeUrl}</p>
          <p className="text-green-800 text-sm mt-2">{connectionResult.storeData.dataPreview}</p>
        </div>
      )}

      {/* Products Display */}
      {products && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">📦 المنتجات ({products.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.slice(0, 9).map((product, i) => (
              <div key={i} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {product.title || product.name || 'Product ' + (i + 1)}
                </h4>
                <p className="text-sm text-gray-600">
                  {product.price || product.variants?.[0]?.price || 'N/A'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Display */}
      {analysis && (
        <div className="space-y-4">
          {/* Health Score */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-2xl font-bold text-blue-900 mb-2">
              📊 Store Health Score: {analysis.healthScore}/100
            </h3>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all"
                style={{ width: `${analysis.healthScore}%` }}
              ></div>
            </div>
          </div>

          {/* Critical Issues */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="font-semibold text-red-900 mb-3">⚠️ مشاكل حرجة</h3>
            <ul className="list-disc list-inside space-y-2 text-red-800">
              {analysis.criticalIssues?.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>

          {/* Quick Wins */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-3">⚡ تحسينات سريعة</h3>
            <ul className="list-disc list-inside space-y-2 text-green-800">
              {analysis.quickWins?.map((win, i) => (
                <li key={i}>{win}</li>
              ))}
            </ul>
          </div>

          {/* SEO & CRO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">🔍 تحسينات SEO</h3>
              <ul className="list-disc list-inside space-y-2 text-blue-800 text-sm">
                {analysis.seoImprovements?.map((seo, i) => (
                  <li key={i}>{seo}</li>
                ))}
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="font-semibold text-purple-900 mb-3">💰 تحسينات التحويل</h3>
              <ul className="list-disc list-inside space-y-2 text-purple-800 text-sm">
                {analysis.conversionOptimization?.map((cro, i) => (
                  <li key={i}>{cro}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-200">
        <h3 className="text-lg font-semibold text-indigo-900 mb-2">
          🌐 Universal Store Integration
        </h3>
        <ul className="space-y-2 text-indigo-800">
          <li>✅ يدعم <strong>أي منصة</strong> تجارة إلكترونية</li>
          <li>✅ Shopify, WooCommerce, Magento, PrestaShop, OpenCart, BigCommerce</li>
          <li>✅ Custom APIs - أي متجر مخصص</li>
          <li>✅ تحليل ذكي بالـ AI</li>
          <li>✅ توصيات مخصصة لكل متجر</li>
        </ul>
      </div>
    </div>
  );
}
