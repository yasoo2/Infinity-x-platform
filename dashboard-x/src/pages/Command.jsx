import { useState } from 'react';
import { sendCommand } from '../api/system';
import { useSessionToken } from '../hooks/useSessionToken';
import CommandForm from '../components/CommandForm';

export default function Command() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useSessionToken();

  const handleSubmit = async ({ commandText, lang, voice }) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const payload = {
        sessionToken: token,
        lang,
        voice,
        commandText,
      };

      const response = await sendCommand(payload);
      
      setSuccess({
        message: response.msg || 'Command sent successfully',
        requestId: response.requestId,
      });

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Command Center</h1>
        <p className="text-textDim mt-1">Send Instructions to Joe / System</p>
      </div>

      {success && (
        <div className="card bg-neonGreen/10 border border-neonGreen/50">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-neonGreen" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-neonGreen">
                {success.message}
              </h3>
              {success.requestId && (
                <p className="mt-1 text-xs text-textDim">
                  Request ID: {success.requestId}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card bg-red-500/10 border border-red-500/50">
          <p className="text-red-400">Error: {error}</p>
        </div>
      )}

      <div className="card bg-neonBlue/5 border border-neonBlue/30">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-neonBlue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-neonBlue">
              Important: Joe Command Authority
            </h3>
            <p className="mt-1 text-sm text-textDim">
              Joe is a high-privilege autonomous operator with authority to execute system-level tasks,
              infrastructure changes, UI modifications, and security operations. Commands are logged
              for audit purposes.
            </p>
          </div>
        </div>
      </div>

      <CommandForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
