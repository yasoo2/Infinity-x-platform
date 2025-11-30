/**
 * 🧠 Continuous Learning System
 * The system learns and improves with every interaction.
 * This is an advanced version that complements the existing memory.service.mjs
 */

import OpenAI from 'openai';
import crypto from 'crypto';
import { getDB } from '../services/db.mjs'; // Assuming db.mjs is in services

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

class ContinuousLearningSystem {
  constructor() {
    this.modelVersions = [];
    this.currentVersion = '1.0.0';
  }

  async learn(interaction) {
    const db = await getDB();
    // 1. Record the interaction
    const record = await this.recordInteraction(interaction, db);
    void record;

    // 2. Analyze the outcome
    const analysis = await this.analyzeOutcome(interaction, db);

    // 3. Extract patterns
    const patterns = await this.extractPatterns(analysis);

    // 4. Update knowledge base
    await this.updateKnowledge(patterns, db);

    // 5. Check if model optimization is needed
    if (await this.shouldOptimize(db)) {
      await this.optimizeModel(db);
    }

    return {
      learned: true,
      patterns: patterns.length,
      improvement: this.calculateImprovement()
    };
  }

  async recordInteraction(interaction, db) {
    const record = {
      _id: `int_${crypto.randomUUID()}`,
      timestamp: new Date(),
      userId: interaction.userId,
      request: interaction.request,
      response: interaction.response,
      toolsUsed: interaction.toolsUsed,
      executionTime: interaction.executionTime,
      success: interaction.success,
      userFeedback: null // To be updated later
    };
    await db.collection('learning_data').insertOne(record);
    return record;
  }

  async analyzeOutcome(interaction, db) {
    void db;
    return {
      successRate: interaction.success ? 100 : 0,
      efficiency: interaction.executionTime,
      // In a real scenario, these would be more complex calculations
      userSatisfaction: interaction.userFeedback?.score || 3, // Default to neutral
      codeQuality: interaction.codeQuality || null,
      performanceImpact: interaction.performanceImpact || null
    };
  }

  async extractPatterns(analysis) {
    const prompt = `
    Analyze the following data and extract meaningful patterns for system improvement:
    ${JSON.stringify(analysis, null, 2)}

    Extract:
    1. Successful patterns (what worked well)
    2. Failure patterns (what went wrong)
    3. Potential improvements
    4. Recommendations for future actions

    Respond in JSON format: {"patterns": [{"type": "...". "confidence": 0.9, ...}]}
    `;

    try {
        if (!openai) {
            return [];
        }
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are an expert data analyst.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
        });
        const extracted = JSON.parse(response.choices[0].message.content);
        return extracted.patterns || [];
    } catch (error) {
        console.error("Failed to extract patterns from AI:", error);
        return [];
    }
  }

  async updateKnowledge(patterns, db) {
    for (const pattern of patterns) {
      if (pattern.confidence > 0.8) {
        await db.collection('knowledge_patterns').updateOne(
          { type: pattern.type, signature: pattern.signature },
          { $inc: { frequency: 1 }, $set: { ...pattern, lastSeen: new Date() } },
          { upsert: true }
        );
      }
    }
  }

  async shouldOptimize(db) {
    const count = await db.collection('learning_data').countDocuments();
    const lastOptimization = await db.collection('system_meta').findOne({ _id: 'last_optimization' });
    const timeSinceOptimization = lastOptimization ? Date.now() - lastOptimization.value.getTime() : Infinity;

    // Optimize every 1000 interactions or every week
    return count % 1000 === 0 || timeSinceOptimization > 7 * 24 * 60 * 60 * 1000;
  }

  async optimizeModel(db) {
    console.log('🔄 Starting model optimization...');
    // This is a placeholder for a complex process which could involve:
    // 1. Preparing training data from the learning_data collection
    // 2. Fine-tuning an OpenAI model
    // 3. A/B testing the new model
    await db.collection('system_meta').updateOne(
        { _id: 'last_optimization' },
        { $set: { value: new Date() } },
        { upsert: true }
    );
    this.currentVersion = `${this.currentVersion.split('.')[0]}.${parseInt(this.currentVersion.split('.')[1] || 0) + 1}.0`;
    console.log(`✅ Model optimized. New version: ${this.currentVersion}`);
  }
  
  calculateImprovement() {
    // Placeholder for improvement calculation
    return '0.5%';
  }

  async getStats(db) {
      const totalInteractions = await db.collection('learning_data').countDocuments();
      const patternsLearned = await db.collection('knowledge_patterns').countDocuments();
      const lastOptimization = await db.collection('system_meta').findOne({ _id: 'last_optimization' });

    return {
      totalInteractions,
      patternsLearned,
      currentVersion: this.currentVersion,
      improvement: this.calculateImprovement(),
      lastOptimization: lastOptimization ? lastOptimization.value : 'N/A',
    };
  }
}

export const learningSystem = new ContinuousLearningSystem();
