import React from 'react';
import PropTypes from 'prop-types';
import { FiZap, FiTool, FiCheckCircle, FiActivity, FiCpu } from 'react-icons/fi';

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

const RightPanel = ({ isProcessing, plan, forceStatus = false }) => {
  const showPlan = !forceStatus && isProcessing && plan && plan.length > 0;

  return (
    <div className="h-full flex flex-col bg-gray-900 p-5">
      {/* Header */}
      <div className="mb-5">
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
            {/* System Status Cards */}
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <FiCheckCircle className="text-green-500" size={20} />
                <h4 className="font-semibold text-white">WebSocket</h4>
              </div>
              <p className="text-sm text-gray-400">Connection stable and active</p>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <FiCheckCircle className="text-green-500" size={20} />
                <h4 className="font-semibold text-white">API Backend</h4>
              </div>
              <p className="text-sm text-gray-400">All services operational</p>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <FiCpu className="text-blue-500" size={20} />
                <h4 className="font-semibold text-white">AI Engine</h4>
              </div>
              <p className="text-sm text-gray-400">Gemini 2.5 Flash • Ready</p>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <FiTool className="text-purple-500" size={20} />
                <h4 className="font-semibold text-white">Tools Available</h4>
              </div>
              <p className="text-sm text-gray-400">82 tools and functions loaded</p>
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
};

export default RightPanel;
