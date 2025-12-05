import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, RefreshCw, Users as UsersIcon } from 'lucide-react';
import { getAdminUsers } from '../api/system';
import UsersTable from '../components/UsersTable';
import CardStat from '../components/CardStat';

export default function Users() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl">
            <UsersIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">إدارة المستخدمين</h1>
            <p className="text-textDim text-sm">عرض وتحكم بالمستخدمين والجلسات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-[#141c2e] border border-[#1f2a46] text-white hover:bg-[#192338] inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{loading ? 'تحديث...' : 'تحديث'}</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/super-admin')}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2"
          >
            <span>إدارة متقدمة</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/joe')}
            className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            <span>إغلاق</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="card bg-red-500/10 border border-red-500/50">
          <p className="text-red-400">Error loading users: {error}</p>
        </div>
      )}

      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="card p-4">
        <UsersTable users={data?.users || []} />
      </div>
    </div>
  );
}
