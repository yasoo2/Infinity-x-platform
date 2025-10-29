import { formatDistanceToNow } from 'date-fns';

export default function ActivityTable({ events }) {
  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return new Date(timestamp).toLocaleString();
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-textDim">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-textDim/20">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-textDim uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textDim uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textDim uppercase tracking-wider">
                Detail
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-textDim/10">
            {events.map((event, index) => (
              <tr key={index} className="hover:bg-bgDark/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textDim">
                  {formatTime(event.ts)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-neonBlue/20 text-neonBlue">
                    {event.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-white max-w-md truncate">
                  {event.detail}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
