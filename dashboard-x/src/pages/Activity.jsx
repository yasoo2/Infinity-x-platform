import { useState, useEffect } from 'react';
import { getActivityStream } from '../api/system';
import ActivityTable from '../components/ActivityTable';

export default function Activity() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getActivityStream();
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neonGreen mx-auto"></div>
          <p className="mt-4 text-textDim">Loading activity stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Activity Stream</h1>
          <p className="text-textDim mt-1">Recent Joe & System Events</p>
        </div>
        <button
          onClick={fetchActivity}
          disabled={loading}
          className="btn-secondary"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="card bg-red-500/10 border border-red-500/50">
          <p className="text-red-400">Error loading activity: {error}</p>
        </div>
      )}

      <ActivityTable events={events} />
    </div>
  );
}
