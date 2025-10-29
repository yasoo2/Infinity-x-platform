import { formatDistanceToNow } from 'date-fns';

export default function UsersTable({ users }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return new Date(timestamp).toLocaleString();
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-neonPink/20 text-neonPink border border-neonPink/50';
      case 'admin':
        return 'bg-neonBlue/20 text-neonBlue border border-neonBlue/50';
      default:
        return 'bg-textDim/20 text-textDim border border-textDim/50';
    }
  };

  if (!users || users.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-textDim">No users found</p>
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
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textDim uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textDim uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textDim uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textDim uppercase tracking-wider">
                Active Since
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-textDim/10">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-bgDark/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textDim">
                  {user.phone || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textDim">
                  {formatTime(user.lastLoginAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-textDim">
                  {formatTime(user.activeSessionSince)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
