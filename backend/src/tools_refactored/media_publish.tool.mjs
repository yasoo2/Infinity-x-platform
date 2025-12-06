import fs from 'fs/promises'
import path from 'path'

const PROJECT_ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..')
const PUBLIC_EXPORTS = path.join(PROJECT_ROOT, 'public-site', 'exports')

async function publishLocally({ filePath, baseUrl = 'http://localhost:4000', subdir }) {
  try {
    const exists = await fs.stat(filePath).then(() => true).catch(() => false)
    if (!exists) return { success: false, error: 'FILE_NOT_FOUND' }
    const dirName = subdir || `published_${Date.now()}`
    const outDir = path.join(PUBLIC_EXPORTS, dirName)
    await fs.mkdir(outDir, { recursive: true })
    const target = path.join(outDir, path.basename(filePath))
    try { await fs.copyFile(filePath, target) } catch (e) { return { success: false, error: e?.message || String(e) } }
    const url = `${String(baseUrl).replace(/\/$/,'')}/exports/${dirName}/${path.basename(filePath)}`
    return { success: true, url, directory: outDir }
  } catch (error) { return { success: false, error: error?.message || String(error) } }
}
publishLocally.metadata = {
  name: "publishLocally",
  description: "Publishes a local media file to the server's public exports directory and returns a download URL.",
  parameters: { type: "object", properties: { filePath: { type: "string" }, baseUrl: { type: "string", default: "http://localhost:4000" }, subdir: { type: "string" } }, required: ["filePath"] }
}

async function uploadToYouTube({ filePath, title, description, privacyStatus = 'private', tags = [], accessToken }) {
  if (!accessToken) return { success: false, error: 'MISSING_CREDENTIALS', message: 'Provide OAuth accessToken.' }
  void filePath; void title; void description; void privacyStatus; void tags;
  return { success: false, error: 'NOT_IMPLEMENTED', message: 'YouTube upload requires OAuth flow; add credentials to enable.' }
}
uploadToYouTube.metadata = {
  name: "uploadToYouTube",
  description: "Uploads a video to YouTube via Data API v3. Requires OAuth access token.",
  parameters: { type: "object", properties: { filePath: { type: "string" }, title: { type: "string" }, description: { type: "string" }, privacyStatus: { type: "string", default: "private" }, tags: { type: "array", items: { type: "string" } }, accessToken: { type: "string" } }, required: ["filePath","title","description"] }
}

async function uploadToTikTok({ filePath, title, description, accessToken }) {
  if (!accessToken) return { success: false, error: 'MISSING_CREDENTIALS', message: 'Provide OAuth accessToken.' }
  void filePath; void title; void description;
  return { success: false, error: 'NOT_IMPLEMENTED', message: 'TikTok upload API integration placeholder; add credentials and endpoint.' }
}
uploadToTikTok.metadata = {
  name: "uploadToTikTok",
  description: "Uploads a video to TikTok. Requires OAuth access token and partner API setup.",
  parameters: { type: "object", properties: { filePath: { type: "string" }, title: { type: "string" }, description: { type: "string" }, accessToken: { type: "string" } }, required: ["filePath","title"] }
}

export default { publishLocally, uploadToYouTube, uploadToTikTok }
