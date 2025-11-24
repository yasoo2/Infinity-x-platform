
import React from 'react';
import { FiZap, FiTool, FiCheckCircle, FiActivity } from 'react-icons/fi';

const PlanStep = ({ step }) => {
  const Icon = step.type === 'thought' ? FiZap : FiTool;
  const title = step.type === 'thought' ? 'Thought Process' : `Tool Used: ${step.content}`;
  const details = step.type === 'thought' ? step.content : JSON.stringify(step.details, null, 2);

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
      <Icon className="mt-1 text-cyan-400 flex-shrink-0" size={16} />
      <div>
        <h4 className="font-semibold text-gray-200 text-sm">{title}</h4>
        {details && <pre className="text-xs text-gray-400 mt-1 whitespace-pre-wrap font-mono">{details}</pre>}
      </div>
    </div>
  );
};

const RightPanel = ({ isProcessing, plan }) => {
  const showPlan = isProcessing && plan && plan.length > 0;

  return (
    <div className="bg-gray-900 w-80 flex-shrink-0 p-4 border-l border-gray-700/50" style={{ gridArea: 'right' }}>
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        {showPlan ? <FiZap /> : <FiActivity />}
        {showPlan ? 'Execution Plan' : 'System Status'}
      </h2>
      
      {showPlan ? (
        <div className="space-y-3 overflow-y-auto h-full pb-16">
          {plan.map((step, index) => (
            <PlanStep key={index} step={step} />
          ))}
        </div>
      ) : (
        <div className="text-gray-400 space-y-4 text-sm">
           <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                <FiCheckCircle className="text-green-500" size={18} />
                <div>
                    <h4 className="font-semibold text-gray-200">WebSocket</h4>
                    <p>Connection stable.</p>
                </div>
           </div>
           <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                <FiCheckCircle className="text-green-500" size={18} />
                <div>
                    <h4 className="font-semibold text-gray-200">API Backend</h4>
                    <p>Services are operational.</p>
                </div>
           </div>
           <p className="pt-4 text-center text-gray-500">Waiting for a task...</p>
        </div>
      )}
    </div>
  );
};

export default RightPanel;
