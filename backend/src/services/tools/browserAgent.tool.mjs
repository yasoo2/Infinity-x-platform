import browserAgent from '../../browserAgent/browserAgent.service.mjs'

async function browser_start_task({ goal, start_url, max_steps }) {
  return await browserAgent.startTask({ goal, start_url, max_steps })
}
browser_start_task.metadata = {
  name: 'browser_start_task',
  description: 'Start a browser session with a goal and optional start URL',
  parameters: {
    type: 'object',
    properties: {
      goal: { type: 'string', description: 'Overall objective' },
      start_url: { type: 'string', description: 'Initial URL' },
      max_steps: { type: 'integer', description: 'Max steps for this session' }
    },
    required: ['goal']
  }
}

async function browser_open_url({ session_id, url }) {
  return await browserAgent.openUrl({ session_id, url })
}
browser_open_url.metadata = {
  name: 'browser_open_url',
  description: 'Navigate current session to a URL and summarize the page',
  parameters: { type: 'object', properties: { session_id: { type: 'string' }, url: { type: 'string' } }, required: ['session_id','url'] }
}

async function browser_click({ session_id, selector, text_match }) {
  return await browserAgent.click({ session_id, selector, text_match })
}
browser_click.metadata = {
  name: 'browser_click',
  description: 'Click an element by selector or exact text match',
  parameters: { type: 'object', properties: { session_id: { type: 'string' }, selector: { type: 'string' }, text_match: { type: 'string' } }, required: ['session_id'] }
}

async function browser_type({ session_id, selector, text, submit }) {
  return await browserAgent.type({ session_id, selector, text, submit })
}
browser_type.metadata = {
  name: 'browser_type',
  description: 'Type text into a field and optionally submit',
  parameters: { type: 'object', properties: { session_id: { type: 'string' }, selector: { type: 'string' }, text: { type: 'string' }, submit: { type: 'boolean' } }, required: ['session_id','selector','text'] }
}

async function browser_scroll({ session_id, direction, amount }) {
  return await browserAgent.scroll({ session_id, direction, amount })
}
browser_scroll.metadata = {
  name: 'browser_scroll',
  description: 'Scroll the page up or down by a relative amount',
  parameters: { type: 'object', properties: { session_id: { type: 'string' }, direction: { type: 'string', enum: ['up','down'] }, amount: { type: 'number' } }, required: ['session_id'] }
}

async function browser_extract({ session_id, mode }) {
  return await browserAgent.extract({ session_id, mode })
}
browser_extract.metadata = {
  name: 'browser_extract',
  description: 'Extract structured content chunks from the page',
  parameters: { type: 'object', properties: { session_id: { type: 'string' }, mode: { type: 'string', enum: ['full_text','main_content','links','code_blocks'] } }, required: ['session_id'] }
}

async function browser_screenshot({ session_id, mode }) {
  return await browserAgent.screenshot({ session_id, mode })
}
browser_screenshot.metadata = {
  name: 'browser_screenshot',
  description: 'Capture a screenshot (viewport or full page)',
  parameters: { type: 'object', properties: { session_id: { type: 'string' }, mode: { type: 'string', enum: ['full','viewport'] } }, required: ['session_id'] }
}

async function browser_end_task({ session_id }) {
  return await browserAgent.endTask({ session_id })
}
browser_end_task.metadata = {
  name: 'browser_end_task',
  description: 'End a browser session and release resources',
  parameters: { type: 'object', properties: { session_id: { type: 'string' } }, required: ['session_id'] }
}

export default {
  browser_start_task,
  browser_open_url,
  browser_click,
  browser_type,
  browser_scroll,
  browser_extract,
  browser_screenshot,
  browser_end_task
}

