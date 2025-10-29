import { useState } from 'react';

export default function CommandForm({ onSubmit, loading }) {
  const [commandText, setCommandText] = useState('');
  const [lang, setLang] = useState('ar');
  const [voice, setVoice] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!commandText.trim()) return;
    
    onSubmit({ commandText, lang, voice });
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-6">
      <div>
        <label className="block text-sm font-medium text-textDim mb-2">
          Command to Joe / System
        </label>
        <textarea
          value={commandText}
          onChange={(e) => setCommandText(e.target.value)}
          className="input-field w-full min-h-[200px] resize-y"
          placeholder="Enter your command in Arabic or English..."
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-textDim mb-2">
            Language
          </label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="input-field w-full"
            disabled={loading}
          >
            <option value="ar">Arabic (العربية)</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={voice}
              onChange={(e) => setVoice(e.target.checked)}
              className="w-5 h-5 rounded border-textDim/30 bg-cardDark text-neonGreen focus:ring-neonGreen focus:ring-offset-0"
              disabled={loading}
            />
            <span className="text-sm font-medium text-textDim">
              Voice Response
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !commandText.trim()}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Command'}
        </button>
      </div>
    </form>
  );
}
