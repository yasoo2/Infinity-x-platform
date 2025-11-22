/**
 * Multimodal Tools - Vision and Audio Capabilities
 * Allows JOE to understand and process images, and soon, audio and video.
 * @version 2.0.0 - ToolManager Compliant
 */

import { generativeVision, createImage } from '../services/ai/openai.service.mjs';
import path from 'path';
import fs from 'fs/promises';

async function analyzeImage({ imageUrl, prompt = 'Describe this image in detail.' }) {
    try {
        const analysis = await generativeVision(prompt, imageUrl);
        return { success: true, analysis };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
analyzeImage.metadata = {
    name: "analyzeImage",
    description: "Analyzes an image from a URL and answers questions about it or describes it based on a prompt.",
    parameters: {
        type: "object",
        properties: {
            imageUrl: { 
                type: "string", 
                description: "The public URL of the image to analyze."
            },
            prompt: { 
                type: "string", 
                description: "The specific question or instruction for analyzing the image.",
                default: "Describe this image in detail."
            }
        },
        required: ["imageUrl"]
    }
};

async function generateImage({ prompt, size = '1024x1024', quality = 'standard' }) {
    try {
        const result = await createImage(prompt, size, quality);
        return { success: true, ...result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
generateImage.metadata = {
    name: "generateImage",
    description: "Generates a new image using DALL-E 3 based on a textual prompt.",
    parameters: {
        type: "object",
        properties: {
            prompt: { 
                type: "string", 
                description: "A detailed description of the image to generate."
            },
            size: { 
                type: "string", 
                description: "The desired size of the image.",
                enum: ["1024x1024", "1792x1024", "1024x1792"],
                default: "1024x1024"
            },
            quality: { 
                type: "string", 
                description: "The quality of the generated image.",
                enum: ["standard", "hd"],
                default: "standard"
            }
        },
        required: ["prompt"]
    }
};

async function extractTextFromImage({ imageUrl }) {
    try {
        const prompt = 'Extract all text from this image. Only return the text, nothing else.';
        const extractedText = await generativeVision(prompt, imageUrl);
        return { success: true, extractedText };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
extractTextFromImage.metadata = {
    name: "extractTextFromImage",
    description: "Performs Optical Character Recognition (OCR) on an image from a URL to extract any text it contains.",
    parameters: {
        type: "object",
        properties: {
            imageUrl: { 
                type: "string", 
                description: "The public URL of the image from which to extract text."
            }
        },
        required: ["imageUrl"]
    }
};


export default { analyzeImage, generateImage, extractTextFromImage };
