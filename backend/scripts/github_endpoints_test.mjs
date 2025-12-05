import axios from 'axios'

async function main() {
  try {
    const base = 'http://127.0.0.1:4000'
    const tokenResp = await axios.post(`${base}/api/v1/auth/guest-token`)
    const token = tokenResp.data?.token || null
    console.log('token ok', !!token)

    const listResp = await axios.post(`${base}/api/v1/file/github/list`, {
      url: 'https://github.com/axios/axios',
      branch: 'main'
    }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
    const list = listResp.data
    console.log('list ok', list.success, 'files?', Array.isArray(list.files) ? list.files.length : 'n/a')

    const readResp = await axios.post(`${base}/api/v1/file/github/read-file`, {
      url: 'https://github.com/axios/axios',
      branch: 'main',
      filePath: 'README.md'
    }, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
    const read = readResp.data
    console.log('read ok', read.success, 'len', read.content ? read.content.length : 0)
  } catch (e) {
    if (e.response) {
      console.error('ERR', e.response.status, e.response.data)
    } else {
      console.error('ERR', e.message)
    }
    process.exit(1)
  }
}

main()
