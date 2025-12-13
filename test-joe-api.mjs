#!/usr/bin/env node

/**
 * Test Joe's image generation through the actual API endpoint
 */

import axios from 'axios';

async function testJoeAPI() {
  console.log('🎨 Testing Joe API for image generation...\n');
  
  const testMessages = [
    'صمم لي صورة قطة جميلة',
    'ارسم شعاراً لشركة تقنية',
    'generate a beautiful sunset image',
    'اصنع صورة لطبيعة خلابة'
  ];
  
  const API_URL = 'http://localhost:4000/api/v1/joe-chat-advanced';
  
  // First, let's test if the server is responding
  try {
    const healthCheck = await axios.get('http://localhost:4000/api/v1/system/status');
    console.log('✅ Server is running:', healthCheck.data);
  } catch (error) {
    console.log('❌ Server not responding:', error.message);
    return;
  }
  
  for (const message of testMessages) {
    console.log(`🧪 Testing: "${message}"`);
    console.log('─'.repeat(50));
    
    try {
      const response = await axios.post(API_URL, {
        message: message,
        sessionId: 'test-session-123'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ API Response:', response.data);
      
      const result = response.data;
      if (result.success) {
        console.log('🎨 Response:', result.response);
        console.log('🔧 Tools used:', result.toolsUsed);
        
        // Check if image was generated
        if (result.response && result.response.includes('!size[')) {
          console.log('🎨 Image display syntax detected!');
          
          // Extract URL from response
          const urlMatch = result.response.match(/!size\[[^\]]+\]\s*`([^`]+)`/);
          if (urlMatch && urlMatch[1]) {
            console.log('🌐 Image URL:', urlMatch[1]);
          }
        } else {
          console.log('⚠️ No image display syntax found in response');
        }
      } else {
        console.log('❌ API Error:', result.error);
      }
      
    } catch (error) {
      console.log('❌ Request failed:', error.message);
      if (error.response) {
        console.log('Response data:', error.response.data);
      }
    }
    
    console.log('');
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('🎯 API Test completed!');
}

testJoeAPI().catch(console.error);