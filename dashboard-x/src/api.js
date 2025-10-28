import axios from 'axios'

const BASE_URL = 'https://api.xelitesolutions.com'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

export function setSessionToken(token) {
  if (token) api.defaults.headers['x-session-token'] = token
  else delete api.defaults.headers['x-session-token']
}

export async function login(emailOrPhone, password) {
  const { data } = await api.post('/api/auth/login', { emailOrPhone, password })
  return data
}

export async function bootstrapSuper(email, phone, password) {
  const { data } = await api.post('/api/auth/bootstrap-super', { email, phone, password })
  return data
}

export async function getDashboardStatus() {
  const { data } = await api.get('/api/dashboard/status')
  return data
}

export async function getUsers() {
  const { data } = await api.get('/api/admin/users')
  return data
}

export async function getJoeActivity() {
  const { data } = await api.get('/api/joe/activity-stream')
  return data
}

export async function sendJoeCommand(sessionToken, lang, commandText, voice=false) {
  const { data } = await api.post('/api/joe/command', { sessionToken, lang, voice, commandText })
  return data
}
