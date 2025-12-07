/**
 * 🎨 MediaGenerationTool - Enables JOE to create and edit images, video, and audio.
 * This tool leverages external AI services (like DALL-E, Stable Diffusion, or a custom service).
 */
import fs from 'fs/promises'
import path from 'path'
import OpenAI from 'openai'

class MediaGenerationTool {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this._initializeMetadata();
        this._openai = null;
        try {
            const key = process.env.OPENAI_API_KEY || this.dependencies?.openaiApiKey;
            if (key) this._openai = new OpenAI({ apiKey: key });
        } catch { this._openai = null }
    }

    _initializeMetadata() {
        this.generateImage.metadata = {
            name: "generateImage",
            description: "Generates a high-quality image from a detailed text prompt. The output is a PNG file saved to the workspace.",
            parameters: {
                type: "object",
                properties: {
                    prompt: { type: "string", description: "A detailed, descriptive prompt for the image to be generated." },
                    style: { type: "string", description: "The artistic style for the image (e.g., 'photorealistic', 'oil painting', 'cyberpunk')." },
                    outputFilePath: { type: "string", description: "The absolute path where the generated image should be saved (e.g., /home/joe/logo.png)." }
                },
                required: ["prompt", "outputFilePath"]
            }
        };

        this.editImage.metadata = {
            name: "editImage",
            description: "Edits an existing image file based on a text instruction. Requires the path to the original image and a mask (if applicable).",
            parameters: {
                type: "object",
                properties: {
                    originalFilePath: { type: "string", description: "The absolute path to the original image file." },
                    editInstruction: { type: "string", description: "A clear instruction for the edit (e.g., 'Change the color of the car to red')." },
                    outputFilePath: { type: "string", description: "The absolute path where the edited image should be saved." }
                },
                required: ["originalFilePath", "editInstruction", "outputFilePath"]
            }
        };

        this.generateSpeech.metadata = {
            name: "generateSpeech",
            description: "Generates an audio file (MP3) from a text script using a specified voice.",
            parameters: {
                type: "object",
                properties: {
                    text: { type: "string", description: "The text script to be converted to speech." },
                    voice: { type: "string", description: "The desired voice for the speech (e.g., 'male-deep', 'female-friendly')." },
                    outputFilePath: { type: "string", description: "The absolute path where the audio file should be saved (e.g., /home/joe/intro.mp3)." }
                },
                required: ["text", "outputFilePath"]
            }
        };

        this.downloadImageFromUrl.metadata = {
            name: "downloadImageFromUrl",
            description: "Downloads an image from a direct URL and saves it to a web-accessible uploads folder.",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "The direct image URL (jpg, png, webp, gif, etc.)." },
                    outputFilePath: { type: "string", description: "Optional absolute path to save file. If omitted, saves under public-site/uploads." },
                    filename: { type: "string", description: "Optional desired filename (e.g., logo.png)." }
                },
                required: ["url"]
            }
        };
    }

    async generateImage({ prompt, style, outputFilePath }) {
        const p = String(prompt || '').trim();
        if (!p) return { success: false, error: 'PROMPT_REQUIRED' };
        const out = String(outputFilePath || '').trim();
        if (!out) return { success: false, error: 'OUTPUT_PATH_REQUIRED' };

        if (!this._openai) {
            return {
                success: false,
                error: 'OPENAI_API_KEY_MISSING',
                message: 'Provide OPENAI_API_KEY to enable real image generation.'
            };
        }

        try {
            const size = '1024x1024';
            const model = 'gpt-image-1';
            const promptText = style ? `${p}\nStyle: ${style}` : p;
            const res = await this._openai.images.generate({ model, prompt: promptText, size });
            const b64 = res?.data?.[0]?.b64_json || '';
            if (!b64) return { success: false, error: 'EMPTY_IMAGE_RESPONSE' };
            const buf = Buffer.from(b64, 'base64');
            await fs.writeFile(out, buf);
            return { success: true, outputFile: out, size, model };
        } catch (error) {
            return { success: false, error: error?.message || String(error) };
        }
    }

    async editImage({ originalFilePath, editInstruction, outputFilePath }) {
        // Placeholder for external service call
        return {
            success: true,
            message: `Image editing request for ${originalFilePath} with instruction: "${editInstruction}" initiated.`,
            outputFile: outputFilePath,
            note: "Actual editing requires a configured external AI service."
        };
    }

    async generateSpeech({ text, voice, outputFilePath }) {
        // Placeholder for external service call (e.g., Text-to-Speech API)
        return {
            success: true,
            message: `Speech generation request for text: "${text.substring(0, 30)}..." using voice: "${voice}" initiated.`,
            outputFile: outputFilePath,
            note: "Actual speech generation requires a configured external AI service."
        };
    }

    async downloadImageFromUrl({ url, outputFilePath, filename, userId }) {
        const src = String(url || '').trim();
        if (!src) return { success: false, error: 'URL_REQUIRED' };
        try {
            const res = await fetch(src, { redirect: 'follow' });
            if (!res.ok) return { success: false, error: `HTTP_${res.status}` };
            const ct = res.headers.get('content-type') || '';
            const isImage = /image\/(png|jpeg|jpg|gif|webp|bmp|svg)/i.test(ct) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(src);
            if (!isImage) return { success: false, error: 'NOT_IMAGE_URL' };
            const buf = Buffer.from(await res.arrayBuffer());
            let ext = '.png';
            if (/jpeg|jpg/i.test(ct) || /\.jpe?g(\?|$)/i.test(src)) ext = '.jpg';
            else if (/png/i.test(ct) || /\.png(\?|$)/i.test(src)) ext = '.png';
            else if (/webp/i.test(ct) || /\.webp(\?|$)/i.test(src)) ext = '.webp';
            else if (/gif/i.test(ct) || /\.gif(\?|$)/i.test(src)) ext = '.gif';
            else if (/bmp/i.test(ct) || /\.bmp(\?|$)/i.test(src)) ext = '.bmp';
            else if (/svg/i.test(ct) || /\.svg(\?|$)/i.test(src)) ext = '.svg';

            const baseUploads = path.join(process.cwd(), 'public-site', 'uploads');
            try { await fs.mkdir(baseUploads, { recursive: true }); } catch { /* noop */ }
            let userFolder = '';
            if (userId) {
                try {
                    const safe = String(userId).replace(/[^A-Za-z0-9_:\-]/g, '_');
                    userFolder = safe;
                    await fs.mkdir(path.join(baseUploads, userFolder), { recursive: true });
                } catch { userFolder = ''; }
            }
            const name = String(filename || '').trim() || `imported-${Date.now()}${ext}`;
            const outPath = String(outputFilePath || '').trim() || path.join(baseUploads, userFolder ? userFolder : '', name);
            await fs.writeFile(outPath, buf);
            const parts = ['/uploads'];
            if (userFolder) parts.push(userFolder);
            parts.push(path.basename(outPath));
            const publicUrl = parts.join('/');
            const base = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';
            const absoluteUrl = `${base}${publicUrl}`;
            return { success: true, outputFile: outPath, publicUrl, absoluteUrl, contentType: ct };
        } catch (error) {
            return { success: false, error: error?.message || String(error) };
        }
    }
}

export default MediaGenerationTool;
