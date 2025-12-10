/**
 * 👁️ Advanced Vision System v1.1 - Now with Visual Memory
 * @version 1.1.0
 * This version adds the capability to save images to the filesystem, giving the system a 'visual memory'.
 */

import OpenAI from 'openai';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Define a consistent storage path for generated/uploaded images
const VISION_STORAGE_PATH = path.join(process.cwd(), 'Infinity-x-platform', 'public-site', 'uploads', 'vision');

class AdvancedVisionSystem {
  constructor() {
    this.capabilities = [
      'image_analysis', 'object_detection', 'ocr', 'video_analysis',
      'image_generation', 'image_editing', 'style_transfer', 'visual_memory' // Added new capability
    ];
    this._initializeStorage();
  }

  /**
   * Ensures the storage directory for images exists.
   * @private
   */
  async _initializeStorage() {
    try {
      await fs.mkdir(VISION_STORAGE_PATH, { recursive: true });
      console.log(`👁️ Vision storage initialized at: ${VISION_STORAGE_PATH}`);
    } catch (error) {
      console.error(`❌ Failed to create vision storage directory: ${error.message}`);
    }
  }

  /**
   * Saves a Base64 encoded image to the filesystem.
   * @param {string} base64Data The Base64 encoded image data.
   * @param {string} filename The desired filename for the saved image.
   * @returns {Promise<object>} An object containing the success status and the public URL of the image.
   */
  async saveImageFromBase64(base64Data, filename) {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const filePath = path.join(VISION_STORAGE_PATH, filename);
      
      await fs.writeFile(filePath, buffer);
      
      const publicUrl = `/uploads/vision/${filename}`;
      const base = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';
      const absoluteUrl = publicUrl ? `${base}${publicUrl}` : '';
      console.log(`🖼️ Image saved successfully to ${publicUrl}`);

      return { 
        success: true, 
        message: 'Image saved successfully.',
        url: publicUrl,
        absoluteUrl
      };
    } catch (error) {
      console.error(`❌ Error saving image from Base64: ${error.message}`);
      return { success: false, error: `Failed to save image: ${error.message}` };
    }
  }

  async analyzeImage(imageUrl, options = {}) {
    try {
      const analysisTasks = {
        basic: this.basicAnalysis(imageUrl),
        objects: this.detectObjects(imageUrl),
        text: this.extractText(imageUrl),
      };
      const results = await Promise.all(Object.values(analysisTasks));
      const analysis = Object.keys(analysisTasks).reduce((acc, key, index) => {
        acc[key] = results[index];
        return acc;
      }, {});
      if (options.deepAnalysis) {
        analysis.advanced = await this.advancedAnalysis(imageUrl);
      }
      return analysis;
    } catch {
      try {
        const resp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const tmpName = `vision-${Date.now()}.png`;
        const tmpPath = path.join(VISION_STORAGE_PATH, tmpName);
        await fs.writeFile(tmpPath, Buffer.from(resp.data));
        const tesseract = await import('node-tesseract-ocr');
        const text = await tesseract.default.recognize(tmpPath).catch(() => '');
        return { basic: '', objects: {}, text: { text } };
      } catch (err) {
        return { basic: '', objects: {}, text: { text: '' }, error: err?.message || String(err) };
      }
    }
  }

  async basicAnalysis(imageUrl) {
    if (!openai) {
      return '';
    }
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: [{ type: 'text', text: 'Analyze this image in detail.' }, { type: 'image_url', image_url: { url: imageUrl } }] }
      ]
    });
    return response.choices[0].message.content;
  }

  async advancedAnalysis(imageUrl) {
      // This is a placeholder for a more detailed analysis call if needed
      return `Advanced analysis for ${imageUrl}`;
  }

  async detectObjects(imageUrl) {
    if (!openai) {
      return {};
    }
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: [{ type: 'text', text: 'Detect all objects in the image and return their names as a JSON array.' }, { type: 'image_url', image_url: { url: imageUrl } }] },
      ],
      response_format: { type: 'json_object' }
    });
    return JSON.parse(response.choices[0].message.content);
  }

  async extractText(imageUrl) {
    if (!openai) {
      return { text: '' };
    }
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: [{ type: 'text', text: 'Extract all text from the image.' }, { type: 'image_url', image_url: { url: imageUrl } }] }
      ]
    });
    return { text: response.choices[0].message.content };
  }

  async generateImage(prompt, options = {}) {
    const enhancedPrompt = await this.enhancePrompt(prompt);
    if (!openai) {
      try {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}`;
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(res.data, 'binary');
        const filename = `gen-${Date.now()}.png`;
        const filePath = path.join(VISION_STORAGE_PATH, filename);
        await fs.writeFile(filePath, buffer);
        const publicUrl = `/uploads/vision/${filename}`;
        const base = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';
        const absoluteUrl = publicUrl ? `${base}${publicUrl}` : '';
        return { url: publicUrl, absoluteUrl, revisedPrompt: enhancedPrompt };
      } catch {
        return { url: '', revisedPrompt: enhancedPrompt };
      }
    }
    const image = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      size: options.size || '1024x1024',
      quality: options.quality || 'hd',
      n: 1
    });
    return { url: image.data[0].url, revisedPrompt: image.data[0].revised_prompt };
  }

  async enhancePrompt(prompt) {
    if (!openai) {
      return prompt;
    }
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert prompt engineer for DALL-E 3.' },
        { role: 'user', content: `Enhance this prompt for better image generation: "${prompt}"` }
      ]
    });
    return response.choices[0].message.content;
  }

  async downloadImage(imageUrl) {
      const response = await axios({ url: imageUrl, responseType: 'arraybuffer' });
      return Buffer.from(response.data, 'binary');
  }
  
  async editImage(imageUrl, instruction) {
    const imageBuffer = await this.downloadImage(imageUrl);
    if (!openai) {
      return imageUrl;
    }
    const response = await openai.images.edit({
        image: imageBuffer,
        prompt: instruction,
    });
    return response.data[0].url;
  }
  
  async createVariations(imageUrl, count = 1) {
    const imageBuffer = await this.downloadImage(imageUrl);
    if (!openai) {
      return [];
    }
    const response = await openai.images.createVariation({
        image: imageBuffer,
        n: count,
        size: '1024x1024'
    });
    return response.data.map(img => img.url);
  }

  async compareImages(image1Url, image2Url) {
      if (!openai) {
        return { comparison: '' };
      }
      const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
              {
                  role: 'user',
                  content: [
                      { type: 'text', text: 'Compare these two images in detail. What are the key similarities and differences?' },
                      { type: 'image_url', image_url: { url: image1Url } },
                      { type: 'image_url', image_url: { url: image2Url } },
                  ]
              }
          ]
      });
      return { comparison: response.choices[0].message.content };
  }
}

export const visionSystem = new AdvancedVisionSystem();
