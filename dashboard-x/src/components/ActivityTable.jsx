  import React from 'react';
  import PropTypes from 'prop-types';
  import { formatDistanceToNow } from 'date-fns';
  // لو احتجت لغة معينة: import { enUS, ar } from 'date-fns/locale';

  /**
   * @typedef {{ ts: string|number|Date, action: string, detail?: string }} ActivityEvent
   */

  /**
   * @param {{
   *   events: ActivityEvent[]|undefined|null,
   *   locale?: Locale,                 // من date-fns/locale
   *   timeFormatter?: (d: Date) => string,
   *   emptyText?: string,
   *   className?: string
   * }} props
   */
  export default function ActivityTable({
    events,
    locale,
    timeFormatter,
    emptyText = 'No activity recorded yet',
    className = '',
  }) {
    const safeDate = (value) => {
      const d = value instanceof Date ? value : new Date(value);
      return isNaN(d.getTime()) ? null : d;
    };

    const formatTime = (value) => {
      const d = safeDate(value);
      if (!d) return '-';
      if (timeFormatter) return timeFormatter(d);
      try {
        return formatDistanceToNow(d, { addSuffix: true, locale });
      } catch {
        return d.toLocaleString();
      }
    };

    if (!events || events.length === 0) {
      return (
        <div className="card text-center py-12">
          <p className="text-textDim">{emptyText}</p>
        </div>
      );
    }

    return (
      <div className={`card overflow-hidden ${className}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-textDim/20">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textDim uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textDim uppercase tracking-wider">
                  Action
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-textDim uppercase tracking-wider">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-textDim/10">
              {events.map((event, idx) => {
                const time = formatTime(event?.ts);
                const action = event?.action ?? '-';
                const detail = event?.detail ?? '';
                return (
                  <tr key={idx} className="hover:bg-bgDark/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-textDim" title={safeDate(event?.ts)?.toLocaleString() || undefined}>
                      {time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-neonBlue/20 text-neonBlue">
                        {action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white max-w-md truncate" title={detail}>
                      {detail}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  ActivityTable.propTypes = {
    events: PropTypes.array,
    locale: PropTypes.any,
    timeFormatter: PropTypes.func,
    emptyText: PropTypes.string,
    className: PropTypes.string,
  };
