import { MongoClient, ObjectId } from 'mongodb';

// A cleaner, refactored version to avoid potential parser issues.
async function generateProject({ description, projectType = 'auto-detect', title, options = {} }) {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        console.error("[ProjectFactory] MONGO_URI is not configured.");
        return { success: false, error: "DATABASE_NOT_CONFIGURED" };
    }

    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'joe_db');
        
        const job = {
            _id: new ObjectId(),
            status: 'QUEUED',
            type: projectType,
            title: title || "Untitled AI Project",
            description,
            command: description, // Fallback for the worker
            ...options,
            priority: options.priority || 1,
            attempts: 0,
            createdAt: new Date(),
        };

        const result = await db.collection('jobs').insertOne(job);
        
        return {
            success: true,
            message: `Project "${title}" has been successfully queued.`,
            jobId: result.insertedId.toString(),
            status: 'QUEUED',
        };
    } catch (error) {
        console.error(`[ProjectFactory] Error queuing job: ${error.message}`);
        return {
            success: false,
            error: "JOB_QUEUE_FAILED",
            message: `Failed to queue the job: ${error.message}`
        };
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}

// Metadata remains the same for the ToolManager
generateProject.metadata = {
    name: "generateProject",
    description: "Queues a task for an AI worker to generate a complete software project based on a detailed description.",
    parameters: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "The official title of the project (e.g., 'My Personal Portfolio')."
            },
            description: {
                type: "string",
                description: "A detailed description of the project, including purpose, features, and desired technologies."
            },
            projectType: {
                type: "string",
                description: "The specific type of project to generate.",
                enum: ["website", "webapp", "ecommerce", "cli-tool", "discord-bot", "auto-detect"]
            },
            options: {
                type: "object",
                description: "Optional advanced parameters, like deployment targets or specific features."
            }
        },
        required: ["title", "description"]
    }
};

export default { generateProject };
