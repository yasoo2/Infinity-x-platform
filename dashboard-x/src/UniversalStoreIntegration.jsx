import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { Store, ShoppingCart, TrendingUp, AlertCircle, CheckCircle, Loader, RefreshCw, BarChart3, Package, Search, Filter, Download, Upload, Zap, Activity, Globe, Lock, Key, Server, Database, Eye, EyeOff, Sparkles, Target, Rocket } from 'lucide-react';

// API Configuration
const API_BASE = import.meta.env?.VITE_API_BASE || 'https://api.xelitesolutions.com';

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
  connectionStatus: 'disconnected', // disconnected, connecting, connected, error
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value, error: '', validationErrors: {} };
    case 'SET_LOADING':
      return { ...state, loading: action.value };
    case 'SET_ERROR':
      return { ...state, error: action.value, loading: false, connectionStatus: 'error' };
    case 'SET_SUCCESS':
      return { ...state, successMessage: action.value, error: '', loading: false };
    case 'SET_PLATFORMS':
      return { ...state, platforms: action.value };
    case 'SET_CONNECTION_RESULT':
      return { ...state, connectionResult: action.value, loading: false, successMessage: 'تم الاتصال بنجاح!', connectionStatus: 'connected' };
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
        dispatch({ 
          type: 'SET_PLATFORMS', 
          value: [
            { id: 'shopify', name: 'Shopify', authType: 'token', icon: '🛍️' },
            { id: 'woocommerce', name: 'WooCommerce', authType: 'basic', icon: '🔷' },
            { id: 'magento', name: 'Magento', authType: 'bearer', icon: '🔶' },
            { id: 'prestashop', name: 'PrestaShop', authType: 'apikey', icon: '🔵' },
            { id: 'opencart', name: 'OpenCart', authType: 'token', icon: '🟢' },
            { id: 'bigcommerce', name: 'BigCommerce', authType: 'token', icon: '🔴' },
            { id: 'custom', name: 'Custom API', authType: 'custom', icon: '⚙️' },
          ]
        });
      }
    } catch (err) {
      console.error('Error fetching platforms:', err);
      dispatch({ 
        type: 'SET_PLATFORMS', 
        value: [
          { id: 'shopify', name: 'Shopify', authType: 'token', icon: '🛍️' },
          { id: 'woocommerce', name: 'WooCommerce', authType: 'basic', icon: '🔷' },
          { id: 'magento', name: 'Magento', authType: 'bearer', icon: '🔶' },
          { id: 'prestashop', name: 'PrestaShop', authType: 'apikey', icon: '🔵' },
          { id: 'opencart', name: 'OpenCart', authType: 'token', icon: '🟢' },
          { id: 'bigcommerce', name: 'BigCommerce', authType: 'token', icon: '🔴' },
          { id: 'custom', name: 'Custom API', authType: 'custom', icon: '⚙️' },
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
      } catch (e) {
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
    dispatch({ type: 'SET_CONNECTION_STATUS', value: 'connecting' });

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

  // Get connection status badge
  const getConnectionStatusBadge = () => {
    switch (state.connectionStatus) {
      case 'connected':
        return (
          <div className="status-badge status-online flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>متصل</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="status-badge status-connecting flex items-center gap-2">
            <Loader className="w-4 h-4 text-yellow-500 animate-spin" />
            <span>جاري الاتصال...</span>
          </div>
        );
      case 'error':
        return (
          <div className="status-badge status-error flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span>خطأ في الاتصال</span>
          </div>
        );
      default:
        return (
          <div className="status-badge status-offline flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-500" />
            <span>غير متصل</span>
          </div>
        );
    }
  };

  // Render platform specific fields
  const renderPlatformFields = () => {
    const platform = initialState.platforms.find(p => p.id === state.selectedPlatform);
    if (!platform) return null;

    const fields = [];

    if (platform.authType === 'token') {
      fields.push(
        <div key="apiKey" className="col-span-12 sm:col-span-6">
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
            مفتاح API (Token)
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type={state.showApiKey ? 'text' : 'password'}
              name="apiKey"
              id="apiKey"
              value={state.apiKey}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'apiKey', value: e.target.value })}
              className={`flex-1 block w-full rounded-none rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${state.validationErrors.apiKey ? 'border-red-500' : ''}`}
              placeholder="أدخل مفتاح API الخاص بك"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'showApiKey' })}
              className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 hover:bg-gray-100"
            >
              {state.showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {state.validationErrors.apiKey && <p className="mt-2 text-sm text-red-600">{state.validationErrors.apiKey}</p>}
        </div>
      );
    } else if (platform.authType === 'basic') {
      fields.push(
        <div key="username" className="col-span-12 sm:col-span-6">
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
            اسم المستخدم (Username)
          </label>
          <input
            type="text"
            name="apiKey"
            id="apiKey"
            value={state.apiKey}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'apiKey', value: e.target.value })}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${state.validationErrors.apiKey ? 'border-red-500' : ''}`}
            placeholder="أدخل اسم المستخدم"
          />
          {state.validationErrors.apiKey && <p className="mt-2 text-sm text-red-600">{state.validationErrors.apiKey}</p>}
        </div>
      );
      fields.push(
        <div key="apiSecret" className="col-span-12 sm:col-span-6">
          <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700">
            كلمة المرور (Password)
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type={state.showApiSecret ? 'text' : 'password'}
              name="apiSecret"
              id="apiSecret"
              value={state.apiSecret}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'apiSecret', value: e.target.value })}
              className={`flex-1 block w-full rounded-none rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${state.validationErrors.apiSecret ? 'border-red-500' : ''}`}
              placeholder="أدخل كلمة المرور"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'showApiSecret' })}
              className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 hover:bg-gray-100"
            >
              {state.showApiSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {state.validationErrors.apiSecret && <p className="mt-2 text-sm text-red-600">{state.validationErrors.apiSecret}</p>}
        </div>
      );
    } else if (platform.authType === 'bearer') {
      fields.push(
        <div key="accessToken" className="col-span-12 sm:col-span-6">
          <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700">
            رمز الوصول (Bearer Token)
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type={state.showAccessToken ? 'text' : 'password'}
              name="accessToken"
              id="accessToken"
              value={state.accessToken}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'accessToken', value: e.target.value })}
              className={`flex-1 block w-full rounded-none rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${state.validationErrors.accessToken ? 'border-red-500' : ''}`}
              placeholder="أدخل رمز الوصول"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'showAccessToken' })}
              className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 hover:bg-gray-100"
            >
              {state.showAccessToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {state.validationErrors.accessToken && <p className="mt-2 text-sm text-red-600">{state.validationErrors.accessToken}</p>}
        </div>
      );
    } else if (platform.authType === 'apikey') {
      fields.push(
        <div key="apiKey" className="col-span-12 sm:col-span-6">
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
            مفتاح API (API Key)
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type={state.showApiKey ? 'text' : 'password'}
              name="apiKey"
              id="apiKey"
              value={state.apiKey}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'apiKey', value: e.target.value })}
              className={`flex-1 block w-full rounded-none rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${state.validationErrors.apiKey ? 'border-red-500' : ''}`}
              placeholder="أدخل مفتاح API الخاص بك"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'showApiKey' })}
              className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 hover:bg-gray-100"
            >
              {state.showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {state.validationErrors.apiKey && <p className="mt-2 text-sm text-red-600">{state.validationErrors.apiKey}</p>}
        </div>
      );
    } else if (platform.id === 'custom') {
      fields.push(
        <div key="customEndpoints" className="col-span-12">
          <label htmlFor="customEndpoints" className="block text-sm font-medium text-gray-700">
            نقاط النهاية المخصصة (JSON)
          </label>
          <textarea
            name="customEndpoints"
            id="customEndpoints"
            rows={5}
            value={state.customEndpoints}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'customEndpoints', value: e.target.value })}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${state.validationErrors.customEndpoints ? 'border-red-500' : ''}`}
            placeholder={`{\n  "products": "/api/v1/products",\n  "orders": "/api/v1/orders"\n}`}
          />
          {state.validationErrors.customEndpoints && <p className="mt-2 text-sm text-red-600">{state.validationErrors.customEndpoints}</p>}
          <p className="mt-2 text-xs text-gray-500">أدخل JSON يحدد مسارات API المخصصة للمتجر.</p>
        </div>
      );
    }

    return fields;
  };

  // Render product card
  const renderProductCard = (product) => (
    <div key={product.id} className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3 bg-white rounded-lg shadow-lg overflow-hidden transition duration-300 hover:shadow-xl">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 truncate" title={product.title || product.name}>
            {product.title || product.name || 'منتج بدون اسم'}
          </h3>
          <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {product.status === 'active' ? 'نشط' : 'غير نشط'}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {product.vendor || 'غير محدد'}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xl font-bold text-indigo-600">
            {product.price ? `${product.price} ${product.currency || 'USD'}` : 'السعر غير متوفر'}
          </p>
          <p className="text-sm text-gray-500">
            المخزون: {product.inventory_quantity !== undefined ? product.inventory_quantity : 'غير متوفر'}
          </p>
        </div>
      </div>
    </div>
  );

  // Main component render
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <Zap className="w-8 h-8 text-indigo-600" />
            تكامل المتجر العالمي (Universal Store Integration)
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            قم بربط متجرك الإلكتروني (Shopify, WooCommerce, إلخ) لتحليل البيانات وتحسين الأداء.
          </p>
        </header>

        {/* Status and Messages */}
        <div className="mb-6">
          {state.error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">خطأ:</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{state.error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {state.successMessage && (
            <div className="rounded-md bg-green-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">نجاح:</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>{state.successMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Connection Panel */}
        <div className="bg-white shadow-xl rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between border-b pb-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Server className="w-6 h-6 text-indigo-500" />
              إعدادات الاتصال
            </h2>
            {getConnectionStatusBadge()}
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Platform Selection */}
            <div className="col-span-12 sm:col-span-6">
              <label htmlFor="platform" className="block text-sm font-medium text-gray-700">
                منصة المتجر
              </label>
              <select
                id="platform"
                name="platform"
                value={state.selectedPlatform}
                onChange={(e) => {
                  const selected = initialState.platforms.find(p => p.id === e.target.value);
                  dispatch({ type: 'SET_FIELD', field: 'selectedPlatform', value: e.target.value });
                  dispatch({ type: 'SET_FIELD', field: 'authType', value: selected?.authType || 'token' });
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {initialState.platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Store URL */}
            <div className="col-span-12 sm:col-span-6">
              <label htmlFor="storeUrl" className="block text-sm font-medium text-gray-700">
                رابط المتجر (Store URL)
              </label>
              <input
                type="url"
                name="storeUrl"
                id="storeUrl"
                value={state.storeUrl}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'storeUrl', value: e.target.value })}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${state.validationErrors.storeUrl ? 'border-red-500' : ''}`}
                placeholder="https://yourstore.com"
              />
              {state.validationErrors.storeUrl && <p className="mt-2 text-sm text-red-600">{state.validationErrors.storeUrl}</p>}
            </div>

            {/* Platform Specific Fields */}
            {renderPlatformFields()}

            {/* Connect Button */}
            <div className="col-span-12 mt-4">
              <button
                type="button"
                onClick={handleConnect}
                disabled={state.loading}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {state.loading && state.connectionStatus === 'connecting' ? (
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Key className="w-5 h-5 mr-2" />
                )}
                {state.loading && state.connectionStatus === 'connecting' ? 'جاري الاتصال...' : 'اختبار الاتصال والربط'}
              </button>
            </div>
          </div>
        </div>

        {/* Data Operations Panel */}
        {state.connectionStatus === 'connected' && (
          <div className="bg-white shadow-xl rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 border-b pb-4 mb-4">
              <Database className="w-6 h-6 text-green-500" />
              عمليات البيانات
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Fetch Products */}
              <div className="flex flex-col items-start">
                <button
                  type="button"
                  onClick={handleFetchProducts}
                  disabled={state.loading}
                  className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {state.loading && !state.products ? (
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Package className="w-5 h-5 mr-2" />
                  )}
                  جلب المنتجات
                </button>
                <p className="mt-2 text-sm text-gray-500">جلب قائمة بالمنتجات من المتجر.</p>
              </div>

              {/* Analyze Store */}
              <div className="flex flex-col items-start">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={state.loading}
                  className="inline-flex items-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {state.loading && !state.analysis ? (
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <BarChart3 className="w-5 h-5 mr-2" />
                  )}
                  تحليل المتجر
                </button>
                <p className="mt-2 text-sm text-gray-500">إجراء تحليل شامل لأداء المتجر.</p>
              </div>

              {/* Export Data */}
              {(state.products || state.analysis) && (
                <div className="flex flex-col items-start">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="inline-flex items-center rounded-md border border-transparent bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    تصدير البيانات (JSON)
                  </button>
                  <p className="mt-2 text-sm text-gray-500">تصدير نتائج الجلب والتحليل.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products Display Panel */}
        {state.products && (
          <div className="bg-white shadow-xl rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 border-b pb-4 mb-4">
              <Package className="w-6 h-6 text-indigo-500" />
              المنتجات المجلوبة ({filteredProducts.length} من {state.products.length})
            </h2>

            {/* Search and Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-2">
                <label htmlFor="search" className="sr-only">بحث</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    id="search"
                    name="search"
                    type="search"
                    value={state.searchTerm}
                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'searchTerm', value: e.target.value })}
                    className="block w-full rounded-md border-gray-300 pl-3 pr-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="البحث عن منتج..."
                  />
                </div>
              </div>
              <div>
                <label htmlFor="filter" className="sr-only">تصفية</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <Filter className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <select
                    id="filter"
                    name="filter"
                    value={state.filterCategory}
                    onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'filterCategory', value: e.target.value })}
                    className="block w-full rounded-md border-gray-300 pl-3 pr-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="all">كل الفئات</option>
                    {/* Add dynamic categories here if available */}
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {paginatedProducts.length > 0 ? (
              <div className="grid grid-cols-12 gap-6">
                {paginatedProducts.map(renderProductCard)}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد منتجات</h3>
                <p className="mt-1 text-sm text-gray-500">
                  لم يتم العثور على منتجات تطابق معايير البحث أو التصفية.
                </p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <nav className="mt-6 flex items-center justify-between border-t border-gray-200 px-4 sm:px-0">
                <div className="-mt-px flex w-0 flex-1">
                  <button
                    onClick={() => dispatch({ type: 'SET_FIELD', field: 'currentPage', value: state.currentPage - 1 })}
                    disabled={state.currentPage === 1}
                    className="inline-flex items-center border-t-2 border-transparent pt-4 pr-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 disabled:opacity-50"
                  >
                    <span className="ml-3">السابق</span>
                  </button>
                </div>
                <div className="hidden md:-mt-px md:flex">
                  <span className="border-transparent text-gray-500 border-t-2 pt-4 px-4 text-sm font-medium">
                    صفحة {state.currentPage} من {totalPages}
                  </span>
                </div>
                <div className="-mt-px flex w-0 flex-1 justify-end">
                  <button
                    onClick={() => dispatch({ type: 'SET_FIELD', field: 'currentPage', value: state.currentPage + 1 })}
                    disabled={state.currentPage === totalPages}
                    className="inline-flex items-center border-t-2 border-transparent pt-4 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 disabled:opacity-50"
                  >
                    <span className="mr-3">التالي</span>
                  </button>
                </div>
              </nav>
            )}
          </div>
        )}

        {/* Analysis Results Panel */}
        {state.analysis && (
          <div className="bg-white shadow-xl rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 border-b pb-4 mb-4">
              <TrendingUp className="w-6 h-6 text-red-500" />
              نتائج التحليل
            </h2>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: state.analysis }} />
          </div>
        )}
      </div>
    </div>
  );
}
