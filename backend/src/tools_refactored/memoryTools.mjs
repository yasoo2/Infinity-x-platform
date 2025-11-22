/**
 * Memory Tools - نظام الذاكرة طويلة المدى
 * يسمح لـ JOE بتذكر المحادثات والتعلم من التجارب
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORY_DIR = path.join(__dirname, '..', '..', 'memory');
const CONVERSATIONS_FILE = path.join(MEMORY_DIR, 'conversations.json');
const USER_PROFILES_FILE = path.join(MEMORY_DIR, 'user_profiles.json');
const KNOWLEDGE_BASE_FILE = path.join(MEMORY_DIR, 'knowledge_base.json');

/**
 * تهيئة نظام الذاكرة
 */
async function initializeMemory() {
  try {
    await fs.mkdir(MEMORY_DIR, { recursive: true });
    
    const files = [
      { path: CONVERSATIONS_FILE, data: [] },
      { path: USER_PROFILES_FILE, data: {} },
      { path: KNOWLEDGE_BASE_FILE, data: { facts: [], learnings: [] } }
    ];

    for (const file of files) {
      try {
        await fs.access(file.path);
      } catch {
        await fs.writeFile(file.path, JSON.stringify(file.data, null, 2));
      }
    }

    return { success: true, message: 'تم تهيئة نظام الذاكرة' };
  } catch (error) {
    console.error('Initialize memory error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * حفظ محادثة
 */
export async function saveConversation(userId, message, response, metadata = {}) {
  try {
    await initializeMemory();

    const conversations = JSON.parse(await fs.readFile(CONVERSATIONS_FILE, 'utf-8'));

    const conversation = {
      id: Date.now().toString(),
      userId,
      message,
      response,
      timestamp: new Date().toISOString(),
      metadata
    };

    conversations.push(conversation);

    // الاحتفاظ بآخر 1000 محادثة فقط
    if (conversations.length > 1000) {
      conversations.shift();
    }

    await fs.writeFile(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2));

    return {
      success: true,
      conversationId: conversation.id,
      message: 'تم حفظ المحادثة'
    };
  } catch (error) {
    console.error('Save conversation error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * استرجاع محادثات المستخدم
 */
export async function getUserConversations(userId, limit = 10) {
  try {
    await initializeMemory();

    const conversations = JSON.parse(await fs.readFile(CONVERSATIONS_FILE, 'utf-8'));

    const userConversations = conversations
      .filter(c => c.userId === userId)
      .slice(-limit)
      .reverse();

    return {
      success: true,
      conversations: userConversations,
      count: userConversations.length
    };
  } catch (error) {
    console.error('Get user conversations error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * البحث في المحادثات
 */
export async function searchConversations(query, userId = null) {
  try {
    await initializeMemory();

    const conversations = JSON.parse(await fs.readFile(CONVERSATIONS_FILE, 'utf-8'));

    let filtered = conversations;
    if (userId) {
      filtered = filtered.filter(c => c.userId === userId);
    }

    const queryLower = query.toLowerCase();
    const results = filtered.filter(c => 
      c.message.toLowerCase().includes(queryLower) ||
      c.response.toLowerCase().includes(queryLower)
    );

    return {
      success: true,
      results: results.slice(-20).reverse(),
      count: results.length
    };
  } catch (error) {
    console.error('Search conversations error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * حفظ ملف تعريف المستخدم
 */
export async function saveUserProfile(userId, profile) {
  try {
    await initializeMemory();

    const profiles = JSON.parse(await fs.readFile(USER_PROFILES_FILE, 'utf-8'));

    profiles[userId] = {
      ...profiles[userId],
      ...profile,
      lastUpdated: new Date().toISOString()
    };

    await fs.writeFile(USER_PROFILES_FILE, JSON.stringify(profiles, null, 2));

    return {
      success: true,
      message: 'تم حفظ ملف التعريف'
    };
  } catch (error) {
    console.error('Save user profile error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * استرجاع ملف تعريف المستخدم
 */
export async function getUserProfile(userId) {
  try {
    await initializeMemory();

    const profiles = JSON.parse(await fs.readFile(USER_PROFILES_FILE, 'utf-8'));

    return {
      success: true,
      profile: profiles[userId] || null
    };
  } catch (error) {
    console.error('Get user profile error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * حفظ معرفة جديدة
 */
export async function saveKnowledge(type, content, source = 'user') {
  try {
    await initializeMemory();

    const knowledge = JSON.parse(await fs.readFile(KNOWLEDGE_BASE_FILE, 'utf-8'));

    const entry = {
      id: Date.now().toString(),
      type, // 'fact' or 'learning'
      content,
      source,
      timestamp: new Date().toISOString(),
      confidence: 1.0
    };

    if (type === 'fact') {
      knowledge.facts.push(entry);
    } else if (type === 'learning') {
      knowledge.learnings.push(entry);
    }

    await fs.writeFile(KNOWLEDGE_BASE_FILE, JSON.stringify(knowledge, null, 2));

    return {
      success: true,
      entryId: entry.id,
      message: 'تم حفظ المعرفة'
    };
  } catch (error) {
    console.error('Save knowledge error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * البحث في قاعدة المعرفة
 */
export async function searchKnowledge(query) {
  try {
    await initializeMemory();

    const knowledge = JSON.parse(await fs.readFile(KNOWLEDGE_BASE_FILE, 'utf-8'));

    const queryLower = query.toLowerCase();
    const results = {
      facts: knowledge.facts.filter(f => 
        f.content.toLowerCase().includes(queryLower)
      ),
      learnings: knowledge.learnings.filter(l => 
        l.content.toLowerCase().includes(queryLower)
      )
    };

    return {
      success: true,
      results,
      totalCount: results.facts.length + results.learnings.length
    };
  } catch (error) {
    console.error('Search knowledge error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * الحصول على السياق للمحادثة
 */
export async function getConversationContext(userId, limit = 5) {
  try {
    const conversations = await getUserConversations(userId, limit);
    const profile = await getUserProfile(userId);

    return {
      success: true,
      context: {
        recentConversations: conversations.conversations || [],
        userProfile: profile.profile,
        conversationCount: conversations.count || 0
      }
    };
  } catch (error) {
    console.error('Get conversation context error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * تنظيف الذاكرة القديمة
 */
export async function cleanOldMemories(daysToKeep = 30) {
  try {
    await initializeMemory();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const conversations = JSON.parse(await fs.readFile(CONVERSATIONS_FILE, 'utf-8'));
    const filtered = conversations.filter(c => 
      new Date(c.timestamp) > cutoffDate
    );

    await fs.writeFile(CONVERSATIONS_FILE, JSON.stringify(filtered, null, 2));

    return {
      success: true,
      removed: conversations.length - filtered.length,
      remaining: filtered.length
    };
  } catch (error) {
    console.error('Clean old memories error:', error.message);
    return { success: false, error: error.message };
  }
}

export const memoryTools = {
  saveConversation,
  getUserConversations,
  searchConversations,
  saveUserProfile,
  getUserProfile,
  saveKnowledge,
  searchKnowledge,
  getConversationContext,
  cleanOldMemories
};
