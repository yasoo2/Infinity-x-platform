import React, { useEffect, useState, useCallback } from 'react'
import apiClient from '../api/client'

const SecurityReport = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [audit, setAudit] = useState(null)
  const [insecure, setInsecure] = useState(null)
  const [secrets, setSecrets] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [a, s] = await Promise.all([
        apiClient.get('/api/v1/security/audit'),
        apiClient.post('/api/v1/security/scan', {})
      ])
      setAudit(a.data?.result || null)
      setInsecure(s.data?.insecure || null)
      setSecrets(s.data?.secrets || null)
    } catch (e) {
      setError(e?.message || 'خطأ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const renderAudit = () => {
    const rows = audit?.results || []
    return (
      <div className="card bg-gray-800/60 border border-gray-700">
        <div className="p-3 flex items-center justify-between">
          <h3 className="text-white font-semibold">Audit</h3>
          <button onClick={fetchAll} disabled={loading} className="px-3 py-1 text-sm rounded bg-blue-600 text-white">{loading ? '...' : 'Refresh'}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-300">
                <th className="p-2 text-left">Dir</th>
                <th className="p-2 text-left">Critical</th>
                <th className="p-2 text-left">High</th>
                <th className="p-2 text-left">Moderate</th>
                <th className="p-2 text-left">Low</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-700 text-gray-200">
                  <td className="p-2">{r.dir}</td>
                  <td className="p-2">{r.severityCounts?.critical || 0}</td>
                  <td className="p-2">{r.severityCounts?.high || 0}</td>
                  <td className="p-2">{r.severityCounts?.moderate || 0}</td>
                  <td className="p-2">{r.severityCounts?.low || 0}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="p-3 text-gray-400" colSpan={5}>لا توجد نتائج</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderFindings = (title, data) => {
    const rows = data?.findings || []
    return (
      <div className="card bg-gray-800/60 border border-gray-700">
        <div className="p-3">
          <h3 className="text-white font-semibold">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-300">
                <th className="p-2 text-left">File</th>
                <th className="p-2 text-left">Line</th>
                <th className="p-2 text-left">Key</th>
                <th className="p-2 text-left">Severity</th>
                <th className="p-2 text-left">Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-700 text-gray-200">
                  <td className="p-2">{r.file}</td>
                  <td className="p-2">{r.line}</td>
                  <td className="p-2">{r.key}</td>
                  <td className="p-2">{r.severity}</td>
                  <td className="p-2">{r.message}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="p-3 text-gray-400" colSpan={5}>لا توجد نتائج</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Report</h1>
          <p className="text-textDim">Audit, Insecure Patterns, and Secrets</p>
        </div>
        <div>
          <button onClick={fetchAll} disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white">{loading ? '...' : 'Refresh'}</button>
        </div>
      </div>
      {error && <div className="p-3 bg-red-900/30 border border-red-700 text-red-300">{error}</div>}
      {renderAudit()}
      {renderFindings('Insecure Patterns', insecure)}
      {renderFindings('Secrets', secrets)}
    </div>
  )
}

export default SecurityReport
