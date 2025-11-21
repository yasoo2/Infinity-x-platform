import { BaseTool } from './ToolsSystem.mjs';
import { MongoClient } from 'mongodb';
import { Client } from 'pg';

/**
 * DatabaseTool - A versatile tool for managing different database systems.
 * Supports: MongoDB, PostgreSQL
 */
class DatabaseTool extends BaseTool {
    constructor() {
        super(
            'database',
            'Manages connections and queries for MongoDB and PostgreSQL databases.',
            {
                action: { type: 'string', required: true, description: "The action to perform: 'connect', 'query', 'close'" },
                connectionType: { type: 'string', required: false, description: "Database type: 'mongodb' or 'postgres'. Required for 'connect' action." },
                connectionString: { type: 'string', required: false, description: "Database connection string. Required for 'connect' action." },
                connectionId: { type: 'string', required: false, description: "The connection ID to use. Required for 'query' and 'close' actions." },
                query: { type: 'string', required: false, description: "The query to execute. For MongoDB, this is the collection name. Required for 'query' action." },
                queryParams: { type: 'object', required: false, description: "Query parameters. For MongoDB, this is the filter." },
                operation: { type: 'string', required: false, description: "MongoDB operation (e.g., 'find', 'insertOne'). Defaults to 'find'." }
            }
        );

        this.clients = {}; // Store active clients { connectionId: client }
        this.connections = {}; // Store connection details { connectionId: { type, client } }
    }

    async execute(params) {
        const { action, ...rest } = params;

        switch (action) {
            case 'connect':
                return this.connect(rest);
            case 'query':
                return this.query(rest);
            case 'close':
                return this.close(rest);
            default:
                return { success: false, error: `Invalid action: ${action}. Must be 'connect', 'query', or 'close'.` };
        }
    }

    /**
     * Connects to a database.
     */
    async connect({ type, connectionString }) {
        console.log(`[DatabaseTool] Attempting to connect to ${type}...`);
        const connectionId = `conn_${Date.now()}`;

        try {
            let client;
            if (type === 'mongodb') {
                client = new MongoClient(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
                await client.connect();
                console.log('[DatabaseTool] MongoDB connected successfully.');
            } else if (type === 'postgres') {
                client = new Client({ connectionString });
                await client.connect();
                console.log('[DatabaseTool] PostgreSQL connected successfully.');
            } else {
                throw new Error(`Unsupported database type: ${type}`);
            }

            this.clients[connectionId] = client;
            this.connections[connectionId] = { type, client };
            return { success: true, connectionId, message: `Connected to ${type} successfully.` };
        } catch (error) {
            console.error(`[DatabaseTool] Connection error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Executes a query against a connected database.
     */
    async query({ connectionId, query, queryParams = {}, operation = 'find' }) {
        console.log(`[DatabaseTool] Executing query on ${connectionId}...`);
        const connection = this.connections[connectionId];

        if (!connection) {
            return { success: false, error: `Connection ${connectionId} not found.` };
        }

        const { type, client } = connection;

        try {
            let data;
            if (type === 'mongodb') {
                const db = client.db();
                const collection = db.collection(query);
                data = await collection[operation](queryParams).toArray();
            } else if (type === 'postgres') {
                const result = await client.query(query, Object.values(queryParams));
                data = result.rows;
            }
            return { success: true, data };
        } catch (error) {
            console.error(`[DatabaseTool] Query error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Closes a database connection.
     */
    async close({ connectionId }) {
        console.log(`[DatabaseTool] Closing connection ${connectionId}...`);
        const connection = this.connections[connectionId];

        if (!connection) {
            return { success: false, error: `Connection ${connectionId} not found.` };
        }

        try {
            await connection.client.close();
            delete this.clients[connectionId];
            delete this.connections[connectionId];
            return { success: true, message: `Connection ${connectionId} closed.` };
        } catch (error) {
            console.error(`[DatabaseTool] Error closing connection: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

export default DatabaseTool;
