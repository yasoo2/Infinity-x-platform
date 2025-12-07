import React from 'react'
import PropTypes from 'prop-types'
import { X } from 'lucide-react'

export default function FullScreenBrowser({ onClose }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm">
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs border border-red-700"
          title="إغلاق"
        >
          <X className="w-4 h-4 inline-block mr-1" />
          إغلاق
        </button>
      </div>
      <div className="w-full h-full flex items-center justify-center text-gray-300">
        <div className="text-center">
          <p className="text-sm">العرض الكامل قيد الإعداد</p>
          <p className="text-xs text-gray-400 mt-1">استخدم العرض المدمج في الوقت الحالي</p>
        </div>
      </div>
    </div>
  )
}

FullScreenBrowser.propTypes = {
  onClose: PropTypes.func,
}

