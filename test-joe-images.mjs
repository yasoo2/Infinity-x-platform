#!/usr/bin/env node

/**
 * Test script for Joe's image generation functionality
 */

import { processMessage } from './backend/src/services/ai/joe-imagemaster.service.mjs';

// Mock memory manager for testing
const mockMemoryManager = {
  async getRecentInteractions(userId, limit) {
    return [];
  },
  async saveInteraction(userId, message, response, metadata) {
    console.log('💾 Memory saved:', { userId, message, response, metadata });
  }
};

async function testJoeImageGeneration() {
  console.log('🎨 Testing Joe ImageMaster Engine...\n');
  
  // Initialize the service
  const { init } = await import('./backend/src/services/ai/joe-imagemaster.service.mjs');
  init({ memoryManager: mockMemoryManager });
  
  const testMessages = [
    'صمم لي صورة قطة جميلة',
    'ارسم شعاراً لشركة تقنية',
    'generate a beautiful sunset image',
    'اصنع صورة لطبيعة خلابة'
  ];
  
  for (const message of testMessages) {
    console.log(`🧪 Testing: "${message}"`);
    console.log('─'.repeat(50));
    
    try {
      const result = await processMessage(message, {
        userId: 'test-user',
        sessionId: 'test-session',
        lang: 'ar',
        provider: 'openai'
      });
      
      console.log('✅ Response:', result.response);
      console.log('🔧 Tools used:', result.toolsUsed);
      
      // Check if image was generated
      if (result.response.includes('!size[')) {
        console.log('🎨 Image display syntax detected!');
        
        // Extract URL from response
        const urlMatch = result.response.match(/!size\[[^\]]+\]\s*`([^`]+)`/);
        if (urlMatch && urlMatch[1]) {
          console.log('🌐 Image URL:', urlMatch[1]);
        }
      } else {
        console.log('⚠️ No image display syntax found in response');
      }
      
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    console.log('');
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🎯 Test completed!');
}

testJoeImageGeneration().catch(console.error);