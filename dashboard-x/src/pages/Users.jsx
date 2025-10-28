import { useState, useEffect } from 'react';
import { getAdminUsers } from '../api/system';
import UsersTable from '../components/UsersTable';
import CardStat from '../components/CardStat';

export default function Users() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAdminUsers();
      setData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neonGreen mx-auto"></div>
          <p className="mt-4 text-textDim">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Users & Sessions</h1>
          <p className="text-textDim mt-1">Admin & User Management</p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="btn-secondary"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="card bg-red-500/10 border border-red-500/50">
          <p className="text-red-400">Error loading users: {error}</p>
        </div>
      )}

      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardStat
            title="Active Now"
            value={data.stats.totalActiveNow || 0}
            icon="🟢"
          />
          <CardStat
            title="Super Admins"
            value={data.stats.totalSupers || 0}
            icon="👑"
          />
          <CardStat
            title="Admins"
            value={data.stats.totalAdmins || 0}
            icon="🛡️"
          />
          <CardStat
            title="Users"
            value={data.stats.totalUsers || 0}
            icon="👤"
          />
        </div>
      )}

      <UsersTable users={data?.users || []} />
    </div>
  );
}
