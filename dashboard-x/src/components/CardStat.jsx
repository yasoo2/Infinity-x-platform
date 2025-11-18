  import React from 'react';
  import { Wifi, WifiOff, Activity, Server, Users } from 'lucide-react'; // أمثلة على الأيقونات

  // كائن لربط اسم الأيقونة بالمكون الفعلي من lucide-react
  const IconMap = {
    Wifi,
    WifiOff,
    Activity,
    Server,
    Users,
    // يمكنك إضافة المزيد من الأيقونات هنا
  };

  /**
   * CardStat Component
   * يعرض إحصائية معينة مع عنوان، قيمة، حالة، وأيقونة.
   *
   * @param {{
   *   title: string,
   *   value: string | number,
   *   status?: boolean | 'online' | 'offline', // true/false أو 'online'/'offline'
   *   iconName?: keyof typeof IconMap // اسم الأيقونة من IconMap
   * }} props
   */
  export default function CardStat({ title, value, status, iconName }) {
    const isOnline = status === true || status === 'online';
    const hasStatus = status !== undefined && status !== null;

    const IconComponent = iconName ? IconMap[iconName] : null;

    return (
      <div className="
        bg-gray-800 rounded-lg p-6 shadow-lg
        hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300 ease-in-out
        border border-gray-700 flex flex-col justify-between
      ">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-gray-400">
              {title}
            </p>
            <p className="mt-1 text-4xl font-extrabold text-white">
              {value}
            </p>
          </div>
          {IconComponent && (
            <div className="text-teal-500 text-5xl opacity-70">
              <IconComponent size={48} strokeWidth={1.5} />
            </div>
          )}
        </div>

        {hasStatus && (
          <div className="mt-auto"> {/* mt-auto يدفع الحالة إلى الأسفل */}
            <span className={`
              inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
              ${isOnline
                ? 'bg-green-500/20 text-green-400 ring-1 ring-inset ring-green-500/20'
                : 'bg-red-500/20 text-red-400 ring-1 ring-inset ring-red-500/20'
              }
            `}>
              <span className={`
                h-2 w-2 rounded-full mr-2
                ${isOnline ? 'bg-green-400' : 'bg-red-400'}
              `}></span>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        )}
      </div>
    );
  }