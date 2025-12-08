import sessionManager from './sessionManager.mjs'

export class BrowserAgentService {
  async startTask({ goal, start_url, max_steps }) {
    if (max_steps && Number(max_steps) > 0) sessionManager.maxSteps = Number(max_steps)
    const r = await sessionManager.createSession({ startUrl: start_url, goal })
    if (r?.error) throw new Error(r.error)
    return r
  }

  async openUrl({ session_id, url }) {
    const r = await sessionManager.openUrl(session_id, url)
    return r
  }

  async click({ session_id, selector, text_match }) {
    const r = await sessionManager.click(session_id, { selector, text_match })
    return r
  }

  async type({ session_id, selector, text, submit }) {
    const r = await sessionManager.type(session_id, { selector, text, submit })
    return r
  }

  async scroll({ session_id, direction, amount }) {
    const r = await sessionManager.scroll(session_id, { direction, amount })
    return r
  }

  async extract({ session_id, mode }) {
    const r = await sessionManager.extract(session_id, { mode })
    return r
  }

  async screenshot({ session_id, mode }) {
    const r = await sessionManager.screenshot(session_id, { mode })
    return r
  }

  async endTask({ session_id }) {
    const r = await sessionManager.end(session_id)
    return r
  }
}

export default new BrowserAgentService()

