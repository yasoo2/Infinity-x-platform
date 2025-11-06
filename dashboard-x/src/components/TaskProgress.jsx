import React, { useState } from 'react';
import { Check, Clock, X, ChevronDown, ChevronUp, Cpu, Activity } from 'lucide-react';

const mockTasks = [
  { id: 1, title: 'تحليل المكونات المطلوبة في الواجهة الأمامية', status: 'completed' },
  { id: 2, title: 'تعديل ملفات الواجهة الأمامية لإضافة مكون عرض تقدم المهام', status: 'completed' },
  { id: 3, title: 'تعديل ملفات الواجهة الأمامية لإضافة مكون وحدة التحكم', status: 'completed' },
  { id: 4, title: 'تثبيت التغييرات محليًا', status: 'completed' },
  { id: 5, title: 'رفع التعديلات على GitHub', status: 'completed' },
  { id: 6, title: 'تحليل سبب فشل البناء (Build Failure)', status: 'completed' },
  { id: 7, title: 'تثبيت حزمة react-draggable المفقودة', status: 'completed' },
  { id: 8, title: 'رفع التعديلات على GitHub لحل مشكلة react-draggable', status: 'completed' },
  { id: 9, title: 'تثبيت حزمة react-resizable المفقودة', status: 'completed' },
  { id: 10, title: 'رفع التعديلات على GitHub لحل مشكلة react-resizable', status: 'completed' },
  { id: 11, title: 'تقديم التقرير النهائي للمستخدم', status: 'in_progress' },
];

const getStatusIcon = (status) => {
  switch (status) {
    case 'completed':
      return <Check className="w-4 h-4 text-green-400" />;
    case 'in_progress':
      return <Activity className="w-4 h-4 text-blue-400 animate-pulse" />;
    case 'failed':
      return <X className="w-4 h-4 text-red-400" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

const TaskProgress = () => {
  const [isOpen, setIsOpen] = useState(true);
  const totalTasks = mockTasks.length;
  const completedTasks = mockTasks.filter(t => t.status === 'completed').length;
  const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="fixed bottom-4 left-4 z-40 w-96">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-purple-500/30 rounded-xl shadow-2xl shadow-purple-900/50 overflow-hidden">
        {/* Header */}
        <div
          className="flex justify-between items-center p-3 cursor-pointer select-none bg-gradient-to-r from-gray-800/90 to-gray-900/90 border-b-2 border-purple-500/30"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400 animate-pulse" />
            <h3 className="text-sm font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Task Progress
            </h3>
            <span className="text-xs text-gray-400">
              {completedTasks}/{totalTasks}
            </span>
          </div>
          <button className="text-gray-400 hover:text-white transition-colors">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Content */}
        {isOpen && (
          <div className="p-4 max-h-96 overflow-y-auto">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400">Overall Progress</span>
                <span className="text-xs font-bold text-purple-400">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Task List */}
            <ul className="space-y-2">
              {mockTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start gap-2 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                >
                  <span className="flex-shrink-0 mt-0.5">{getStatusIcon(task.status)}</span>
                  <span
                    className={`text-xs ${
                      task.status === 'completed'
                        ? 'line-through text-gray-500'
                        : task.status === 'in_progress'
                        ? 'text-blue-300 font-medium'
                        : 'text-gray-300'
                    }`}
                  >
                    {task.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskProgress;
