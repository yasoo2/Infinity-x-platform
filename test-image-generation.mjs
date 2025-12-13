#!/usr/bin/env node

/**
 * Test script for image generation functionality
 */

import MediaGenerationTool from './backend/src/tools_refactored/media_generation.tool.mjs';

async function testImageGeneration() {
    console.log('🎨 Testing image generation...');
    
    const tool = new MediaGenerationTool({});
    
    try {
        const result = await tool.generateImage({
            prompt: 'A beautiful cat sitting on a windowsill',
            style: 'photorealistic',
            outputFilePath: './test-image.png'
        });
        
        console.log('🎨 Result:', result);
        
        if (result.success) {
            console.log('✅ Image generation successful!');
            console.log('📍 File saved:', result.outputFile);
            console.log('🌐 Public URL:', result.publicUrl);
            console.log('🔗 Absolute URL:', result.absoluteUrl);
        } else {
            console.log('❌ Image generation failed:', result.error);
        }
    } catch (error) {
        console.log('❌ Test failed with error:', error.message);
    }
}

testImageGeneration();