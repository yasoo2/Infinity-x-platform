import React, { useState, useCallback } from 'react'
import apiClient from '../api/client'

const Knowledge = () => {
  const [docTitle, setDocTitle] = useState('')
  const [summaryGoal, setSummaryGoal] = useState('')
  const [content, setContent] = useState('')
  const [ingestResult, setIngestResult] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loadingIngest, setLoadingIngest] = useState(false)
  const [loadingUpload, setLoadingUpload] = useState(false)
  const [loadingQuery, setLoadingQuery] = useState(false)
  const [error, setError] = useState('')

  const ingest = useCallback(async () => {
    setLoadingIngest(true)
    setError('')
    try {
      const { data } = await apiClient.post('/api/v1/knowledge/ingest', {
        documentTitle: docTitle || 'Untitled',
        summaryGoal,
        content
      })
      setIngestResult(data)
    } catch (e) {
      setError(e?.message || 'خطأ')
    } finally { setLoadingIngest(false) }
  }, [docTitle, summaryGoal, content])

  const runQuery = useCallback(async () => {
    setLoadingQuery(true)
    setError('')
    try {
      const { data } = await apiClient.post('/api/v1/knowledge/query', { query, limit: 8 })
      setResults(data?.results || [])
    } catch (e) {
      setError(e?.message || 'خطأ')
    } finally { setLoadingQuery(false) }
  }, [query])

  const uploadAndIngest = useCallback(async () => {
    if (!selectedFile) return
    setLoadingUpload(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      if (docTitle) fd.append('documentTitle', docTitle)
      if (summaryGoal) fd.append('summaryGoal', summaryGoal)
      const { data } = await apiClient.post('/api/v1/knowledge/upload-ingest', fd)
      setUploadResult(data)
    } catch (e) {
      setError(e?.message || 'خطأ')
    } finally { setLoadingUpload(false) }
  }, [selectedFile, docTitle, summaryGoal])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Knowledge</h1>
        <p className="text-textDim">Ingest documents and query internal knowledge.</p>
      </div>
      {error && <div className="p-3 bg-red-900/30 border border-red-700 text-red-300">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-gray-800/60 border border-gray-700 p-4">
          <h3 className="text-white font-semibold mb-3">Ingest</h3>
          <input value={docTitle} onChange={e=>setDocTitle(e.target.value)} placeholder="Title" className="w-full mb-2 px-3 py-2 rounded bg-gray-900 text-white border border-gray-700" />
          <input value={summaryGoal} onChange={e=>setSummaryGoal(e.target.value)} placeholder="Summary Goal (optional)" className="w-full mb-2 px-3 py-2 rounded bg-gray-900 text-white border border-gray-700" />
          <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Paste content here" rows={10} className="w-full mb-2 px-3 py-2 rounded bg-gray-900 text-white border border-gray-700" />
          <button onClick={ingest} disabled={loadingIngest || !content} className="px-4 py-2 rounded bg-blue-600 text-white">{loadingIngest ? '...' : 'Ingest'}</button>
          {ingestResult && (
            <div className="mt-3 text-sm text-gray-300">
              <div>ID: {ingestResult.id || ingestResult._id || 'N/A'}</div>
              <div>Message: {ingestResult.message || ingestResult.note || ''}</div>
              {ingestResult.summary && <div className="mt-2 text-gray-400">Summary: {ingestResult.summary}</div>}
            </div>
          )}
          <div className="mt-4 border-t border-gray-700 pt-4">
            <h4 className="text-white font-semibold mb-2">Upload File</h4>
            <input type="file" onChange={e=>setSelectedFile(e.target.files?.[0] || null)} className="w-full mb-2 px-3 py-2 rounded bg-gray-900 text-white border border-gray-700" />
            <button onClick={uploadAndIngest} disabled={loadingUpload || !selectedFile} className="px-4 py-2 rounded bg-purple-600 text-white">{loadingUpload ? '...' : 'Upload & Ingest'}</button>
            {uploadResult && (
              <div className="mt-3 text-sm text-gray-300">
                <div>Upload: {uploadResult.success ? 'OK' : 'Failed'}</div>
                {uploadResult.ingested?.summary && <div className="mt-2 text-gray-400">Summary: {uploadResult.ingested.summary}</div>}
              </div>
            )}
          </div>
        </div>
        <div className="card bg-gray-800/60 border border-gray-700 p-4">
          <h3 className="text-white font-semibold mb-3">Query</h3>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Your question" className="w-full mb-2 px-3 py-2 rounded bg-gray-900 text-white border border-gray-700" />
          <button onClick={runQuery} disabled={loadingQuery || !query} className="px-4 py-2 rounded bg-green-600 text-white">{loadingQuery ? '...' : 'Search'}</button>
          <div className="mt-3 space-y-2">
            {results.map((r,i)=> (
              <div key={i} className="p-3 bg-gray-900/60 border border-gray-700 rounded">
                <div className="text-white font-medium">{r.title} <span className="text-xs text-gray-400">({(r.score||0).toFixed(3)})</span></div>
                <div className="text-gray-400 text-sm">{r.summary}</div>
                <div className="text-gray-500 text-xs">{r.path}</div>
              </div>
            ))}
            {results.length === 0 && <div className="text-gray-400">No results</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Knowledge
