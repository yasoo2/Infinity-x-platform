import React from 'react'
import PropTypes from 'prop-types'
import { ExternalLink, Image as ImageIcon, Link as LinkIcon, X } from 'lucide-react'

const SearchPanel = ({ results, loading, error, onClose, onOpen }) => {
  return (
    <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm z-40">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="text-sm font-semibold text-purple-300">نتائج البحث</div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 overflow-auto h-[calc(100%-44px)]">
        {loading && (
          <div className="text-center text-gray-300">جارٍ التحميل...</div>
        )}
        {error && (
          <div className="text-center text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((r, i) => (
              <div key={r.url || i} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                {r.image ? (
                  <img src={r.image} alt={r.title || ''} className="w-full h-32 object-cover rounded mb-3" />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center bg-gray-700 rounded mb-3 text-gray-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <div className="text-white text-sm font-semibold mb-1 truncate">{r.title}</div>
                <div className="text-gray-300 text-xs mb-2 line-clamp-3">{r.snippet}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-300 text-xs truncate">
                    <LinkIcon className="w-3 h-3" />
                    <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {r.url}
                    </a>
                  </div>
                  <button
                    onClick={() => onOpen?.(r.url)}
                    className="text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-xs px-3 py-1 rounded"
                  >
                    <ExternalLink className="w-3 h-3 inline mr-1" /> فتح
                  </button>
                </div>
              </div>
            ))}
            {results.length === 0 && (
              <div className="text-center text-gray-400">لا توجد نتائج</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

SearchPanel.propTypes = {
  results: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onOpen: PropTypes.func,
}

export default SearchPanel
