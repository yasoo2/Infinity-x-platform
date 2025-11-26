/**
 * System Interaction Tool
 * Provides tools for secure interaction with external systems (e.g., servers, databases).
 */
import { Client } from 'ssh2';
import { MongoClient } from 'mongodb';

class SystemInteractionTool {
    constructor(dependencies) {
        this.dependencies = dependencies;
    }

    /**
     * @metadata
     * @description Executes a shell command on a remote server via SSH.
     * @parameters {
     *   "type": "object",
     *   "properties": {
     *     "host": { "type": "string", "description": "The hostname or IP address of the remote server." },
     *     "username": { "type": "string", "description": "The SSH username." },
     *     "privateKey": { "type": "string", "description": "The private key content for authentication." },
     *     "command": { "type": "string", "description": "The shell command to execute." }
     *   },
     *   "required": ["host", "username", "privateKey", "command"]
     * }
     */
    async executeRemoteCommand({ host, username, privateKey, command }) {
        return new Promise((resolve) => {
            const conn = new Client();
            let output = '';
            conn.on('ready', () => {
                conn.exec(command, (err, stream) => {
                    if (err) {
                        conn.end();
                        return resolve({ success: false, message: `SSH execution error: ${err.message}` });
                    }
                    stream.on('close', (code, signal) => {
                        conn.end();
                        resolve({ success: true, output: output.trim(), exitCode: code });
                    }).on('data', (data) => {
                        output += data;
                    }).stderr.on('data', (data) => {
                        output += data;
                    });
                });
            }).on('error', (err) => {
                resolve({ success: false, message: `SSH connection error: ${err.message}` });
            }).connect({ host, port: 22, username, privateKey });
        });
    }

    /**
     * @metadata
     * @description Executes a MongoDB query (find) on a remote database.
     * @parameters {
     *   "type": "object",
     *   "properties": {
     *     "uri": { "type": "string", "description": "The MongoDB connection URI." },
     *     "dbName": { "type": "string", "description": "The name of the database." },
     *     "collectionName": { "type": "string", "description": "The name of the collection." },
     *     "query": { "type": "object", "description": "The MongoDB query object (e.g., { status: 'active' })." }
     *   },
     *   "required": ["uri", "dbName", "collectionName", "query"]
     * }
     */
    async queryMongoDB({ uri, dbName, collectionName, query }) {
        let client;
        try {
            client = new MongoClient(uri);
            await client.connect();
            const db = client.db(dbName);
            const collection = db.collection(collectionName);
            const results = await collection.find(query).toArray();
            return { success: true, results };
        } catch (error) {
            return { success: false, message: `MongoDB query failed: ${error.message}` };
        } finally {
            if (client) {
                await client.close();
            }
        }
    }
}

SystemInteractionTool.prototype.executeRemoteCommand.metadata = {
    name: "executeRemoteCommand",
    description: "Executes a shell command on a remote server via SSH. Requires host, username, private key, and the command.",
    parameters: {
        type: "object",
        properties: {
            host: { type: "string", description: "The hostname or IP address of the remote server." },
            username: { type: "string", description: "The SSH username." },
            privateKey: { type: "string", description: "The private key content for authentication." },
            command: { type: "string", description: "The shell command to execute." }
        },
        required: ["host", "username", "privateKey", "command"]
    }
};

SystemInteractionTool.prototype.queryMongoDB.metadata = {
    name: "queryRemoteMongoDB",
    description: "Executes a MongoDB find query on a remote database. Requires connection URI, database name, collection name, and the query object.",
    parameters: {
        type: "object",
        properties: {
            uri: { type: "string", description: "The MongoDB connection URI." },
            dbName: { type: "string", description: "The name of the database." },
            collectionName: { type: "string", description: "The name of the collection." },
            query: { type: "object", description: "The MongoDB query object (e.g., { status: 'active' })." }
        },
        required: ["uri", "dbName", "collectionName", "query"]
    }
};

export default SystemInteractionTool;
