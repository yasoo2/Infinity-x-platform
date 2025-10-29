export default function CardStat({ title, value, status, icon }) {
  const getStatusClass = () => {
    if (status === 'online' || status === true) {
      return 'status-badge status-online';
    } else if (status === 'offline' || status === false) {
      return 'status-badge status-offline';
    }
    return '';
  };

  return (
    <div className="card hover:shadow-neon transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-textDim text-sm font-medium uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {value}
          </p>
        </div>
        {icon && (
          <div className="text-neonGreen text-4xl opacity-50">
            {icon}
          </div>
        )}
      </div>
      {status !== undefined && (
        <div className="mt-4">
          <span className={getStatusClass()}>
            {status === 'online' || status === true ? 'Online' : 'Offline'}
          </span>
        </div>
      )}
    </div>
  );
}
