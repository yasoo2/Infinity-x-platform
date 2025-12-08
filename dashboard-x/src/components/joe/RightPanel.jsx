import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FiZap, FiTool, FiCheckCircle, FiActivity } from 'react-icons/fi';
import apiClient from '../../api/client';

const PlanStep = ({ step, index }) => {
  const Icon = step.type === 'thought' ? FiZap : FiTool;
  const title = step.type === 'thought' ? 'Thought Process' : `Tool: ${step.content}`;
  const details = step.type === 'thought' ? step.content : JSON.stringify(step.details, null, 2);

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500/50 transition-colors">
      <div className="flex items-start gap-3 mb-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="text-blue-400" size={16} />
            <h4 className="font-semibold text-white text-sm">{title}</h4>
          </div>
          {details && (
            <pre className="text-xs text-gray-400 mt-2 whitespace-pre-wrap font-mono bg-gray-900 p-2 rounded border border-gray-700">
              {details}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

PlanStep.propTypes = {
  step: PropTypes.shape({
    type: PropTypes.string,
    content: PropTypes.any,
    details: PropTypes.any,
  }).isRequired,
  index: PropTypes.number.isRequired,
};

const RightPanel = ({ isProcessing, plan, forceStatus = false, wsConnected = false }) => {
  const showPlan = !forceStatus && isProcessing && plan && plan.length > 0;
  const [health, setHealth] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [engine, setEngine] = useState(null);
  const formatUptime = (s) => {
    if (!s && s !== 0) return '';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;
    const fetchAll = async () => {
      try {
        const h = await apiClient.get('/api/v1/health', { signal });
        setHealth(h.data);
      } catch {
        try {
          const p = await apiClient.get('/api/v1/joe/ping', { signal });
          setHealth({ success: true, status: 'ok', uptime: 0, ping: p.data });
        } catch { void 0; }
      }
      try {
        const r = await apiClient.get('/api/v1/runtime-mode/status', { signal });
        setRuntime(r.data);
      } catch { void 0; }
      try {
        const e = await apiClient.get('/api/v1/ai/engine/status', { signal });
        setEngine(e.data);
      } catch { void 0; }
      // Removed providers fetch: state not used in panel
    };
    fetchAll();
    return () => ac.abort();
  }, []);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 to-gray-950 p-5 border border-gray-800 rounded-xl ring-1 ring-yellow-600/10">
      {/* Header */}
      <div className="mb-5 border-b border-gray-700 pb-3">
        <div className="flex items-center gap-3 mb-2">
          {showPlan ? <FiZap className="text-blue-500" size={24} /> : <FiActivity className="text-green-500" size={24} />}
          <h2 className="text-xl font-bold text-white">
            {showPlan ? 'Execution Plan' : 'System Status'}
          </h2>
        </div>
        <p className="text-sm text-gray-400">
          {showPlan ? 'Real-time execution progress' : 'All systems operational'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showPlan ? (
          <div className="space-y-3">
            {plan.map((step, index) => (
              <PlanStep key={index} step={step} index={index} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <ConnectionCard wsConnected={wsConnected} />

            <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <FiCheckCircle className={(health?.success && health?.status === 'ok') ? 'text-green-500' : 'text-red-500'} size={20} />
                <h4 className="font-semibold text-white">API Backend</h4>
              </div>
              <p className="text-sm text-gray-400">{(health?.success && health?.status === 'ok') ? 'All services operational' : 'Service unavailable'}</p>
              <div className="mt-2 text-xs text-gray-500">
                <div>DB: {health?.db || 'unknown'}</div>
                <div>Uptime: {formatUptime(health?.uptime)}</div>
              </div>
            </div>

            <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <FiActivity className="text-blue-500" size={20} />
                <h4 className="font-semibold text-white">AI Engine</h4>
              </div>
              <p className="text-sm text-gray-400">
                {engine?.ok
                  ? (engine?.provider
                      ? `${engine.provider === 'openai' ? 'OpenAI' : engine.provider} • نشط`
                      : 'غير معروف')
                  : 'غير معروف'}
              </p>
              {runtime?.success && runtime.loading && (
                <div className="mt-2 text-xs text-blue-400">تحميل: {runtime.stage || 'Starting'} • {runtime.percent || 0}%</div>
              )}
            </div>

            <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <FiTool className="text-purple-500" size={20} />
                <h4 className="font-semibold text-white">Tools Available</h4>
              </div>
              <p className="text-sm text-gray-400">{typeof health?.toolsCount === 'number' ? `${health.toolsCount} tools loaded` : 'Detecting...'}</p>
            </div>

            {/* Waiting State */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 border border-gray-700 mb-3">
                <FiActivity className="text-gray-500 animate-pulse" size={28} />
              </div>
              <p className="text-sm text-gray-500">Waiting for your command...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

RightPanel.propTypes = {
  isProcessing: PropTypes.bool.isRequired,
  plan: PropTypes.array,
  forceStatus: PropTypes.bool,
  wsConnected: PropTypes.bool,
};

const ConnectionCard = ({ wsConnected }) => {
  const [transport, setTransport] = useState(() => { try { return localStorage.getItem('joeTransport') || 'sio'; } catch { return 'sio'; } });
  useEffect(() => { try { setTransport(localStorage.getItem('joeTransport') || 'sio'); } catch { /* noop */ } }, [wsConnected]);
  const label = transport === 'ws' ? 'WebSocket' : transport === 'rest' ? 'REST' : 'Socket.IO';
  const statusText = transport === 'rest' ? 'Disabled' : (wsConnected ? 'Connected' : 'Disconnected');
  const modeText = transport === 'rest' ? 'Mode: REST (HTTP)' : `Mode: Auto (${label})`;
  return (
    <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
      <div className="flex items-center gap-3 mb-2">
        <FiCheckCircle className={wsConnected && transport !== 'rest' ? 'text-green-500' : 'text-red-500'} size={20} />
        <h4 className="font-semibold text-white">Realtime Link</h4>
      </div>
      <p className="text-sm text-gray-400">{statusText}</p>
      <div className="mt-2 text-xs text-gray-400">{modeText}</div>
    </div>
  );
};
ConnectionCard.propTypes = { wsConnected: PropTypes.bool };

export default RightPanel;
