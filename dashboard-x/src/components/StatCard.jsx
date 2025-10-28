import React from 'react'

export default function StatCard({ title, value, ok=true }) {
  return (
    <div className="card">
      <div className="text-sm text-zinc-400">{title}</div>
      <div className="mt-2 text-3xl font-bold">{String(value)}</div>
      {typeof ok === 'boolean' && (
        <div className="mt-3">
          <span className={`badge ${ok?'bg-emerald-600/20 text-emerald-300':'bg-rose-600/20 text-rose-300'}`}>
            <span className={`w-2 h-2 rounded-full ${ok?'bg-emerald-400':'bg-rose-400'}`}></span>
            {ok? 'OK':'Down'}
          </span>
        </div>
      )}
    </div>
  )
}
