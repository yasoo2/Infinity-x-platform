import React, { useState } from 'react';
import { Check, Clock, X, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

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
      return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
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

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl">
        {/* Header */}
        <div
          className="flex justify-between items-center p-3 cursor-pointer select-none bg-gray-700 rounded-t-lg"
          onClick={() => setIsOpen(!isOpen)}
        >
          <h3 className="text-sm font-bold text-white flex items-center">
            <Cpu className="w-4 h-4 mr-2 text-neonGreen" />
            Task Progress ({completedTasks}/{totalTasks})
          </h3>
          <button className="text-gray-400 hover:text-white">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Content */}
        {isOpen && (
          <div className="p-3 max-h-64 overflow-y-auto">
            <div className="mb-3">
              <div className="w-full bg-gray-600 rounded-full h-1.5">
                <div
                  className="bg-neonGreen h-1.5 rounded-full"
                  style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                ></div>
              </div>
            </div>
            <ul className="space-y-2">
              {mockTasks.map((task) => (
                <li key={task.id} className="flex items-start text-xs text-gray-300">
                  <span className="flex-shrink-0 mt-0.5 mr-2">{getStatusIcon(task.status)}</span>
                  <span className={task.status === 'completed' ? 'line-through text-gray-500' : ''}>
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
