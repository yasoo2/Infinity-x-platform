/**
 * 📡 Quantum Tunnel - Real-time Streaming Service
 * @version 1.0.0
 * @description Manages WebSocket connections and acts as the bridge between the backend event bus
 * and the connected clients. It listens to specific events and relays them in real-time.
 */

import { WebSocketServer } from 'ws';
import eventBus from '../core/event-bus.mjs';

class RealtimeService {
    constructor(server) {
        if (!server) {
            throw new Error('HTTP Server instance is required to initialize RealtimeService.');
        }
        this.wss = new WebSocketServer({ server, path: '/ws/quantum-tunnel' });
        this.clients = new Map(); // Use a map to associate connections with session IDs
        this.initialize();
    }

    initialize() {
        this.wss.on('connection', (ws, req) => {
            // For now, we'll use a simple query parameter for session ID.
            // In a production system, you might use a more secure token.
            const url = new URL(req.url, `http://${req.headers.host}`);
            const sessionId = url.searchParams.get('sessionId');

            if (!sessionId) {
                console.error("[RealtimeService] Connection attempt without a session ID. Closing connection.");
                ws.close(1008, "Session ID is required.");
                return;
            }

            console.log(`[RealtimeService] Client connected for session: ${sessionId}`);
            this.clients.set(sessionId, ws);

            ws.on('close', () => {
                console.log(`[RealtimeService] Client disconnected for session: ${sessionId}`);
                this.clients.delete(sessionId);
            });

            ws.on('error', (error) => {
                console.error(`[RealtimeService] WebSocket error for session ${sessionId}:`, error);
                this.clients.delete(sessionId);
            });

            ws.send(JSON.stringify({ type: 'system:connected', message: 'Quantum Tunnel established.' }));
        });

        // Listen to events from the central bus and relay them
        this.listenForEvents();

        console.log('📡 Real-time Service (Quantum Tunnel) initialized.');
    }

    listenForEvents() {
        eventBus.on('sandbox:data', ({ sessionId, data }) => {
            this.send(sessionId, { type: 'sandbox:output', payload: data });
        });

        eventBus.on('sandbox:error', ({ sessionId, error }) => {
            this.send(sessionId, { type: 'sandbox:error', payload: error });
        });

        eventBus.on('sandbox:exit', ({ sessionId, code }) => {
            this.send(sessionId, { type: 'sandbox:exit', payload: { code } });
        });
    }

    send(sessionId, message) {
        const client = this.clients.get(sessionId);
        if (client && client.readyState === client.OPEN) {
            try {
                client.send(JSON.stringify(message));
            } catch (error) {
                console.error(`[RealtimeService] Failed to send message to session ${sessionId}:`, error);
            }
        }
    }

    broadcast(message) {
        this.clients.forEach((client, sessionId) => {
            this.send(sessionId, message);
        });
    }
}

export default RealtimeService;
