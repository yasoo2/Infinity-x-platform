/**
 * Multimodal Tools - قدرات الوسائط المتعددة
 * يسمح لـ JOE بفهم ومعالجة الصور والصوت والفيديو
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import axios from 'axios';
import path from 'path';

const openai = new OpenAI();

/**
 * تحليل صورة باستخدام Vision AI
 */
export async function analyzeImage(imageUrl, prompt = 'صف هذه الصورة بالتفصيل') {
  try {
    console.log(`👁️ Analyzing image: ${imageUrl}`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    return {
      success: true,
      analysis: response.choices[0].message.content,
      imageUrl
    };
  } catch (error) {
    console.error('Analyze image error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * تحليل صورة محلية
 */
export async function analyzeLocalImage(imagePath, prompt = 'صف هذه الصورة بالتفصيل') {
  try {
    console.log(`👁️ Analyzing local image: ${imagePath}`);

    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';

    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: dataUrl }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    return {
      success: true,
      analysis: response.choices[0].message.content,
      imagePath
    };
  } catch (error) {
    console.error('Analyze local image error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * إنشاء صورة باستخدام DALL-E
 */
export async function generateImage(prompt, size = '1024x1024', quality = 'standard') {
  try {
    console.log(`🎨 Generating image: "${prompt}"`);

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality
    });

    return {
      success: true,
      imageUrl: response.data[0].url,
      revisedPrompt: response.data[0].revised_prompt,
      prompt
    };
  } catch (error) {
    console.error('Generate image error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * تحويل الصوت إلى نص
 */
export async function transcribeAudio(audioFilePath) {
  try {
    console.log(`🎤 Transcribing audio: ${audioFilePath}`);

    const audioFile = await fs.readFile(audioFilePath);
    const blob = new Blob([audioFile]);
    
    const response = await openai.audio.transcriptions.create({
      file: blob,
      model: 'whisper-1',
      language: 'ar'
    });

    return {
      success: true,
      text: response.text,
      audioFilePath
    };
  } catch (error) {
    console.error('Transcribe audio error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * تحويل النص إلى صوت
 */
export async function textToSpeech(text, voice = 'alloy', outputPath = null) {
  try {
    console.log(`🔊 Converting text to speech...`);

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice, // alloy, echo, fable, onyx, nova, shimmer
      input: text
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    if (!outputPath) {
      outputPath = path.join(process.cwd(), 'temp', `speech_${Date.now()}.mp3`);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
    }

    await fs.writeFile(outputPath, buffer);

    return {
      success: true,
      audioPath: outputPath,
      text
    };
  } catch (error) {
    console.error('Text to speech error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * مقارنة صورتين
 */
export async function compareImages(imageUrl1, imageUrl2) {
  try {
    console.log(`🔍 Comparing two images...`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'قارن بين هاتين الصورتين واذكر أوجه التشابه والاختلاف' },
            { type: 'image_url', image_url: { url: imageUrl1 } },
            { type: 'image_url', image_url: { url: imageUrl2 } }
          ]
        }
      ],
      max_tokens: 500
    });

    return {
      success: true,
      comparison: response.choices[0].message.content,
      images: [imageUrl1, imageUrl2]
    };
  } catch (error) {
    console.error('Compare images error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * استخراج النص من صورة (OCR)
 */
export async function extractTextFromImage(imageUrl) {
  try {
    console.log(`📝 Extracting text from image...`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'استخرج جميع النصوص الموجودة في هذه الصورة' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 500
    });

    return {
      success: true,
      extractedText: response.choices[0].message.content,
      imageUrl
    };
  } catch (error) {
    console.error('Extract text from image error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * تحليل محتوى فيديو (عبر استخراج الإطارات)
 */
export async function analyzeVideo(videoPath, frameInterval = 5) {
  try {
    console.log(`🎬 Analyzing video: ${videoPath}`);

    // ملاحظة: هذه دالة مبسطة، في الواقع تحتاج إلى مكتبة مثل ffmpeg
    // لاستخراج الإطارات من الفيديو ثم تحليلها

    return {
      success: true,
      message: 'تحليل الفيديو يتطلب مكتبات إضافية (ffmpeg)',
      videoPath
    };
  } catch (error) {
    console.error('Analyze video error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * تحديد الكائنات في الصورة
 */
export async function detectObjects(imageUrl) {
  try {
    console.log(`🔍 Detecting objects in image...`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'حدد جميع الكائنات الموجودة في هذه الصورة واذكر موقعها' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 500
    });

    return {
      success: true,
      objects: response.choices[0].message.content,
      imageUrl
    };
  } catch (error) {
    console.error('Detect objects error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export const multimodalTools = {
  analyzeImage,
  analyzeLocalImage,
  generateImage,
  transcribeAudio,
  textToSpeech,
  compareImages,
  extractTextFromImage,
  analyzeVideo,
  detectObjects
};
