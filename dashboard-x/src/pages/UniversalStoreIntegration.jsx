  import React, { useEffect, useReducer, useCallback } from 'react';
  import { Store, ShoppingCart, TrendingUp, AlertCircle, CheckCircle, Loader, BarChart3, Package, Search, Download } from 'lucide-react';

  // API Configuration
  const API_BASE = import.meta.env?.VITE_API_BASE || 'https://admin.xelitesolutions.com';

  // State Management with useReducer
  const initialState = {
    platforms: [],
    selectedPlatform: 'shopify',
    storeUrl: '',
    authType: 'token',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    customEndpoints: '',
    loading: false,
    connectionResult: null,
    products: null,
    analysis: null,
    error: '',
    successMessage: '',
    validationErrors: {},
    searchTerm: '',
    filterCategory: 'all',
    currentPage: 1,
    itemsPerPage: 9,
  };

  function reducer(state, action) {
    switch (action.type) {
      case 'SET_FIELD':
        return { ...state, [action.field]: action.value, error: '', validationErrors: {} };
      case 'SET_LOADING':
        return { ...state, loading: action.value };
      case 'SET_ERROR':
        return { ...state, error: action.value, loading: false };
      case 'SET_SUCCESS':
        return { ...state, successMessage: action.value, error: '', loading: false };
      case 'SET_PLATFORMS':
        return { ...state, platforms: action.value };
      case 'SET_CONNECTION_RESULT':
        return { ...state, connectionResult: action.value, loading: false, successMessage: 'تم الاتصال بنجاح!' };
      case 'SET_PRODUCTS':
        return { ...state, products: action.value, loading: false };
      case 'SET_ANALYSIS':
        return { ...state, analysis: action.value, loading: false };
      case 'SET_VALIDATION_ERRORS':
        return { ...state, validationErrors: action.value };
      case 'RESET_MESSAGES':
        return { ...state, error: '', successMessage: '' };
      default:
        return state;
    }
  }

  export default function UniversalStoreIntegration() {
    const [state, dispatch] = useReducer(reducer, initialState);

    // Auto-hide messages after 5 seconds
    useEffect(() => {
      if (state.error || state.successMessage) {
        const timer = setTimeout(() => {
          dispatch({ type: 'RESET_MESSAGES' });
        }, 5000);
        return () => clearTimeout(timer);
      }
    }, [state.error, state.successMessage]);

    // Fetch platforms on mount
    useEffect(() => {
      fetchPlatforms();
    }, []);

    // Fetch platforms from API
    const fetchPlatforms = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/universal-store/platforms`);
        const data = await response.json();
        if (data.ok) {
          dispatch({ type: 'SET_PLATFORMS', value: data.platforms });
        } else {
          // Fallback platforms if API fails
          dispatch({ 
            type: 'SET_PLATFORMS', 
            value: [
              { id: 'shopify', name: 'Shopify', authType: 'token' },
              { id: 'woocommerce', name: 'WooCommerce', authType: 'basic' },
              { id: 'magento', name: 'Magento', authType: 'bearer' },
              { id: 'prestashop', name: 'PrestaShop', authType: 'apikey' },
              { id: 'opencart', name: 'OpenCart', authType: 'token' },
              { id: 'bigcommerce', name: 'BigCommerce', authType: 'token' },
              { id: 'custom', name: 'Custom API', authType: 'custom' },
            ]
          });
        }
      } catch (err) {
        console.error('Error fetching platforms:', err);
        // Fallback platforms
        dispatch({ 
          type: 'SET_PLATFORMS', 
          value: [
            { id: 'shopify', name: 'Shopify', authType: 'token' },
            { id: 'woocommerce', name: 'WooCommerce', authType: 'basic' },
            { id: 'magento', name: 'Magento', authType: 'bearer' },
            { id: 'prestashop', name: 'PrestaShop', authType: 'apikey' },
            { id: 'opencart', name: 'OpenCart', authType: 'token' },
            { id: 'bigcommerce', name: 'BigCommerce', authType: 'token' },
            { id: 'custom', name: 'Custom API', authType: 'custom' },
          ]
        });
      }
    };

    // Validation function
    const validateInputs = useCallback(() => {
      const errors = {};
      
      if (!state.storeUrl) {
        errors.storeUrl = 'رابط المتجر مطلوب';
      } else if (!/^https?:\/\/.+\..+/.test(state.storeUrl)) {
        errors.storeUrl = 'رابط المتجر غير صالح (يجب أن يبدأ بـ http:// أو https://)';
      }

      if (state.authType === 'token' && !state.apiKey) {
        errors.apiKey = 'مفتاح API مطلوب';
      }

      if (state.authType === 'basic' && (!state.apiKey || !state.apiSecret)) {
        errors.apiKey = 'اسم المستخدم مطلوب';
        errors.apiSecret = 'كلمة المرور مطلوبة';
      }

      if (state.selectedPlatform === 'custom' && !state.customEndpoints) {
        errors.customEndpoints = 'يجب تحديد نقاط النهاية المخصصة';
      }

      if (state.customEndpoints) {
        try {
          JSON.parse(state.customEndpoints);
        } catch {
          errors.customEndpoints = 'JSON غير صالح';
        }
      }

      dispatch({ type: 'SET_VALIDATION_ERRORS', value: errors });
      return Object.keys(errors).length === 0;
    }, [state.storeUrl, state.authType, state.apiKey, state.apiSecret, state.selectedPlatform, state.customEndpoints]);

    // API call wrapper with error handling
    const apiCall = async (endpoint, payload) => {
      try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'حدث خطأ في الاتصال');
        }

        return data;
      } catch (err) {
        throw new Error(err.message || 'فشل الاتصال بالخادم');
      }
    };

    // Build payload
    const buildPayload = (additionalData = {}) => ({
      platform: state.selectedPlatform,
      storeUrl: state.storeUrl,
      authType: state.authType,
      apiKey: state.apiKey,
      apiSecret: state.apiSecret,
      accessToken: state.accessToken,
      customEndpoints: state.customEndpoints ? JSON.parse(state.customEndpoints) : null,
      ...additionalData,
    });

    // Handle Connect
    const handleConnect = async () => {
      if (!validateInputs()) return;

      dispatch({ type: 'SET_LOADING', value: true });

      try {
        const data = await apiCall('/api/universal-store/connect', buildPayload());
        
        if (data.ok) {
          dispatch({ type: 'SET_CONNECTION_RESULT', value: data });
        }
      } catch (err) {
        dispatch({ type: 'SET_ERROR', value: err.message });
      }
    };

    // Handle Fetch Products
    const handleFetchProducts = async () => {
      if (!validateInputs()) return;

      dispatch({ type: 'SET_LOADING', value: true });

      try {
        const data = await apiCall('/api/universal-store/fetch-products', buildPayload({ limit: 50 }));
        
        if (data.ok) {
          dispatch({ type: 'SET_PRODUCTS', value: data.products });
          dispatch({ type: 'SET_SUCCESS', value: `تم جلب ${data.products.length} منتج بنجاح!` });
        }
      } catch (err) {
        dispatch({ type: 'SET_ERROR', value: err.message });
      }
    };

    // Handle Analyze
    const handleAnalyze = async () => {
      if (!validateInputs()) return;

      dispatch({ type: 'SET_LOADING', value: true });

      try {
        const data = await apiCall('/api/universal-store/analyze', buildPayload({ 
          analysisGoals: 'Comprehensive store optimization with SEO, CRO, and performance analysis' 
        }));
        
        if (data.ok) {
          dispatch({ type: 'SET_ANALYSIS', value: data.analysis });
          dispatch({ type: 'SET_SUCCESS', value: 'تم تحليل المتجر بنجاح!' });
        }
      } catch (err) {
        dispatch({ type: 'SET_ERROR', value: err.message });
      }
    };

    // Export data as JSON
    const handleExportData = () => {
      const exportData = {
        connectionResult: state.connectionResult,
        products: state.products,
        analysis: state.analysis,
        timestamp: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `store-data-${Date.now()}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    };

    // Filter and search products
    const filteredProducts = state.products?.filter(product => {
      const title = product.title || product.name || '';
      const matchesSearch = title.toLowerCase().includes(state.searchTerm.toLowerCase());
      return matchesSearch;
    }) || [];

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / state.itemsPerPage);
    const paginatedProducts = filteredProducts.slice(
      (state.currentPage - 1) * state.itemsPerPage,
      state.currentPage * state.itemsPerPage
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
                <Store className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Universal Store Integration
              </h1>
            </div>
            <p className="text-gray-600 text-lg">
              ربط ذكي مع أي متجر إلكتروني - تحليل شامل بالذكاء الاصطناعي
            </p>
          </div>

          {/* Notifications */}
          {state.error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-800 font-medium">{state.error}</p>
              </div>
            </div>
          )}

          {state.successMessage && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 rounded-lg p-4 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p className="text-green-800 font-medium">{state.successMessage}</p>
              </div>
            </div>
          )}

          {/* Configuration Panel */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">إعدادات الاتصال</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Platform Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  اختر المنصة
                </label>
                <select
                  value={state.selectedPlatform}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'selectedPlatform', value: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                >
                  {state.platforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.name} ({platform.authType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Store URL */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  رابط المتجر
                </label>
                <input
                  type="text"
                  value={state.storeUrl}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'storeUrl', value: e.target.value })}
                  placeholder="https://your-store.com"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    state.validationErrors.storeUrl ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
                  }`}
                />
                {state.validationErrors.storeUrl && (
                  <p className="text-red-500 text-sm mt-1">{state.validationErrors.storeUrl}</p>
                )}
              </div>

              {/* Auth Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  نوع المصادقة
                </label>
                <select
                  value={state.authType}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'authType', value: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                >
                  <option value="token">Token / API Key</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="apikey">API Key Header</option>
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  API Key / Username
                </label>
                <input
                  type="text"
                  value={state.apiKey}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'apiKey', value: e.target.value })}
                  placeholder="API Key or Username"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    state.validationErrors.apiKey ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
                  }`}
                />
                {state.validationErrors.apiKey && (
                  <p className="text-red-500 text-sm mt-1">{state.validationErrors.apiKey}</p>
                )}
              </div>

              {/* API Secret */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  API Secret / Password
                </label>
                <input
                  type="password"
                  value={state.apiSecret}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'apiSecret', value: e.target.value })}
                  placeholder="API Secret or Password"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    state.validationErrors.apiSecret ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
                  }`}
                />
                {state.validationErrors.apiSecret && (
                  <p className="text-red-500 text-sm mt-1">{state.validationErrors.apiSecret}</p>
                )}
              </div>

              {/* Access Token */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Access Token (اختياري)
                </label>
                <input
                  type="password"
                  value={state.accessToken}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'accessToken', value: e.target.value })}
                  placeholder="Access Token"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                />
              </div>

              {/* Custom Endpoints */}
              {state.selectedPlatform === 'custom' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Custom Endpoints (JSON)
                  </label>
                  <textarea
                    value={state.customEndpoints}
                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'customEndpoints', value: e.target.value })}
                    placeholder='{"products": "/api/products", "test": "/api/health"}'
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      state.validationErrors.customEndpoints ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
                    }`}
                    rows="3"
                  />
                  {state.validationErrors.customEndpoints && (
                    <p className="text-red-500 text-sm mt-1">{state.validationErrors.customEndpoints}</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <button
                onClick={handleConnect}
                disabled={state.loading}
                className="bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                {state.loading ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                اختبار الاتصال
              </button>

              <button
                onClick={handleFetchProducts}
                disabled={state.loading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                {state.loading ? <Loader className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
                جلب المنتجات
              </button>

              <button
                onClick={handleAnalyze}
                disabled={state.loading}
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                {state.loading ? <Loader className="w-5 h-5 animate-spin" /> : <BarChart3 className="w-5 h-5" />}
                تحليل المتجر
              </button>

              <button
                onClick={handleExportData}
                disabled={!state.products && !state.analysis}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                تصدير البيانات
              </button>
            </div>
          </div>

          {/* Connection Result */}
          {state.connectionResult && (
            <div className="bg-gradient-to-r from-green-50 to-teal-50 border-l-4 border-green-500 rounded-2xl p-6 mb-6 shadow-lg animate-fade-in">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-green-900 mb-3">✅ اتصال ناجح!</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <span className="font-semibold text-gray-700">المنصة:</span>
                      <span className="text-gray-900 mr-2">{state.connectionResult.platform}</span>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <span className="font-semibold text-gray-700">الرابط:</span>
                      <span className="text-gray-900 mr-2 truncate block">{state.connectionResult.storeUrl}</span>
                    </div>
                  </div>
                  {state.connectionResult.storeData?.dataPreview && (
                    <div className="mt-3 bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-gray-700 text-sm">{state.connectionResult.storeData.dataPreview}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Products Display */}
          {state.products && state.products.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Package className="w-6 h-6 text-blue-600" />
                  <h3 className="text-2xl font-bold text-gray-900">
                    المنتجات ({filteredProducts.length})
                  </h3>
                </div>
                
                {/* Search */}
                <div className="relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={state.searchTerm}
                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'searchTerm', value: e.target.value })}
                    placeholder="بحث..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedProducts.map((product, i) => (
                  <div key={i} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all transform hover:scale-105">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-bold text-gray-900 text-lg flex-1">
                        {product.title || product.name || `Product ${i + 1}`}
                      </h4>
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                        #{i + 1}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">السعر:</span>
                        <span className="font-semibold text-green-600">
                          {product.price || product.variants?.[0]?.price || 'N/A'}
                        </span>
                      </div>
                      {product.sku && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">SKU:</span>
                          <span className="font-mono text-gray-900">{product.sku}</span>
                        </div>
                      )}
                      {product.inventory_quantity !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">المخزون:</span>
                          <span className={`font-semibold ${product.inventory_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {product.inventory_quantity}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => dispatch({ type: 'SET_FIELD', field: 'currentPage', value: Math.max(1, state.currentPage - 1) })}
                    disabled={state.currentPage === 1}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    السابق
                  </button>
                  <span className="text-gray-700 font-medium">
                    صفحة {state.currentPage} من {totalPages}
                  </span>
                  <button
                    onClick={() => dispatch({ type: 'SET_FIELD', field: 'currentPage', value: Math.min(totalPages, state.currentPage + 1) })}
                    disabled={state.currentPage === totalPages}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    التالي
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Analysis Display */}
          {state.analysis && (
            <div className="space-y-6">
              {/* Health Score */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 shadow-xl text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-10 h-10" />
                    <div>
                      <h3 className="text-3xl font-bold">Store Health Score</h3>
                      <p className="text-blue-100">تقييم شامل لأداء المتجر</p>
                    </div>
                  </div>
                  <div className="text-5xl font-bold">{state.analysis.healthScore}/100</div>
                </div>
                <div className="w-full bg-white bg-opacity-30 rounded-full h-6 overflow-hidden">
                  <div 
                    className="bg-white h-6 rounded-full transition-all duration-1000 ease-out flex items-center justify-end px-3"
                    style={{ width: `${state.analysis.healthScore}%` }}
                  >
                    <span className="text-blue-600 font-bold text-sm">{state.analysis.healthScore}%</span>
                  </div>
                </div>
              </div>

              {/* Critical Issues */}
              {state.analysis.criticalIssues && state.analysis.criticalIssues.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-7 h-7 text-red-600" />
                    <h3 className="text-2xl font-bold text-red-900">مشاكل حرجة</h3>
                  </div>
                  <ul className="space-y-3">
                    {state.analysis.criticalIssues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm">
                        <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="text-red-800 flex-1">{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quick Wins */}
              {state.analysis.quickWins && state.analysis.quickWins.length > 0 && (
                <div className="bg-green-50 border-l-4 border-green-500 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-7 h-7 text-green-600" />
                    <h3 className="text-2xl font-bold text-green-900">تحسينات سريعة ⚡</h3>
                  </div>
                  <ul className="space-y-3">
                    {state.analysis.quickWins.map((win, i) => (
                      <li key={i} className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm">
                        <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="text-green-800 flex-1">{win}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SEO & CRO Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SEO Improvements */}
                {state.analysis.seoImprovements && state.analysis.seoImprovements.length > 0 && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <Search className="w-7 h-7 text-blue-600" />
                      <h3 className="text-xl font-bold text-blue-900">تحسينات SEO 🔍</h3>
                    </div>
                    <ul className="space-y-2">
                      {state.analysis.seoImprovements.map((seo, i) => (
                        <li key={i} className="flex items-start gap-2 text-blue-800 text-sm">
                          <span className="text-blue-500 mt-1">▸</span>
                          <span className="flex-1">{seo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CRO Improvements */}
                {state.analysis.conversionOptimization && state.analysis.conversionOptimization.length > 0 && (
                  <div className="bg-purple-50 border-l-4 border-purple-500 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <TrendingUp className="w-7 h-7 text-purple-600" />
                      <h3 className="text-xl font-bold text-purple-900">تحسينات التحويل 💰</h3>
                    </div>
                    <ul className="space-y-2">
                      {state.analysis.conversionOptimization.map((cro, i) => (
                        <li key={i} className="flex items-start gap-2 text-purple-800 text-sm">
                          <span className="text-purple-500 mt-1">▸</span>
                          <span className="flex-1">{cro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 shadow-xl text-white">
            <div className="flex items-start gap-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-xl">
                <Store className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">🌐 Universal Store Integration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>يدعم <strong>أي منصة</strong> تجارة إلكترونية</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Shopify, WooCommerce, Magento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>PrestaShop, OpenCart, BigCommerce</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Custom APIs - أي متجر مخصص</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>تحليل ذكي بالـ AI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>توصيات مخصصة لكل متجر</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
