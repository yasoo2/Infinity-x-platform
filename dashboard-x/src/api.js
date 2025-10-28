// api.js
const API_BASE = __API_BASE__

// نخزن التوكن بالمتصفح
export function saveSessionToken(token) {
  localStorage.setItem('sessionToken', token)
}

export function getSessionToken() {
  return localStorage.getItem('sessionToken')
}

// login
export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })

  if (!res.ok) {
    throw new Error('Network error')
  }

  const data = await res.json()
  // المتوقع من الـ API تبعك (شفناه بالبوستمان):
  // {
  //   "ok": true,
  //   "sessionToken": "...",
  //   "user": {...}
  // }

  if (!data.ok || !data.sessionToken) {
    throw new Error('Bad credentials')
  }

  saveSessionToken(data.sessionToken)
  return data
}

// get system stats
export async function getStatus() {
  const token = getSessionToken()
  const res = await fetch(`${API_BASE}/`, {
    headers: {
      'x-session-token': token ?? ''
    }
  })
  const data = await res.json()
  return data
}

// get users list
export async function getUsers() {
  const token = getSessionToken()
  const res = await fetch(`${API_BASE}/api/admin/users`, {
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': token ?? ''
    }
  })

  if (!res.ok) {
    throw new Error('Unauthorized or failed')
  }

  const data = await res.json()
  return data
}

// send command to Joe
export async function sendJoeCommand(text, lang = 'ar') {
  const token = getSessionToken()
  const res = await fetch(`${API_BASE}/api/joe/command`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionToken: token ?? '',
      lang,
      voice: false,
      commandText: text
    })
  })

  const data = await res.json()
  return data
}