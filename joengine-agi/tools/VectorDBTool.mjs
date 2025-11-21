import { BaseTool } from './ToolsSystem.mjs';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = './joengine-agi/memory/vector_db.json';

class VectorDBTool extends BaseTool {
    constructor() {
        super(
            'vectorDB',
            'Manages a vector database for text embeddings.',
            {
                action: { type: 'string', required: true, description: "The action to perform: 'add' or 'findRelevant'." },
                text: { type: 'string', required: false, description: "The text to add to the database. Required for 'add' action." },
                queryText: { type: 'string', required: false, description: "The text to search for. Required for 'findRelevant' action." },
                metadata: { type: 'object', required: false, description: "Metadata to store with the text." },
                topK: { type: 'number', required: false, description: "The number of relevant results to return." }
            }
        );

        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.db = [];
        this.loadDb();
    }

    async execute(params) {
        const { action, ...rest } = params;
        switch (action) {
            case 'add':
                return this.add(rest.text, rest.metadata);
            case 'findRelevant':
                return this.findRelevant(rest.queryText, rest.topK);
            default:
                return { success: false, error: `Invalid action: ${action}. Must be 'add' or 'findRelevant'.` };
        }
    }

    async loadDb() {
        try {
            const data = await fs.readFile(DB_PATH, 'utf8');
            this.db = JSON.parse(data);
            console.log('[VectorDBTool] Database loaded successfully.');
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('[VectorDBTool] No existing database found. A new one will be created.');
                await this.saveDb();
            } else {
                console.error('[VectorDBTool] Error loading database:', error);
            }
        }
    }

    async saveDb() {
        try {
            await fs.writeFile(DB_PATH, JSON.stringify(this.db, null, 2));
        } catch (error) {
            console.error('[VectorDBTool] Error saving database:', error);
        }
    }

    async getEmbedding(text) {
        try {
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: text,
            });
            return response.data[0].embedding;
        } catch (error) {
            console.error('[VectorDBTool] Error getting embedding:', error);
            return null;
        }
    }

    async add(text, metadata = {}) {
        const embedding = await this.getEmbedding(text);
        if (!embedding) return null;

        const entry = {
            id: uuidv4(),
            text,
            embedding,
            metadata,
            createdAt: new Date(),
        };

        this.db.push(entry);
        await this.saveDb();
        console.log(`[VectorDBTool] Added new entry: ${entry.id}`);
        return entry.id;
    }

    cosineSimilarity(vecA, vecB) {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
        const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magA * magB);
    }

    async findRelevant(queryText, topK = 3) {
        const queryEmbedding = await this.getEmbedding(queryText);
        if (!queryEmbedding) return [];

        const similarities = this.db.map(entry => ({
            id: entry.id,
            text: entry.text,
            metadata: entry.metadata,
            similarity: this.cosineSimilarity(queryEmbedding, entry.embedding),
        }));

        similarities.sort((a, b) => b.similarity - a.similarity);

        return similarities.slice(0, topK);
    }
}

export { VectorDBTool };
