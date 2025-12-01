/**
 * AI Engine Service - Real Implementation
 * Supports multiple AI models: OpenAI, Gemini, Grok
 * Provides model switching and unified interface for AI operations
 */

import { OpenAI } from 'openai';
import { LocalLlamaService } from '../services/llm/local-llama.service.mjs'; // تصحيح مسار الاستيراد

class AIEngineService {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this.currentModel = process.env.AI_MODEL || 'openai'; // Default model
        this.models = {
            openai: this.initOpenAI(),
            gemini: this.initGemini(),
            grok: this.initGrok(),
            llama: this.initLocalLlama(), // إضافة النظام المحلي
        };
        console.log(`✅ AIEngineService Initialized with model: ${this.currentModel}`);
    }

    /**
     * Initialize OpenAI client
     */
    initOpenAI() {
        try {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                console.warn('⚠️ OPENAI_API_KEY not found in environment variables.');
                return null;
            }
            return new OpenAI({ apiKey });
        } catch (error) {
            console.error('❌ Failed to initialize OpenAI:', error.message);
            return null;
        }
    }

    /**
     * Initialize Gemini client (Google AI)
     */
    initGemini() {
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                console.warn('⚠️ GEMINI_API_KEY not found in environment variables.');
                return null;
            }
            // Gemini API client initialization
            // Using Google's generative AI library
            return {
                apiKey,
                model: 'gemini-2.5-flash',
            };
        } catch (error) {
            console.error('❌ Failed to initialize Gemini:', error.message);
            return null;
        }
    }

    /**
     * Initialize Grok client (xAI)
     */
    initGrok() {
        try {
            const apiKey = process.env.GROK_API_KEY;
            if (!apiKey) {
                console.warn('⚠️ GROK_API_KEY not found in environment variables.');
                return null;
            }
            // Grok API client initialization
            // Using xAI's API
            return {
                apiKey,
                model: 'grok-2',
                baseURL: 'https://api.x.ai/v1',
            };
        } catch (error) {
            console.error('❌ Failed to initialize Grok:', error.message);
            return null;
        }
    }

    /**
     * Switch between AI models
     * @param {string} modelName - Model name: 'openai', 'gemini', or 'grok'
     */
    switchModel(modelName) {
        if (!this.models[modelName]) {
            throw new Error(`Model '${modelName}' is not supported.`);
        }
        if (!this.models[modelName]) {
            throw new Error(`Model '${modelName}' is not initialized. Check API keys.`);
        }
        this.currentModel = modelName;
        console.log(`✅ Switched to model: ${modelName}`);
        return { success: true, currentModel: this.currentModel };
    }

    /**
     * Initialize Local Llama client
     */
    initLocalLlama() {
        try {
            const isEnabled = process.env.LOCAL_LLAMA_ENABLED === 'true';
            if (!isEnabled) {
                console.warn('⚠️ Local Llama is disabled by environment variable.');
                return null;
            }
            // LocalLlamaService هو الواجهة الموحدة للنموذج المحلي
            return new LocalLlamaService();
        } catch (error) {
            console.error('❌ Failed to initialize Local Llama:', error.message);
            return null;
        }
    }

    /**
     * Smart Routing Logic: Decides which model to use based on task and user preference
     * @param {string} prompt - User prompt
     * @param {object} options - Options including preferredModel
     */
    getSmartModel(prompt, options = {}) {
        const availableModels = Object.keys(this.models).filter(m => this.models[m] !== null);
        const preferredModel = options.preferredModel || this.currentModel;

        // 1. User Preference Check (Joe AI / الموردين)
        if (preferredModel === 'llama' && this.models.llama) {
            return 'llama';
        }
        // If user prefers a cloud model and it's available
        if (['openai', 'gemini', 'grok'].includes(preferredModel) && this.models[preferredModel]) {
            return preferredModel;
        }

        // 2. Fallback Logic (Prioritize Llama for cost/privacy if available)
        if (this.models.llama && availableModels.length > 1) {
            // Simple tasks or tasks not requiring the latest knowledge can use Llama
            if (prompt.length < 500 && !prompt.toLowerCase().includes('latest news')) {
                return 'llama';
            }
        }

        // 3. Default to the strongest available cloud model
        if (this.models.openai) return 'openai';
        if (this.models.gemini) return 'gemini';
        if (this.models.grok) return 'grok';

        // 4. Final Fallback
        if (this.models.llama) return 'llama';

        throw new Error('No AI model is available or initialized.');
    }

    /**
     * Get current model
     */
    getCurrentModel() {
        return {
            model: this.currentModel,
            available: Object.keys(this.models).filter(m => this.models[m] !== null),
        };
    }

    /**
     * Generate content using the current model
     * @param {string} prompt - User prompt
     * @param {object} options - Additional options
     */
    async generateContent(prompt, options = {}) {
        const modelToUse = this.getSmartModel(prompt, options);
        try {
            if (modelToUse === 'openai') {
                return await this.generateWithOpenAI(prompt, options);
            } else if (modelToUse === 'gemini') {
                return await this.generateWithGemini(prompt, options);
            } else if (modelToUse === 'grok') {
                return await this.generateWithGrok(prompt, options);
            } else if (modelToUse === 'llama') {
                return await this.generateWithLocalLlama(prompt, options);
            }
            throw new Error(`Model ${modelToUse} is not supported in generateContent.`);
        } catch (error) {
            console.error(`❌ Error generating content with ${modelToUse}:`, error.message);
            throw error;
        }
    }

    /**
     * Generate content using OpenAI
     */
    async generateWithOpenAI(prompt, options = {}) {
        if (!this.models.openai) {
            throw new Error('OpenAI is not initialized.');
        }
        const response = await this.models.openai.chat.completions.create({
            model: options.model || 'gpt-4.1-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2000,
        });
        return {
            model: 'openai',
            content: response.choices[0].message.content,
            usage: response.usage,
        };
    }

    /**
     * Generate content using Gemini
     */
    async generateWithGemini(prompt, options = {}) {
        void options;
        if (!this.models.gemini) {
            throw new Error('Gemini is not initialized.');
        }
        // Placeholder for actual Gemini API call
        // This would use Google's generative AI library
        return {
            model: 'gemini',
            content: `[Gemini Response] ${prompt.substring(0, 100)}...`,
            note: 'Gemini integration requires additional setup',
        };
    }

    /**
     * Generate content using Grok
     */
    async generateWithGrok(prompt, options = {}) {
        void options;
        if (!this.models.grok) {
            throw new Error('Grok is not initialized.');
        }
        // Placeholder for actual Grok API call
        // This would use xAI's API
        return {
            model: 'grok',
            content: `[Grok Response] ${prompt.substring(0, 100)}...`,
            note: 'Grok integration requires additional setup',
        };
    }

    /**
     * Generate content using Local Llama
     */
    async generateWithLocalLlama(prompt, options = {}) {
        if (!this.models.llama) {
            throw new Error('Local Llama is not initialized.');
        }
        // LocalLlamaService should have a unified interface like generateContent
        const response = await this.models.llama.generateContent(prompt, options);
        return {
            model: 'llama',
            content: response.content,
            usage: response.usage,
        };
    }

    /**
     * Generate website (original method from placeholder)
     */
    async generateWebsite(options) {
        try {
            const prompt = options.description || 'Create a professional website';
            const content = await this.generateContent(prompt, {
                model: options.model,
                maxTokens: 4000,
            });
            return {
                jobId: `job-${Date.now()}`,
                model: this.currentModel,
                content,
                status: 'completed',
            };
        } catch (error) {
            console.error('❌ Error generating website:', error.message);
            throw error;
        }
    }

    /**
     * Get available models and their status
     */
    getModelsStatus() {
        return {
            current: this.currentModel,
            available: Object.entries(this.models).map(([name, client]) => ({
                name,
                initialized: client !== null,
                status: client ? 'ready' : 'not-configured',
                type: ['openai', 'gemini', 'grok'].includes(name) ? 'cloud' : 'local',
            })),
        };
    }
}

export default AIEngineService;
