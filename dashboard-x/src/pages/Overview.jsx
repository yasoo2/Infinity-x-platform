import { useState, useEffect } from 'react';
import { getSystemStatus } from '../api/system';
import CardStat from '../components/CardStat';

export default function Overview() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSystemStatus();
      setStatus(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neonGreen mx-auto"></div>
          <p className="mt-4 text-textDim">Loading system status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-500/10 border border-red-500/50">
        <p className="text-red-400">Error loading status: {error}</p>
        <button onClick={fetchStatus} className="btn-secondary mt-4">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">System Overview</h1>
          <p className="text-textDim mt-1">Mission Control & Health Panel</p>
        </div>
        <div className="text-right">
          {lastUpdated && (
            <p className="text-xs text-textDim mb-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CardStat
          title="Total Users"
          value={status?.system?.usersTotal || 0}
          icon="👥"
        />
        <CardStat
          title="Active Sessions"
          value={status?.system?.activeSessions || 0}
          icon="🔐"
        />
        <CardStat
          title="Redis"
          value="Cache"
          status={status?.system?.redisOnline}
          icon="⚡"
        />
        <CardStat
          title="MongoDB"
          value="Database"
          status={status?.system?.mongoOnline}
          icon="🗄️"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardStat
          title="JOEngine"
          value="AI System"
          status={status?.joeOnline !== false}
          icon="🤖"
        />
        <CardStat
          title="Factory"
          value="Execution Layer"
          status={status?.factoryOnline !== false}
          icon="⚙️"
        />
      </div>

      {status?.joeRecent && status.joeRecent.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4 text-neonGreen">
            Recent Joe Activity
          </h2>
          <div className="space-y-3">
            {status.joeRecent.slice(0, 5).map((event, index) => (
              <div
                key={index}
                className="p-4 bg-bgDark rounded-lg border border-textDim/10"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-textDim">
                    {new Date(event.ts).toLocaleString()}
                  </span>
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-neonBlue/20 text-neonBlue">
                    {event.action}
                  </span>
                </div>
                <p className="text-sm text-white">{event.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
