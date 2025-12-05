import fetch from 'node-fetch'

async function discoverNpmPackages({ query, size = 5 }) {
  const q = String(query || '').trim()
  if (!q) return { success: false, error: 'Empty query' }
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=${Number(size) || 5}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    const items = (data.objects || []).map(o => ({
      name: o.package?.name,
      version: o.package?.version,
      description: o.package?.description,
      keywords: o.package?.keywords || [],
      links: o.package?.links || {},
      score: o.score?.final || 0,
    }))
    return { success: true, source: 'npm', query: q, items }
  } catch (e) {
    return { success: false, error: e?.message || 'npm search failed' }
  }
}
discoverNpmPackages.metadata = {
  name: 'discoverNpmPackages',
  description: 'Search npm registry for packages matching query',
  parameters: { type: 'object', properties: { query: { type: 'string' }, size: { type: 'integer' } }, required: ['query'] }
}

async function discoverGitHubRepos({ query, language = 'JavaScript', size = 5 }) {
  const q = String(query || '').trim()
  if (!q) return { success: false, error: 'Empty query' }
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}+language:${encodeURIComponent(language)}&sort=stars&order=desc&per_page=${Number(size) || 5}`
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } })
    const data = await res.json()
    const items = (data.items || []).map(r => ({
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      url: r.html_url
    }))
    return { success: true, source: 'github', query: q, language, items }
  } catch (e) {
    return { success: false, error: e?.message || 'github search failed' }
  }
}
discoverGitHubRepos.metadata = {
  name: 'discoverGitHubRepos',
  description: 'Search GitHub repositories by query and language',
  parameters: { type: 'object', properties: { query: { type: 'string' }, language: { type: 'string' }, size: { type: 'integer' } }, required: ['query'] }
}

export default { discoverNpmPackages, discoverGitHubRepos }
