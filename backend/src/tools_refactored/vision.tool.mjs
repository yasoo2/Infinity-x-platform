/**
 * Vision Tool - Bridge to the Advanced Vision System
 * Provides tools for image analysis, generation, and manipulation.
 * @version 1.0.0
 */

import { visionSystem } from '../systems/vision.service.mjs';

/**
 * Analyzes an image from a URL to extract descriptions, objects, and text.
 * @param {object} params - The parameters for image analysis.
 * @param {string} params.imageUrl - The URL of the image to analyze.
 * @returns {Promise<object>} - An object containing the analysis results.
 */
async function analyzeImage({ imageUrl }) {
  try {
    const result = await visionSystem.analyzeImage(imageUrl);
    return { success: true, analysis: result };
  } catch (error) {
    console.error('❌ Image analysis failed:', error);
    return { success: false, error: `Failed to analyze image: ${error.message}` };
  }
}

analyzeImage.metadata = {
    name: "analyzeImage",
    description: "Analyzes an image from a given URL to describe its content, detect objects, and extract any visible text (OCR).",
    parameters: {
        type: "object",
        properties: { 
            imageUrl: { type: "string", description: "The public URL of the image to be analyzed." }
        },
        required: ["imageUrl"]
    }
};

/**
 * Generates an image based on a textual description (prompt).
 * @param {object} params - The parameters for image generation.
 * @param {string} params.prompt - The descriptive prompt for the image to generate.
 * @param {string} [params.size='1024x1024'] - The size of the generated image.
 * @returns {Promise<object>} - An object containing the URL of the generated image.
 */
async function generateImageVision({ prompt, size }) {
    try {
        const result = await visionSystem.generateImage(prompt, { size });
        return { success: true, ...result };
    } catch (error) {
        console.error('❌ Image generation failed:', error);
        return { success: false, error: `Failed to generate image: ${error.message}` };
    }
}

generateImageVision.metadata = {
    name: "generateImageVision",
    description: "Generates a new image from a textual description using the DALL-E 3 model.",
    parameters: {
        type: "object",
        properties: {
            prompt: { type: "string", description: "A detailed text description of the desired image." },
            size: { type: "string", description: "The desired size of the image, e.g., '1024x1024'.", optional: true }
        },
        required: ["prompt"]
    }
};

/**
 * Compares two images from URLs and provides a detailed comparison.
 * @param {object} params - The parameters for image comparison.
 * @param {string} params.image1Url - The URL of the first image.
 * @param {string} params.image2Url - The URL of the second image.
 * @returns {Promise<object>} - An object containing the textual comparison.
 */
async function compareImages({ image1Url, image2Url }) {
    try {
        const result = await visionSystem.compareImages(image1Url, image2Url);
        return { success: true, ...result };
    } catch (error) {
        console.error('❌ Image comparison failed:', error);
        return { success: false, error: `Failed to compare images: ${error.message}` };
    }
}

compareImages.metadata = {
    name: "compareImages",
    description: "Performs a detailed visual comparison between two images, highlighting similarities and differences.",
    parameters: {
        type: "object",
        properties: {
            image1Url: { type: "string", description: "The public URL of the first image." },
            image2Url: { type: "string", description: "The public URL of the second image." }
        },
        required: ["image1Url", "image2Url"]
    }
};

/**
 * Edits an existing image based on a textual instruction.
 * @param {object} params - The parameters for image editing.
 * @param {string} params.imageUrl - The URL of the image to edit.
 * @param {string} params.instruction - The text instruction describing the desired edit.
 * @returns {Promise<object>} - An object containing the URL of the edited image.
 */
async function editImage({ imageUrl, instruction }) {
    try {
        const newImageUrl = await visionSystem.editImage(imageUrl, instruction);
        return { success: true, newImageUrl };
    } catch (error) {
        console.error('❌ Image editing failed:', error);
        return { success: false, error: `Failed to edit image: ${error.message}` };
    }
}

editImage.metadata = {
    name: "editImage",
    description: "Edits an existing image based on a natural language instruction.",
    parameters: {
        type: "object",
        properties: {
            imageUrl: { type: "string", description: "The public URL of the image to be edited." },
            instruction: { type: "string", description: "A clear instruction on how to edit the image (e.g., 'add a hat on the person')." }
        },
        required: ["imageUrl", "instruction"]
    }
};


export default { analyzeImage, generateImageVision, compareImages, editImage };
