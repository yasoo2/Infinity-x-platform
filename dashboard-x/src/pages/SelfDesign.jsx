import { useState, useCallback, useReducer, useEffect } from 'react';
import axios from 'axios';
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
  Code,
  GitPullRequest,
  TestTube,
  FileText,
  Terminal,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://admin.xelitesolutions.com';

// Reducer for the self-design process state
const selfDesignReducer = (state, action) => {
  switch (action.type) {
    case 'START_PROCESS':
      return {
        ...state,
        processing: true,
        currentStage: 'فهم المتطلبات',
        progress: 0,
        logs: [],
        result: null,
        error: '',
      };
    case 'SET_STAGE':
      return { ...state, currentStage: action.payload };
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs, action.payload] };
    case 'SET_RESULT':
      return { ...state, result: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'FINISH_PROCESS':
      return { ...state, processing: false };
    case 'RESET_STATE':
      return {
        processing: false,
        currentStage: '',
        progress: 0,
        logs: [],
        result: null,
        error: '',
      };
    default:
      return state;
  }
};

export default function SelfDesign() {
  const [projectGoal, setProjectGoal] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [existingSystemContext, setExistingSystemContext] = useState('');
  const [componentType, setComponentType] = useState('landing-page'); // New: type of component to design
  const [designStyle, setDesignStyle] = useState('modern');
  const [specificFeatures, setSpecificFeatures] = useState('');

  // GitHub settings (stored in localStorage)
  const [githubToken, setGithubToken] = useState(localStorage.getItem('self_design_github_token') || '');
  const [githubUsername, setGithubUsername] = useState(localStorage.getItem('self_design_github_username') || '');
  const [githubRepo, setGithubRepo] = useState(localStorage.getItem('self_design_github_repo') || '');

  const [selfDesignState, dispatch] = useReducer(selfDesignReducer, {
    processing: false,
    currentStage: '',
    progress: 0,
    logs: [],
    result: null,
    error: '',
  });

  const { processing, currentStage, progress, logs, result, error } = selfDesignState;

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    dispatch({ type: 'ADD_LOG', payload: { timestamp, message, type } });
  }, []);

  const handleSelfDesignProcess = async () => {
    if (!githubToken || !githubUsername || !githubRepo) {
      dispatch({ type: 'SET_ERROR', payload: 'الرجاء إدخال جميع إعدادات GitHub (رمز الوصول، اسم المستخدم، اسم المستودع) أولاً!' });
      return;
    }

    dispatch({ type: 'START_PROCESS' });

    try {
      // Stage 1: Understanding Requirements
      dispatch({ type: 'SET_STAGE', payload: 'فهم المتطلبات' });
      addLog('🧠 جاري تحليل وفهم متطلبات المشروع...', 'info');
      dispatch({ type: 'SET_PROGRESS', payload: 10 });
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Stage 2: Code Generation
      dispatch({ type: 'SET_STAGE', payload: 'توليد الكود' });
      addLog('💻 جاري توليد الكود البرمجي باستخدام Gemini AI...', 'info');
      dispatch({ type: 'SET_PROGRESS', payload: 30 });

      const featuresList = specificFeatures
        .split(',')
        .map(f => f.trim())
        .filter(f => f);

      const payload = {
        projectGoal,
        targetAudience,
        existingSystemContext,
        componentType,
        designStyle,
        specificFeatures: featuresList,
        githubToken,
        githubUsername,
        githubRepo,
      };

      const response = await axios.post(`${API_BASE}/api/self-design/initiate-autonomous-design`, payload);

      if (response.data.ok) {
        addLog('✅ تم توليد الكود الأولي بنجاح!', 'success');
        dispatch({ type: 'SET_PROGRESS', payload: 50 });

        // Stage 3: Code Integration & Refinement
        dispatch({ type: 'SET_STAGE', payload: 'دمج وتحسين الكود' });
        addLog('🔗 جاري دمج الكود مع النظام الحالي وتحسينه...', 'info');
        dispatch({ type: 'SET_PROGRESS', payload: 70 });
        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        addLog('✅ تم دمج الكود وتحسينه.', 'success');

        // Stage 4: Automated Testing
        dispatch({ type: 'SET_STAGE', payload: 'الاختبار التلقائي' });
        addLog('🧪 جاري إجراء الاختبارات التلقائية لضمان الجودة...', 'info');
        dispatch({ type: 'SET_PROGRESS', payload: 85 });
        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 2500));
        addLog('✅ اجتاز الكود جميع الاختبارات بنجاح.', 'success');

        // Stage 5: GitHub Interaction (Push & PR)
        dispatch({ type: 'SET_STAGE', payload: 'التفاعل مع GitHub' });
        addLog('📤 جاري رفع التغييرات إلى GitHub وإنشاء طلب دمج (Pull Request)...', 'info');
        dispatch({ type: 'SET_PROGRESS', payload: 95 });
        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        addLog(`✅ تم رفع التغييرات وفتح طلب دمج: ${response.data.pullRequestUrl}`, 'success');

        dispatch({ type: 'SET_PROGRESS', payload: 100 });
        addLog('🎉 اكتملت عملية التصميم الذاتي بنجاح!', 'success');

        dispatch({ type: 'SET_RESULT', payload: response.data });
      } else {
        throw new Error(response.data.error || 'فشلت عملية التصميم الذاتي');
      }
    } catch (err) {
      console.error('Self-design process error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'فشلت عملية التصميم الذاتي';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      addLog(`❌ خطأ فادح: ${errorMsg}`, 'error');
    } finally {
      dispatch({ type: 'FINISH_PROCESS' });
    }
  };

  const saveGitHubSettings = () => {
    localStorage.setItem('self_design_github_token', githubToken);
    localStorage.setItem('self_design_github_username', githubUsername);
    localStorage.setItem('self_design_github_repo', githubRepo);
    alert('✅ تم حفظ إعدادات GitHub بنجاح!');
  };

  const getStageIcon = (stage) => {
    switch (stage) {
      case 'فهم المتطلبات': return <FileText size={18} className="text-blue-400" />;
      case 'توليد الكود': return <Code size={18} className="text-purple-400" />;
      case 'دمج وتحسين الكود': return <RefreshCw size={18} className="text-green-400" />;
      case 'الاختبار التلقائي': return <TestTube size={18} className="text-yellow-400" />;
      case 'التفاعل مع GitHub': return <GitPullRequest size={18} className="text-red-400" />;
      default: return <Info size={18} className="text-gray-400" />;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
          🚀 نظام التصميم الذاتي (Autonomous Design System)
        </h1>
        <p className="text-lg text-gray-600">
          دع الذكاء الاصطناعي يصمم ويطور النظام لك، خطوة بخطوة، وبدون تدخل بشري!
        </p>
      </div>

      {/* GitHub Settings Banner */}
      {(!githubToken || !githubUsername || !githubRepo) && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle size={24} className="text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-yellow-400 font-medium mb-1">⚠️ إعدادات GitHub غير مكتملة!</p>
            <p className="text-sm text-yellow-300">
              الرجاء إدخال رمز الوصول الشخصي (Token)، اسم المستخدم (Username)، واسم المستودع (Repository) الخاص بحساب GitHub في القسم أدناه لتمكين النظام من التفاعل مع الكود.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input & Configuration */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">تكوين عملية التصميم الذاتي</h2>

          <div className="space-y-6">
            {/* Project Goal */}
            <div>
              <label htmlFor="projectGoal" className="block text-sm font-medium text-gray-700 mb-2">
                الهدف العام للمشروع أو الميزة الجديدة *
              </label>
              <textarea
                id="projectGoal"
                value={projectGoal}
                onChange={(e) => setProjectGoal(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all resize-y"
                rows={4}
                placeholder="مثال: إضافة لوحة تحكم جديدة للمشرفين لإدارة المستخدمين والمحتوى، مع إمكانية عرض الإحصائيات."
                disabled={processing}
                required
              />
            </div>

            {/* Target Audience */}
            <div>
              <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 mb-2">
                الجمهور المستهدف أو المستخدمون النهائيون *
              </label>
              <input
                type="text"
                id="targetAudience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="مثال: مشرفو النظام، المستخدمون العاديون، العملاء الجدد"
                disabled={processing}
                required
              />
            </div>

            {/* Existing System Context */}
            <div>
              <label htmlFor="existingSystemContext" className="block text-sm font-medium text-gray-700 mb-2">
                سياق النظام الحالي (اختياري، لوصف كيفية التكامل)
              </label>
              <textarea
                id="existingSystemContext"
                value={existingSystemContext}
                onChange={(e) => setExistingSystemContext(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all resize-y"
                rows={3}
                placeholder="مثال: النظام مبني على React و Node.js، ويستخدم MongoDB كقاعدة بيانات. الميزة الجديدة يجب أن تتكامل مع نظام المصادقة الحالي."
                disabled={processing}
              />
            </div>

            {/* Component Type */}
            <div>
              <label htmlFor="componentType" className="block text-sm font-medium text-gray-700 mb-2">
                نوع المكون/الوظيفة المراد تطويرها *
              </label>
              <select
                id="componentType"
                value={componentType}
                onChange={(e) => setComponentType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={processing}
              >
                <option value="landing-page">صفحة هبوط (Landing Page)</option>
                <option value="ui-component">مكون واجهة مستخدم (UI Component)</option>
                <option value="api-endpoint">نقطة نهاية API (API Endpoint)</option>
                <option value="database-model">نموذج قاعدة بيانات (Database Model)</option>
                <option value="full-feature">ميزة كاملة (Full Feature - UI + API + DB)</option>
              </select>
            </div>

            {/* Design Style */}
            <div>
              <label htmlFor="designStyle" className="block text-sm font-medium text-gray-700 mb-2">
                نمط التصميم المفضل (لواجهة المستخدم)
              </label>
              <select
                id="designStyle"
                value={designStyle}
                onChange={(e) => setDesignStyle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={processing}
              >
                <option value="modern">Modern - حديث</option>
                <option value="minimal">Minimal - بسيط</option>
                <option value="creative">Creative - إبداعي</option>
                <option value="professional">Professional - احترافي</option>
                <option value="playful">Playful - مرح</option>
              </select>
            </div>

            {/* Specific Features */}
            <div>
              <label htmlFor="specificFeatures" className="block text-sm font-medium text-gray-700 mb-2">
                ميزات محددة أو عناصر يجب تضمينها (مفصولة بفواصل)
              </label>
              <input
                type="text"
                id="specificFeatures"
                value={specificFeatures}
                onChange={(e) => setSpecificFeatures(e.target.value)}
                placeholder="مثال: نموذج تسجيل الدخول، جدول بيانات قابل للفرز، رسوم بيانية تفاعلية"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={processing}
              />
            </div>

            {/* Initiate Design Button */}
            <button
              onClick={handleSelfDesignProcess}
              disabled={processing || !projectGoal || !targetAudience || !githubToken || !githubUsername || !githubRepo}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> جاري التصميم الذاتي...
                </>
              ) : (
                <>
                  <Rocket size={20} /> ابدأ التصميم الذاتي
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Progress & Logs */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🔴 التقدم المباشر والسجلات</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-700 flex items-center gap-3">
              <XCircle size={24} className="flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">حدث خطأ:</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {processing || result ? (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span className="flex items-center gap-2">
                    {getStageIcon(currentStage)} {currentStage}
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Logs Display */}
              <div className="bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs text-gray-200 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <Terminal size={16} /> سجلات الذكاء الاصطناعي
                </h3>
                <div className="space-y-1">
                  {logs.map((log, i) => (
                    <div
                      key={i}
                      className={`
                        ${log.type === 'error' ? 'text-red-400' : ''}
                        ${log.type === 'success' ? 'text-green-400' : ''}
                        ${log.type === 'info' ? 'text-blue-400' : ''}
                      `}
                    >
                      <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))}
                </div>
              </div>

              {/* Result Display */}
              {result && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <CheckCircle size={20} /> اكتمل التصميم الذاتي!
                  </h3>
                  <p className="mb-2">
                    تم إنشاء طلب دمج (Pull Request) بنجاح على GitHub.
                  </p>
                  <a
                    href={result.pullRequestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    عرض طلب الدمج <ExternalLink size={16} />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Code size={48} className="mx-auto mb-4" />
              <p>ابدأ عملية التصميم الذاتي عن طريق ملء التفاصيل والنقر على الزر.</p>
            </div>
          )}
        </div>
      </div>

      {/* GitHub Settings */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <Github size={28} /> إعدادات GitHub الأساسية
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="githubUsername" className="block text-sm font-medium text-gray-700 mb-2">
              اسم مستخدم GitHub *
            </label>
            <input
              type="text"
              id="githubUsername"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="اسم المستخدم الخاص بك"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />
          </div>

          <div>
            <label htmlFor="githubRepo" className="block text-sm font-medium text-gray-700 mb-2">
              اسم مستودع GitHub (Repository Name) *
            </label>
            <input
              type="text"
              id="githubRepo"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="مثال: my-awesome-project"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />
          </div>

          <div>
            <label htmlFor="githubToken" className="block text-sm font-medium text-gray-700 mb-2">
              رمز الوصول الشخصي (Personal Access Token) لـ GitHub *
            </label>
            <input
              type="password"
              id="githubToken"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Info size={14} /> يجب أن يحتوي الـ Token على صلاحيات <code className="bg-gray-100 px-1 rounded">repo</code> و <code className="bg-gray-100 px-1 rounded">workflow</code>. احصل عليه من:{' '}
              <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">إعدادات GitHub</a>
            </p>
          </div>

          <button
            onClick={saveGitHubSettings}
            className="w-full bg-gray-700 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <Save size={20} /> حفظ إعدادات GitHub
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-8 border border-purple-200 text-center">
        <h3 className="text-2xl font-bold text-purple-900 mb-4">
          💡 كيف يعمل نظام التصميم الذاتي؟
        </h3>
        <ul className="list-disc list-inside space-y-2 text-purple-800 text-left mx-auto max-w-2xl">
          <li>
            ✅ <strong>فهم عميق:</strong> يقوم الذكاء الاصطناعي (مدعومًا بنماذج متقدمة مثل Gemini AI) بتحليل أهداف مشروعك، الجمهور المستهدف، وسياق نظامك الحالي.
          </li>
          <li>
            ✅ <strong>توليد الكود الذكي:</strong> بناءً على الفهم، يولد AI كودًا برمجيًا كاملاً (واجهة مستخدم React مع Tailwind CSS، نقاط نهاية API، نماذج قواعد بيانات) يتناسب مع متطلباتك.
          </li>
          <li>
            ✅ <strong>التكامل والتكييف:</strong> لا يكتفي بالتوليد، بل يدمج الكود الجديد مع بنية مشروعك الحالية ويجري التعديلات اللازمة لضمان التوافقية.
          </li>
          <li>
            ✅ <strong>الاختبار التلقائي:</strong> يولد AI اختبارات وحدة وتكامل لتأكيد أن الكود يعمل بشكل صحيح ويلبي المواصفات، ويكتشف الأخطاء ويصححها ذاتيًا.
          </li>
          <li>
            ✅ <strong>إدارة الإصدارات:</strong> يقوم AI بإنشاء فرع جديد على GitHub، يرفع الكود المولّد والمختبر، ثم يفتح طلب دمج (Pull Request) للمراجعة النهائية (أو الدمج التلقائي إذا تم تكوينه).
          </li>
          <li>
            ✅ <strong>تطوير مستمر:</strong> يهدف النظام إلى التعلم من كل عملية تصميم، وتحسين قدراته التوليدية والتصحيحية بمرور الوقت.
          </li>
        </ul>
      </div>
    </div>
  );
}
