/**
 * 🧠 KnowledgeIngestionTool - Enables JOE to process and integrate new knowledge from documents.
 * This tool is crucial for continuous learning and maintaining an up-to-date knowledge base.
 */
class KnowledgeIngestionTool {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this._initializeMetadata();
    }

    _initializeMetadata() {
        this.ingestDocument.metadata = {
            name: "ingestDocument",
            description: "Processes a document (PDF, DOCX, TXT, or long Markdown file) to extract key information, summarize its content, and integrate it into the system's knowledge base for future reference.",
            parameters: {
                type: "object",
                properties: {
                    filePath: { type: "string", description: "The absolute path to the document file in the JOE workspace (e.g., /home/joe/report.pdf)." },
                    documentTitle: { type: "string", description: "A concise title for the document being ingested." },
                    summaryGoal: { type: "string", description: "A specific goal for the summary (e.g., 'Extract all technical specifications and security protocols')." }
                },
                required: ["filePath", "documentTitle"]
            }
        };

        this.queryKnowledgeBase.metadata = {
            name: "queryKnowledgeBase",
            description: "Searches the internal knowledge base for information related to a specific topic or query. Use this before resorting to web search for internal or previously learned data.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "The specific question or topic to search for in the knowledge base." }
                },
                required: ["query"]
            }
        };
    }

    async ingestDocument({ filePath, documentTitle, summaryGoal, content: inlineContent }) {
        const { db } = this.dependencies || {}
        if (!db) {
            return { success: false, message: 'Database not available' }
        }
        let content = ''
        if (inlineContent && inlineContent.length > 0) {
            content = String(inlineContent)
        } else if (filePath) {
            const fs = await import('fs/promises')
            try {
                content = await fs.readFile(filePath, 'utf8')
            } catch (e) {
                return { success: false, message: `Failed to read file: ${e.message}` }
            }
        } else {
            return { success: false, message: 'No content or filePath provided' }
        }
        const tokens = this._tokenize(content)
        const vector = this._toVector(tokens)
        const summary = await this._summarize(content, summaryGoal)
        const doc = {
            _id: `doc_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
            title: documentTitle,
            path: filePath,
            summary,
            tokens,
            vector,
            length: content.length,
            createdAt: new Date()
        }
        try {
            const mongo = await db()
            await mongo.collection('knowledge_docs').insertOne(doc)
        } catch (e) {
            return { success: false, message: `DB error: ${e.message}` }
        }
        return { success: true, message: 'Document ingested', id: doc._id, summary }
    }

    async queryKnowledgeBase({ query, limit = 5 }) {
        const { db } = this.dependencies || {}
        if (!db) return { success: false, message: 'Database not available' }
        const qTokens = this._tokenize(String(query || ''))
        const qVector = this._toVector(qTokens)
        try {
            const mongo = await db()
            const docs = await mongo.collection('knowledge_docs').find({}).project({ _id: 1, title: 1, summary: 1, vector: 1, path: 1 }).toArray()
            const scored = docs.map(d => ({ id: d._id, title: d.title, summary: d.summary, path: d.path, score: this._cosine(qVector, d.vector) }))
            scored.sort((a,b) => b.score - a.score)
            return { success: true, query, results: scored.slice(0, limit) }
        } catch (e) {
            return { success: false, message: e.message }
        }
    }

    _tokenize(text) {
        return String(text || '')
          .toLowerCase()
          .replace(/[^a-z0-9_\-\s]+/gi, ' ')
          .split(/\s+/)
          .filter(t => t && t.length > 1)
    }

    _toVector(tokens) {
        const freq = {}
        for (const t of tokens) { freq[t] = (freq[t] || 0) + 1 }
        const vec = Object.entries(freq).map(([term, count]) => ({ term, count }))
        const norm = Math.sqrt(vec.reduce((sum, x) => sum + x.count * x.count, 0)) || 1
        return vec.map(x => ({ term: x.term, weight: x.count / norm }))
    }

    _cosine(a, b) {
        const mapB = new Map(b.map(x => [x.term, x.weight]))
        let dot = 0
        let normA = 0
        let normB = 0
        for (const x of a) {
            dot += (x.weight || 0) * (mapB.get(x.term) || 0)
            normA += (x.weight || 0) * (x.weight || 0)
        }
        for (const y of b) { normB += (y.weight || 0) * (y.weight || 0) }
        const denom = Math.sqrt(normA) * Math.sqrt(normB) || 1
        return dot / denom
    }

    async _summarize(content, goal) {
        try {
            const { localLlamaService } = this.dependencies || {}
            if (localLlamaService?.isReady?.()) {
                const parts = []
                await localLlamaService.stream([
                    { role: 'system', content: 'Summarize the document concisely with bullet points.' },
                    { role: 'user', content: String(goal || 'General summary') + '\n\n' + content.slice(0, 4000) }
                ], (piece) => { parts.push(piece) }, { temperature: 0.2, maxTokens: 512 })
                return parts.join('')
            }
        } catch { /* noop */ }
        const lines = String(content || '').split('\n').map(l => l.trim()).filter(Boolean)
        const top = lines.slice(0, 10)
        return `${goal ? '['+goal+'] ' : ''}${top.join(' ')}`.slice(0, 1000)
    }
}

export default KnowledgeIngestionTool;
