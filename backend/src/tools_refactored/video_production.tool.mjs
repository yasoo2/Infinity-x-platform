import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..')
const PUBLIC_EXPORTS = path.join(PROJECT_ROOT, 'public-site', 'exports')
const run = promisify(exec)

class VideoProductionTool {
  constructor(dependencies) { this.dependencies = dependencies; this._initializeMetadata() }

  _initializeMetadata() {
    this.produceCartoonSeries.metadata = {
      name: "produceCartoonSeries",
      description: "Generates a simple cartoon series: storyboard -> frames -> audio -> video -> URLs.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Series title." },
          episodes: { type: "number", description: "Number of episodes.", default: 1 },
          scenesPerEpisode: { type: "number", description: "Scenes per episode.", default: 4 },
          style: { type: "string", description: "Visual style label.", default: "cartoon" },
          voice: { type: "string", description: "Voice style label.", default: "neutral" },
          baseUrl: { type: "string", description: "Base URL for downloads.", default: "http://localhost:4000" }
        },
        required: ["title"]
      }
    }
    this.composeVideoFromFrames.metadata = {
      name: "composeVideoFromFrames",
      description: "Composes a video from sequential frame images and optional audio, writes MP4.",
      parameters: { type: "object", properties: { framesDir: { type: "string" }, pattern: { type: "string" }, audioPath: { type: "string" }, outputPath: { type: "string" }, fps: { type: "number", default: 24 }, meta: { type: "object" } }, required: ["framesDir", "outputPath"] }
    }
    this.createStoryboard.metadata = {
      name: "createStoryboard",
      description: "Creates a simple storyboard structure for episodes and scenes.",
      parameters: { type: "object", properties: { title: { type: "string" }, episodes: { type: "number", default: 1 }, scenesPerEpisode: { type: "number", default: 4 } }, required: ["title"] }
    }
  }

  async _ensureDir(p) { await fs.mkdir(p, { recursive: true }) }

  async _resolveFfmpeg() {
    const candidates = [ 'ffmpeg' ]
    const home = process.env.HOME || process.env.USERPROFILE || ''
    const cacheBase = path.join(home, 'Library', 'Caches', 'ms-playwright')
    try {
      const dirs = await fs.readdir(cacheBase).catch(() => [])
      for (const d of dirs) {
        if (d.startsWith('ffmpeg')) {
          const p = path.join(cacheBase, d, 'ffmpeg')
          candidates.push(p)
        }
      }
    } catch (e) { void e }
    for (const c of candidates) {
      try { await run(`${c} -version`); return c } catch (e) { void e }
    }
    throw new Error('ffmpeg not available')
  }

  async createStoryboard({ title, episodes = 1, scenesPerEpisode = 4 }) {
    const storyboard = []
    for (let e = 1; e <= episodes; e++) {
      const ep = { episode: e, scenes: [] }
      for (let s = 1; s <= scenesPerEpisode; s++) {
        ep.scenes.push({ index: s, caption: `${title} - المشهد ${s}`, durationSec: 3 })
      }
      storyboard.push(ep)
    }
    return { success: true, title, episodes, scenesPerEpisode, storyboard }
  }

  async _renderFramesWithPlaywright({ storyboard, outDir, style = 'cartoon' }) {
    await this._ensureDir(outDir)
    const { chromium } = await import('playwright')
    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    let counter = 1
    for (const ep of storyboard) {
      for (const sc of ep.scenes) {
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
          body{margin:0;font-family:sans-serif;background:#f9f1a5;display:flex;align-items:center;justify-content:center;height:100vh;}
          .card{width:80%;height:70%;background:#fff;border-radius:24px;box-shadow:0 10px 30px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;}
          .caption{font-size:48px;text-align:center;color:#333;padding:20px}
        </style></head><body><div class="card"><div class="caption">${sc.caption} - ${style}</div></div></body></html>`
        await page.goto(`data:text/html,${encodeURIComponent(html)}`)
        const fileName = `frame_${String(counter).padStart(4,'0')}.png`
        const filePath = path.join(outDir, fileName)
        await page.screenshot({ path: filePath })
        counter++
      }
    }
    await browser.close()
    return { success: true, count: counter - 1, directory: outDir }
  }

  async _recordEpisodeWithPlaywright({ scenes, outDir, size = { width: 1280, height: 720 } }) {
    await this._ensureDir(outDir)
    const { chromium } = await import('playwright')
    const browser = await chromium.launch()
    const context = await browser.newContext({ recordVideo: { dir: outDir, size } })
    const page = await context.newPage()
    for (const sc of scenes) {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body{margin:0;font-family:sans-serif;background:#f9f1a5;display:flex;align-items:center;justify-content:center;height:100vh;}
        .card{width:80%;height:70%;background:#fff;border-radius:24px;box-shadow:0 10px 30px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;}
        .caption{font-size:48px;text-align:center;color:#333;padding:20px}
      </style></head><body><div class="card"><div class="caption">${sc.caption}</div></div></body></html>`
      await page.goto(`data:text/html,${encodeURIComponent(html)}`)
      await page.waitForTimeout((sc.durationSec || 3) * 1000)
    }
    const v = page.video()
    await page.close()
    await context.close()
    const videoPath = v ? await v.path() : null
    await browser.close()
    return videoPath
  }

  async composeVideoFromFrames({ framesDir, pattern = 'frame_%04d.png', audioPath, outputPath, fps = 24, meta = {} }) {
    await this._ensureDir(path.dirname(outputPath))
    const ffmpeg = await this._resolveFfmpeg()
    const metaArgs = []
    const entries = Object.entries(meta || {})
    for (const [k,v] of entries) metaArgs.push('-metadata', `${k}=${v}`)
    const audioArgs = audioPath ? ['-i', audioPath, '-shortest'] : []
    const cmd = `${ffmpeg} -y -framerate ${fps} -i "${path.join(framesDir, pattern)}" ${audioArgs.join(' ')} -c:v libx264 -pix_fmt yuv420p ${metaArgs.join(' ')} "${outputPath}"`
    await run(cmd)
    return { success: true, outputFile: outputPath }
  }

  async produceCartoonSeries({ title, episodes = 1, scenesPerEpisode = 4, style = 'cartoon', voice = 'neutral', baseUrl = 'http://localhost:4000' }) {
    const seriesId = String(Date.now())
    const seriesDir = path.join(PUBLIC_EXPORTS, `series_${seriesId}`)
    await this._ensureDir(seriesDir)
    const sb = await this.createStoryboard({ title, episodes, scenesPerEpisode })
    const videos = []
    for (let i=0;i<sb.storyboard.length;i++) {
      const ep = sb.storyboard[i]
      const outVideo = await this._recordEpisodeWithPlaywright({ scenes: ep.scenes.map(s=>({ ...s, caption: `${s.caption} - ${style}` })), outDir: seriesDir })
      const finalName = `episode_${String(i+1).padStart(2,'0')}${outVideo && outVideo.endsWith('.webm') ? '.webm' : '.mp4'}`
      const finalPath = path.join(seriesDir, finalName)
      if (outVideo) {
        try { await fs.rename(outVideo, finalPath) } catch { await fs.copyFile(outVideo, finalPath) }
        videos.push(finalPath)
      }
    }
    const urls = videos.map(v => `${String(baseUrl).replace(/\/$/,'')}/exports/${path.basename(seriesDir)}/${path.basename(v)}`)
    const manifest = { title, style, voice, episodes: videos.length, files: videos.map(v => path.basename(v)), urls }
    await fs.writeFile(path.join(seriesDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
    return { success: true, seriesDir, manifest, urls }
  }
}

export default VideoProductionTool
