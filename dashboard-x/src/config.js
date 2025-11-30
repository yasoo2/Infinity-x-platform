  import React, { useState, useEffect, useReducer, useCallback } from 'react';
  import { Store, TrendingUp, AlertCircle, CheckCircle, Loader, BarChart3, Package, Search, Download, Zap, Activity, Globe, Lock, Key, Server, Database, Eye, EyeOff, Sparkles, Target, Rocket, Settings } from 'lucide-react';

  // API Configuration - متوافق مع نظامك
  const getApiConfig = () => {
    const isDevelopment = import.meta.env.MODE !== 'production';
    return {
      apiBaseUrl: isDevelopment 
        ? 'http://localhost:4000/api/v1'
        : 'https://api.xelitesolutions.com/api/v1',
      // عرض عنوان الأساس للـ WebSocket فقط؛ مسار joe-agent يُضاف على مستوى الربط
      wsBaseUrl: isDevelopment
        ? 'ws://localhost:4000'
        : 'wss://api.xelitesolutions.com'
    };
  };

  const API_CONFIG = getApiConfig();

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
    showApiKey: false,
    showApiSecret: false,
    showAccessToken: false,
    connectionStatus: 'disconnected',
    apiStats: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastRequestTime: null,
    },
  };

  function reducer(state, action) {
    switch (action.type) {
      case 'SET_FIELD':
        return { ...state, [action.field]: action.value, error: '', validationErrors: {} };
      case 'SET_LOADING':
        return { ...state, loading: action.value };
      case 'SET_ERROR':
        return { 
          ...state, 
          error: action.value, 
          loading: false, 
          connectionStatus: 'error',
          apiStats: {
            ...state.apiStats,
            failedRequests: state.apiStats.failedRequests + 1,
            lastRequestTime: new Date().toISOString(),
          }
        };
      case 'SET_SUCCESS':
        return { 
          ...state, 
          successMessage: action.value, 
          error: '', 
          loading: false,
          apiStats: {
            ...state.apiStats,
            successfulRequests: state.apiStats.successfulRequests + 1,
            lastRequestTime: new Date().toISOString(),
          }
        };
      case 'SET_PLATFORMS':
        return { ...state, platforms: action.value };
      case 'SET_CONNECTION_RESULT':
        return { 
          ...state, 
          connectionResult: action.value, 
          loading: false, 
          successMessage: 'تم الاتصال بنجاح!', 
          connectionStatus: 'connected',
          apiStats: {
            ...state.apiStats,
            successfulRequests: state.apiStats.successfulRequests + 1,
            lastRequestTime: new Date().toISOString(),
          }
        };
      case 'SET_PRODUCTS':
        return { ...state, products: action.value, loading: false };
      case 'SET_ANALYSIS':
        return { ...state, analysis: action.value, loading: false };
      case 'SET_VALIDATION_ERRORS':
        return { ...state, validationErrors: action.value };
      case 'RESET_MESSAGES':
        return { ...state, error: '', successMessage: '' };
      case 'SET_CONNECTION_STATUS':
        return { ...state, connectionStatus: action.value };
      case 'TOGGLE_VISIBILITY':
        return { ...state, [action.field]: !state[action.field] };
      case 'INCREMENT_REQUESTS':
        return {
          ...state,
          apiStats: {
            ...state.apiStats,
            totalRequests: state.apiStats.totalRequests + 1,
          }
        };
      default:
        return state;
    }
  }

  export default function UniversalStoreIntegration() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [showConfig, setShowConfig] = useState(false);

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
      dispatch({ type: 'INCREMENT_REQUESTS' });
      try {
        const response = await fetch(`${API_CONFIG.apiBaseUrl}/universal-store/platforms`);
        const data = await response.json();
        if (data.ok) {
          dispatch({ type: 'SET_PLATFORMS', value: data.platforms });
        } else {
          dispatch({ 
            type: 'SET_PLATFORMS', 
            value: [
              { id: 'shopify', name: 'Shopify', authType: 'token', icon: '🛍️', color: '#96bf48' },
              { id: 'woocommerce', name: 'WooCommerce', authType: 'basic', icon: '🔷', color: '#96588a' },
              { id: 'magento', name: 'Magento', authType: 'bearer', icon: '🔶', color: '#f26322' },
              { id: 'prestashop', name: 'PrestaShop', authType: 'apikey', icon: '🔵', color: '#df0067' },
              { id: 'opencart', name: 'OpenCart', authType: 'token', icon: '🟢', color: '#2ac2ef' },
              { id: 'bigcommerce', name: 'BigCommerce', authType: 'token', icon: '🔴', color: '#121118' },
              { id: 'custom', name: 'Custom API', authType: 'custom', icon: '⚙️', color: '#4dff91' },
            ]
          });
        }
      } catch (err) {
        console.error('Error fetching platforms:', err);
        dispatch({ 
          type: 'SET_PLATFORMS', 
          value: [
            { id: 'shopify', name: 'Shopify', authType: 'token', icon: '🛍️', color: '#96bf48' },
            { id: 'woocommerce', name: 'WooCommerce', authType: 'basic', icon: '🔷', color: '#96588a' },
            { id: 'magento', name: 'Magento', authType: 'bearer', icon: '🔶', color: '#f26322' },
            { id: 'prestashop', name: 'PrestaShop', authType: 'apikey', icon: '🔵', color: '#df0067' },
            { id: 'opencart', name: 'OpenCart', authType: 'token', icon: '🟢', color: '#2ac2ef' },
            { id: 'bigcommerce', name: 'BigCommerce', authType: 'token', icon: '🔴', color: '#121118' },
            { id: 'custom', name: 'Custom API', authType: 'custom', icon: '⚙️', color: '#4dff91' },
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
      dispatch({ type: 'INCREMENT_REQUESTS' });
      try {
        const response = await fetch(`${API_CONFIG.apiBaseUrl}${endpoint}`, {
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
      dispatch({ type: 'SET_CONNECTION_STATUS', value: 'connecting' });

      try {
        const data = await apiCall('/universal-store/connect', buildPayload());
        
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
        const data = await apiCall('/universal-store/fetch-products', buildPayload({ limit: 50 }));
        
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
        const data = await apiCall('/universal-store/analyze', buildPayload({ 
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
        apiConfig: {
          environment: import.meta.env.MODE,
          apiBaseUrl: API_CONFIG.apiBaseUrl,
        }
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

    // Get connection status badge
    const getConnectionStatusBadge = () => {
      switch (state.connectionStatus) {
        case 'connected':
          return (
            <div className="status-badge status-online flex items-center gap-2">
              <Activity className="w-3 h-3 animate-pulse" />
              متصل
            </div>
          );
        case 'connecting':
          return (
            <div className="status-badge bg-yellow-500/20 text-yellow-400 border-yellow-500/50 flex items-center gap-2">
              <Loader className="w-3 h-3 animate-spin" />
              جاري الاتصال
            </div>
          );
        case 'error':
          return (
            <div className="status-badge status-offline flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              خطأ
            </div>
          );
        default:
          return (
            <div className="status-badge bg-gray-500/20 text-gray-400 border-gray-500/50 flex items-center gap-2">
              <Globe className="w-3 h-3" />
              غير متصل
            </div>
          );
      }
    };

    return (
      <div className="min-h-screen p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with Glow Effect */}
          <div className="mb-8 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#4dff91]/20 via-[#3d7eff]/20 to-[#ff38a4]/20 blur-3xl -z-10"></div>
            <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
              <div className="relative">
                <div className="absolute inset-0 bg-[#4dff91] blur-xl opacity-50"></div>
                <div className="relative bg-gradient-to-br from-[#4dff91] to-[#3d7eff] p-4 rounded-2xl shadow-2xl">
                  <Store className="w-10 h-10 text-[#0a0b10]" />
                </div>
              </div>
              <div className="text-center md:text-right">
                <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#4dff91] via-[#3d7eff] to-[#ff38a4] bg-clip-text text-transparent mb-2">
                  Universal Store Integration
                </h1>
                <p className="text-[#8b8ea8] text-base md:text-lg flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#4dff91]" />
                  ربط ذكي مع أي متجر إلكتروني - تحليل شامل بالذكاء الاصطناعي
                </p>
              </div>
            </div>
            
            {/* Status and Config Bar */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {getConnectionStatusBadge()}
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="status-badge bg-[#3d7eff]/20 text-[#3d7eff] border-[#3d7eff]/50 hover:bg-[#3d7eff]/30 transition-all cursor-pointer flex items-center gap-2"
              >
                <Settings className="w-3 h-3" />
                {showConfig ? 'إخفاء' : 'عرض'} الإعدادات
              </button>
            </div>

            {/* API Config Display */}
            {showConfig && (
              <div className="mt-4 card border border-[#3d7eff]/30 bg-[#3d7eff]/5 animate-fade-in">
                <div className="flex items-center gap-3 mb-3">
                  <Server className="w-5 h-5 text-[#3d7eff]" />
                  <h3 className="text-lg font-bold text-[#3d7eff]">إعدادات API</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-[#141622] rounded-lg p-3 border border-[#8b8ea8]/20">
                    <span className="text-[#8b8ea8]">البيئة:</span>
                    <span className="text-white mr-2 font-semibold">
                      {import.meta.env.MODE === 'production' ? '🟢 Production' : '🟡 Development'}
                    </span>
                  </div>
                  <div className="bg-[#141622] rounded-lg p-3 border border-[#8b8ea8]/20">
                    <span className="text-[#8b8ea8]">API URL:</span>
                    <span className="text-white mr-2 font-mono text-xs truncate block">{API_CONFIG.apiBaseUrl}</span>
                  </div>
                  <div className="bg-[#141622] rounded-lg p-3 border border-[#8b8ea8]/20">
                    <span className="text-[#8b8ea8]">WebSocket:</span>
                    <span className="text-white mr-2 font-mono text-xs truncate block">{API_CONFIG.wsBaseUrl}</span>
                  </div>
                  <div className="bg-[#141622] rounded-lg p-3 border border-[#8b8ea8]/20">
                    <span className="text-[#8b8ea8]">إجمالي الطلبات:</span>
                    <span className="text-[#4dff91] mr-2 font-bold">{state.apiStats.totalRequests}</span>
                  </div>
                  <div className="bg-[#141622] rounded-lg p-3 border border-[#8b8ea8]/20">
                    <span className="text-[#8b8ea8]">طلبات ناجحة:</span>
                    <span className="text-[#4dff91] mr-2 font-bold">{state.apiStats.successfulRequests}</span>
                  </div>
                  <div className="bg-[#141622] rounded-lg p-3 border border-[#8b8ea8]/20">
                    <span className="text-[#8b8ea8]">طلبات فاشلة:</span>
                    <span className="text-red-400 mr-2 font-bold">{state.apiStats.failedRequests}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          {state.error && (
            <div className="mb-6 card border-l-4 border-red-500 bg-red-500/10 backdrop-blur-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="bg-red-500/20 p-2 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-red-400 font-semibold">خطأ</p>
                  <p className="text-red-300 text-sm">{state.error}</p>
                </div>
              </div>
            </div>
          )}

          {state.successMessage && (
            <div className="mb-6 card border-l-4 border-[#4dff91] bg-[#4dff91]/10 backdrop-blur-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="bg-[#4dff91]/20 p-2 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-[#4dff91]" />
                </div>
                <div className="flex-1">
                  <p className="text-[#4dff91] font-semibold">نجح</p>
                  <p className="text-[#4dff91]/80 text-sm">{state.successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Panel */}
          <div className="card mb-6 border border-[#8b8ea8]/20 hover:border-[#4dff91]/40 transition-all duration-300">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-[#3d7eff] to-[#ff38a4] p-2 rounded-lg">
                  <Server className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white">إعدادات الاتصال</h2>
              </div>
              <Rocket className="w-6 h-6 text-[#4dff91] animate-pulse" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Platform Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#8b8ea8] mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  اختر المنصة
                </label>
                <select
                  value={state.selectedPlatform}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'selectedPlatform', value: e.target.value })}
                  className="input-field w-full hover:border-[#4dff91]/60 transition-all"
                >
                  {state.platforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.icon} {platform.name} ({platform.authType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Store URL */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#8b8ea8] mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  رابط المتجر
                </label>
                <input
                  type="text"
                  value={state.storeUrl}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'storeUrl', value: e.target.value })}
                  placeholder="https://your-store.com"
                  className={`input-field w-full ${
                    state.validationErrors.storeUrl ? 'border-red-500 bg-red-500/10' : 'hover:border-[#4dff91]/60'
                  } transition-all`}
                />
                {state.validationErrors.storeUrl && (
                  <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {state.validationErrors.storeUrl}
                  </p>
                )}
              </div>

              {/* Auth Type */}
              <div>
                <label className="block text-sm font-semibold text-[#8b8ea8] mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  نوع المصادقة
                </label>
                <select
                  value={state.authType}
                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'authType', value: e.target.value })}
                  className="input-field w-full hover:border-[#4dff91]/60 transition-all"
                >
                  <option value="token">Token / API Key</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="apikey">API Key Header</option>
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-semibold text-[#8b8ea8] mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  API Key / Username
                </label>
                <div className="relative">
                  <input
                    type={state.showApiKey ? 'text' : 'password'}
                    value={state.apiKey}
                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'apiKey', value: e.target.value })}
                    placeholder="API Key or Username"
                    className={`input-field w-full pr-10 ${
                      state.validationErrors.apiKey ? 'border-red-500 bg-red-500/10' : 'hover:border-[#4dff91]/60'
                    } transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'showApiKey' })}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8ea8] hover:text-[#4dff91] transition-colors"
                  >
                    {state.showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {state.validationErrors.apiKey && (
                  <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {state.validationErrors.apiKey}
                  </p>
                )}
              </div>

              {/* API Secret */}
              <div>
                <label className="block text-sm font-semibold text-[#8b8ea8] mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  API Secret / Password
                </label>
                <div className="relative">
                  <input
                    type={state.showApiSecret ? 'text' : 'password'}
                    value={state.apiSecret}
                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'apiSecret', value: e.target.value })}
                    placeholder="API Secret or Password"
                    className={`input-field w-full pr-10 ${
                      state.validationErrors.apiSecret ? 'border-red-500 bg-red-500/10' : 'hover:border-[#4dff91]/60'
                    } transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'showApiSecret' })}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8ea8] hover:text-[#4dff91] transition-colors"
                  >
                    {state.showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {state.validationErrors.apiSecret && (
                  <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {state.validationErrors.apiSecret}
                  </p>
                )}
              </div>

              {/* Access Token */}
              <div>
                <label className="block text-sm font-semibold text-[#8b8ea8] mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Access Token (اختياري)
                </label>
                <div className="relative">
                  <input
                    type={state.showAccessToken ? 'text' : 'password'}
                    value={state.accessToken}
                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'accessToken', value: e.target.value })}
                    placeholder="Access Token"
                    className="input-field w-full pr-10 hover:border-[#4dff91]/60 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'showAccessToken' })}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8ea8] hover:text-[#4dff91] transition-colors"
                  >
                    {state.showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Custom Endpoints */}
              {state.selectedPlatform === 'custom' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-[#8b8ea8] mb-2 flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Custom Endpoints (JSON)
                  </label>
                  <textarea
                    value={state.customEndpoints}
                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'customEndpoints', value: e.target.value })}
                    placeholder='{"products": "/api/products", "test": "/api/health"}'
                    className={`input-field w-full font-mono text-sm ${
                      state.validationErrors.customEndpoints ? 'border-red-500 bg-red-500/10' : 'hover:border-[#4dff91]/60'
                    } transition-all`}
                    rows="3"
                  />
                  {state.validationErrors.customEndpoints && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {state.validationErrors.customEndpoints}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <button
                onClick={handleConnect}
                disabled={state.loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center gap-2 group"
              >
                {state.loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                )}
                اختبار الاتصال
              </button>

              <button
                onClick={handleFetchProducts}
                disabled={state.loading}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center gap-2 group"
              >
                {state.loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Package className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                )}
                جلب المنتجات
              </button>

              <button
                onClick={handleAnalyze}
                disabled={state.loading}
                className="bg-gradient-to-r from-[#ff38a4] to-[#ff6b6b] text-white px-6 py-3 rounded-lg font-semibold hover:shadow-[0_0_20px_rgba(255,56,164,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center gap-2 group"
              >
                {state.loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <BarChart3 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                )}
                تحليل المتجر
              </button>

              <button
                onClick={handleExportData}
                disabled={!state.products && !state.analysis}
                className="bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] text-white px-6 py-3 rounded-lg font-semibold hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center gap-2 group"
              >
                <Download className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
                تصدير البيانات
              </button>
            </div>
          </div>

          {/* Connection Result */}
          {state.connectionResult && (
            <div className="card mb-6 border-l-4 border-[#4dff91] bg-[#4dff91]/5 backdrop-blur-sm animate-fade-in hover:bg-[#4dff91]/10 transition-all">
              <div className="flex items-start gap-4">
                <div className="bg-[#4dff91]/20 p-3 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-[#4dff91]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#4dff91] mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    اتصال ناجح!
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="bg-[#141622] rounded-lg p-3 border border-[#8b8ea8]/20">
                      <span className="text-[#8b8ea8]">المنصة:</span>
                      <span className="text-white mr-2 font-semibold">{state.connectionResult.platform}</span>
                    </div>
                    <div className="bg-[#141622] rounded-lg p-3 border border-[#8b8ea8]/20">
                      <span className="text-[#8b8ea8]">الرابط:</span>
                      <span className="text-white mr-2 truncate block font-mono text-xs">{state.connectionResult.storeUrl}</span>
                    </div>
                  </div>
                  {state.connectionResult.storeData?.dataPreview && (
                    <div className="mt-3 bg-[#141622] rounded-lg p-3 border border-[#8b8ea8]/20">
                      <p className="text-[#8b8ea8] text-sm">{state.connectionResult.storeData.dataPreview}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Products Display */}
          {state.products && state.products.length > 0 && (
            <div className="card mb-6 border border-[#8b8ea8]/20 hover:border-[#3d7eff]/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-[#3d7eff] to-[#4dff91] p-2 rounded-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white">
                    المنتجات ({filteredProducts.length})
                  </h3>
                </div>
                
                {/* Search */}
                <div className="relative w-full sm:w-auto">
                  <Search className="w-5 h-5 text-[#8b8ea8] absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={state.searchTerm}
                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'searchTerm', value: e.target.value })}
                    placeholder="بحث في المنتجات..."
                    className="input-field pl-10 pr-4 hover:border-[#3d7eff]/60 transition-all w-full sm:w-64"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedProducts.map((product, i) => (
                  <div key={i} className="bg-[#141622] border border-[#8b8ea8]/20 rounded-xl p-5 hover:border-[#4dff91]/60 hover:shadow-[0_0_20px_rgba(77,255,145,0.1)] transition-all transform hover:scale-105 group">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-bold text-white text-base md:text-lg flex-1 group-hover:text-[#4dff91] transition-colors line-clamp-2">
                        {product.title || product.name || `Product ${i + 1}`}
                      </h4>
                      <span className="bg-[#3d7eff]/20 text-[#3d7eff] text-xs font-bold px-2 py-1 rounded-full border border-[#3d7eff]/50 ml-2">
                        #{i + 1}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-[#0a0b10] rounded-lg">
                        <span className="text-[#8b8ea8]">السعر:</span>
                        <span className="font-bold text-[#4dff91]">
                          {product.price || product.variants?.[0]?.price || 'N/A'}
                        </span>
                      </div>
                      {product.sku && (
                        <div className="flex justify-between items-center p-2 bg-[#0a0b10] rounded-lg">
                          <span className="text-[#8b8ea8]">SKU:</span>
                          <span className="font-mono text-white text-xs">{product.sku}</span>
                        </div>
                      )}
                      {product.inventory_quantity !== undefined && (
                        <div className="flex justify-between items-center p-2 bg-[#0a0b10] rounded-lg">
                          <span className="text-[#8b8ea8]">المخزون:</span>
                          <span className={`font-bold ${product.inventory_quantity > 0 ? 'text-[#4dff91]' : 'text-red-400'}`}>
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
                <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
                  <button
                    onClick={() => dispatch({ type: 'SET_FIELD', field: 'currentPage', value: Math.max(1, state.currentPage - 1) })}
                    disabled={state.currentPage === 1}
                    className="px-4 py-2 bg-[#141622] border border-[#8b8ea8]/20 rounded-lg hover:border-[#4dff91]/60 hover:bg-[#4dff91]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white"
                  >
                    السابق
                  </button>
                  <span className="text-[#8b8ea8] font-medium px-4 py-2 bg-[#141622] rounded-lg border border-[#8b8ea8]/20">
                    صفحة {state.currentPage} من {totalPages}
                  </span>
                  <button
                    onClick={() => dispatch({ type: 'SET_FIELD', field: 'currentPage', value: Math.min(totalPages, state.currentPage + 1) })}
                    disabled={state.currentPage === totalPages}
                    className="px-4 py-2 bg-[#141622] border border-[#8b8ea8]/20 rounded-lg hover:border-[#4dff91]/60 hover:bg-[#4dff91]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white"
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
              <div className="card bg-gradient-to-r from-[#3d7eff]/20 via-[#ff38a4]/20 to-[#4dff91]/20 border border-[#4dff91]/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#3d7eff]/10 via-transparent to-[#4dff91]/10 animate-pulse"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-[#4dff91] to-[#3d7eff] p-3 rounded-xl">
                        <TrendingUp className="w-8 h-8 text-[#0a0b10]" />
                      </div>
                      <div>
                        <h3 className="text-2xl md:text-3xl font-black text-white">Store Health Score</h3>
                        <p className="text-[#8b8ea8] text-sm md:text-base">تقييم شامل لأداء المتجر</p>
                      </div>
                    </div>
                    <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-[#4dff91] to-[#3d7eff] bg-clip-text text-transparent">
                      {state.analysis.healthScore}/100
                    </div>
                  </div>
                  <div className="w-full bg-[#141622] rounded-full h-8 overflow-hidden border border-[#8b8ea8]/20">
                    <div 
                      className="bg-gradient-to-r from-[#4dff91] to-[#3d7eff] h-8 rounded-full transition-all duration-1000 ease-out flex items-center justify-end px-4 relative overflow-hidden"
                      style={{ width: `${state.analysis.healthScore}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      <span className="relative z-10 text-[#0a0b10] font-bold">{state.analysis.healthScore}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Critical Issues */}
              {state.analysis.criticalIssues && state.analysis.criticalIssues.length > 0 && (
                <div className="card border-l-4 border-red-500 bg-red-500/5 hover:bg-red-500/10 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-red-500/20 p-2 rounded-lg">
                      <AlertCircle className="w-7 h-7 text-red-400" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-red-400">مشاكل حرجة</h3>
                  </div>
                  <ul className="space-y-3">
                    {state.analysis.criticalIssues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-3 bg-[#141622] rounded-lg p-4 border border-red-500/20 hover:border-red-500/40 transition-all">
                        <span className="bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="text-red-300 flex-1 text-sm md:text-base">{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quick Wins */}
              {state.analysis.quickWins && state.analysis.quickWins.length > 0 && (
                <div className="card border-l-4 border-[#4dff91] bg-[#4dff91]/5 hover:bg-[#4dff91]/10 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-[#4dff91]/20 p-2 rounded-lg">
                      <Zap className="w-7 h-7 text-[#4dff91]" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-[#4dff91]">تحسينات سريعة ⚡</h3>
                  </div>
                  <ul className="space-y-3">
                    {state.analysis.quickWins.map((win, i) => (
                      <li key={i} className="flex items-start gap-3 bg-[#141622] rounded-lg p-4 border border-[#4dff91]/20 hover:border-[#4dff91]/40 transition-all">
                        <span className="bg-[#4dff91] text-[#0a0b10] rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="text-[#4dff91]/90 flex-1 text-sm md:text-base">{win}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SEO & CRO Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SEO Improvements */}
                {state.analysis.seoImprovements && state.analysis.seoImprovements.length > 0 && (
                  <div className="card border-l-4 border-[#3d7eff] bg-[#3d7eff]/5 hover:bg-[#3d7eff]/10 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-[#3d7eff]/20 p-2 rounded-lg">
                        <Search className="w-7 h-7 text-[#3d7eff]" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-[#3d7eff]">تحسينات SEO 🔍</h3>
                    </div>
                    <ul className="space-y-2">
                      {state.analysis.seoImprovements.map((seo, i) => (
                        <li key={i} className="flex items-start gap-2 text-[#3d7eff]/90 text-sm bg-[#141622] p-3 rounded-lg border border-[#3d7eff]/20 hover:border-[#3d7eff]/40 transition-all">
                          <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="flex-1">{seo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CRO Improvements */}
                {state.analysis.conversionOptimization && state.analysis.conversionOptimization.length > 0 && (
                  <div className="card border-l-4 border-[#ff38a4] bg-[#ff38a4]/5 hover:bg-[#ff38a4]/10 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-[#ff38a4]/20 p-2 rounded-lg">
                        <TrendingUp className="w-7 h-7 text-[#ff38a4]" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-[#ff38a4]">تحسينات التحويل 💰</h3>
                    </div>
                    <ul className="space-y-2">
                      {state.analysis.conversionOptimization.map((cro, i) => (
                        <li key={i} className="flex items-start gap-2 text-[#ff38a4]/90 text-sm bg-[#141622] p-3 rounded-lg border border-[#ff38a4]/20 hover:border-[#ff38a4]/40 transition-all">
                          <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
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
          <div className="mt-8 card bg-gradient-to-r from-[#3d7eff]/10 via-[#ff38a4]/10 to-[#4dff91]/10 border border-[#4dff91]/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#3d7eff]/5 via-transparent to-[#4dff91]/5 animate-pulse"></div>
            <div className="relative z-10 flex items-start gap-4 flex-col md:flex-row">
              <div className="bg-gradient-to-br from-[#4dff91] to-[#3d7eff] p-4 rounded-2xl">
                <Store className="w-10 h-10 text-[#0a0b10]" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-black bg-gradient-to-r from-[#4dff91] to-[#3d7eff] bg-clip-text text-transparent mb-3">
                  🌐 Universal Store Integration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-white bg-[#141622] p-3 rounded-lg border border-[#8b8ea8]/20">
                    <CheckCircle className="w-5 h-5 text-[#4dff91] flex-shrink-0" />
                    <span>يدعم <strong className="text-[#4dff91]">أي منصة</strong> تجارة إلكترونية</span>
                  </div>
                  <div className="flex items-center gap-2 text-white bg-[#141622] p-3 rounded-lg border border-[#8b8ea8]/20">
                    <CheckCircle className="w-5 h-5 text-[#3d7eff] flex-shrink-0" />
                    <span>Shopify, WooCommerce, Magento</span>
                  </div>
                  <div className="flex items-center gap-2 text-white bg-[#141622] p-3 rounded-lg border border-[#8b8ea8]/20">
                    <CheckCircle className="w-5 h-5 text-[#ff38a4] flex-shrink-0" />
                    <span>PrestaShop, OpenCart, BigCommerce</span>
                  </div>
                  <div className="flex items-center gap-2 text-white bg-[#141622] p-3 rounded-lg border border-[#8b8ea8]/20">
                    <CheckCircle className="w-5 h-5 text-[#4dff91] flex-shrink-0" />
                    <span>Custom APIs - أي متجر مخصص</span>
                  </div>
                  <div className="flex items-center gap-2 text-white bg-[#141622] p-3 rounded-lg border border-[#8b8ea8]/20">
                    <Sparkles className="w-5 h-5 text-[#3d7eff] flex-shrink-0" />
                    <span>تحليل ذكي بالـ AI</span>
                  </div>
                  <div className="flex items-center gap-2 text-white bg-[#141622] p-3 rounded-lg border border-[#8b8ea8]/20">
                    <Target className="w-5 h-5 text-[#ff38a4] flex-shrink-0" />
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
