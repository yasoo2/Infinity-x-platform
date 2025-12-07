import React, { useRef } from 'react'
import PropTypes from 'prop-types'
import { X, RefreshCw, Globe, Maximize2, Search } from 'lucide-react'

export default function FullScreenBrowser({ onClose, screenshot, pageInfo, isConnected, isLoading, navigate, getScreenshot, getPageText, extractSerp, startStreaming, stopStreaming, click, type, scroll, pressKey }) {
  const imgRef = useRef(null)
  const [url, setUrl] = React.useState(() => String(pageInfo?.url || ''))
  const [query, setQuery] = React.useState('')
  React.useEffect(() => { setUrl(String(pageInfo?.url || '')) }, [pageInfo?.url])
  React.useEffect(() => { if (isConnected) { startStreaming(); if (!screenshot) getScreenshot(); } }, [isConnected])
  const onImgClick = (e) => {
    if (!imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 1280
    const y = ((e.clientY - rect.top) / rect.height) * 720
    click(Math.round(x), Math.round(y))
  }
  const onWheel = (e) => { scroll(e.deltaY) }
  const onKeyDown = (e) => {
    e.preventDefault()
    if (e.key === 'Enter') { pressKey('Enter') } else if (e.key === 'Backspace') { pressKey('Backspace') } else if (e.key === 'Tab') { pressKey('Tab') } else if (e.key.length === 1) { type(e.key) }
  }
  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm">
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs border border-red-700" title="إغلاق">
          <X className="w-4 h-4 inline-block mr-1" />
          إغلاق
        </button>
      </div>
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-gray-900/80 border border-gray-700 rounded-lg px-2 py-1">
        <Globe className="w-4 h-4 text-purple-400" />
        <input value={url} onChange={(e)=>setUrl(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter' && url) navigate(url) }} placeholder="أدخل رابط" className="w-[360px] bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded border border-gray-700 focus:border-purple-500 outline-none"/>
        <button onClick={()=>{ if (url) navigate(url) }} disabled={!isConnected || isLoading} className="bg-yellow-600 hover:bg-yellow-700 text-black text-xs px-2 py-1 rounded disabled:opacity-50">فتح</button>
        <div className="w-px h-5 bg-gray-700" />
        <Search className="w-4 h-4 text-blue-400" />
        <input value={query} onChange={(e)=>setQuery(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter' && query) extractSerp(query) }} placeholder="بحث" className="w-[220px] bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded border border-gray-700 focus:border-blue-500 outline-none"/>
        <button onClick={()=>extractSerp(query)} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded disabled:opacity-50">نتائج</button>
        <button onClick={getPageText} disabled={!isConnected || isLoading} className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded disabled:opacity-50">نص</button>
        <button onClick={getScreenshot} disabled={!isConnected} className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs p-1.5 rounded disabled:opacity-50" title="تحديث">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
      <div className="w-full h-full flex items-center justify-center" tabIndex={0} onKeyDown={onKeyDown}>
        {screenshot ? (
          <div className="relative w-full h-full">
            <img ref={imgRef} src={`data:image/jpeg;base64,${screenshot}`} alt="Browser" className="w-full h-full object-contain cursor-pointer" onClick={onImgClick} onWheel={onWheel} />
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-white text-sm">جار التحميل...</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-300">
            <Maximize2 className="w-10 h-10 mx-auto mb-2 text-purple-400" />
            <div className="text-sm">{isConnected ? 'أدخل رابط للعرض' : 'جاري الاتصال بالمتصفح...'}</div>
          </div>
        )}
      </div>
    </div>
  )
}

FullScreenBrowser.propTypes = {
  onClose: PropTypes.func,
  screenshot: PropTypes.string,
  pageInfo: PropTypes.object,
  isConnected: PropTypes.bool,
  isLoading: PropTypes.bool,
  navigate: PropTypes.func,
  getScreenshot: PropTypes.func,
  getPageText: PropTypes.func,
  extractSerp: PropTypes.func,
  startStreaming: PropTypes.func,
  stopStreaming: PropTypes.func,
  click: PropTypes.func,
  type: PropTypes.func,
  scroll: PropTypes.func,
  pressKey: PropTypes.func,
}
