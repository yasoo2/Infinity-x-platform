// backend/src/lib/websocketManager.mjs - إدارة WebSocket المتقدمة
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.mjs';

export class WebSocketManager {
    constructor(server) {
        this.wss = new WebSocketServer({ server });
        this.clients = new Map();
        this.rooms = new Map();
        this.setupServer();
    }

    setupServer() {
        this.wss.on('connection', (ws, req) => {
            const clientId = uuidv4();
            const client = {
                id: clientId,
                ws,
                userId: null,
                rooms: new Set(),
                metadata: {
                    ip: req.socket.remoteAddress,
                    userAgent: req.headers['user-agent'],
                    connectedAt: new Date()
                }
            };

            this.clients.set(clientId, client);
            
            console.log(`🔌 WebSocket client connected: ${clientId}`);

            this.sendToClient(clientId, {
                type: 'connected',
                clientId,
                timestamp: new Date()
            });

            ws.on('message', async (data) => {
                await this.handleMessage(clientId, data);
            });

            ws.on('close', () => {
                this.handleDisconnect(clientId);
            });

            ws.on('error', (error) => {
                console.error(`❌ WebSocket error for client ${clientId}:`, error);
            });
        });

        console.log('✅ WebSocket server initialized');
    }

    async handleMessage(clientId, data) {
        try {
            const message = JSON.parse(data);
            const client = this.clients.get(clientId);
            
            if (!client) return;

            console.log(`📨 Message from client ${clientId}:`, message.type);

            switch (message.type) {
                case 'authenticate':
                    await this.authenticateClient(clientId, message.token);
                    break;
                case 'join_room':
                    await this.joinRoom(clientId, message.roomId);
                    break;
                case 'leave_room':
                    await this.leaveRoom(clientId, message.roomId);
                    break;
                case 'broadcast':
                    await this.broadcastToRoom(message.roomId, message.data);
                    break;
                case 'task_update':
                    await this.handleTaskUpdate(clientId, message.data);
                    break;
                case 'stream_subscribe':
                    await this.handleStreamSubscribe(clientId, message.streamId);
                    break;
                case 'browser_control':
                    await this.handleBrowserControl(clientId, message.data);
                    break;
                default:
                    console.log(`⚠️ Unknown message type: ${message.type}`);
            }

        } catch (error) {
            console.error('❌ WebSocket message handling error:', error);
            this.sendToClient(clientId, {
                type: 'error',
                message: error.message
            });
        }
    }

    async authenticateClient(clientId, token) {
        try {
            // التحقق من التوكن (سيتم تنفيذه لاحقاً)
            const client = this.clients.get(clientId);
            if (client) {
                client.userId = `user_${token}`; // مؤقت
                client.authenticated = true;
                
                this.sendToClient(clientId, {
                    type: 'authenticated',
                    userId: client.userId,
                    timestamp: new Date()
                });

                console.log(`✅ Client authenticated: ${clientId}`);
            }
        } catch (error) {
            console.error('❌ Client authentication error:', error);
        }
    }

    async joinRoom(clientId, roomId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // إنشاء الغرفة إذا لم تكن موجودة
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }

        const room = this.rooms.get(roomId);
        room.add(clientId);
        client.rooms.add(roomId);

        // إشعار العميل بالانضمام
        this.sendToClient(clientId, {
            type: 'room_joined',
            roomId,
            timestamp: new Date()
        });

        // إشعار الغرفة
        this.broadcastToRoom(roomId, {
            type: 'user_joined',
            userId: client.userId,
            timestamp: new Date()
        }, clientId);

        console.log(`👥 Client ${clientId} joined room: ${roomId}`);
    }

    async leaveRoom(clientId, roomId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const room = this.rooms.get(roomId);
        if (room) {
            room.delete(clientId);
            client.rooms.delete(roomId);

            // إشعار العميل بالمغادرة
            this.sendToClient(clientId, {
                type: 'room_left',
                roomId,
                timestamp: new Date()
            });

            // إشعار الغرفة
            this.broadcastToRoom(roomId, {
                type: 'user_left',
                userId: client.userId,
                timestamp: new Date()
            }, clientId);

            // حذف الغرفة إذا كانت فارغة
            if (room.size === 0) {
                this.rooms.delete(roomId);
            }

            console.log(`👋 Client ${clientId} left room: ${roomId}`);
        }
    }

    broadcastToRoom(roomId, data, excludeClientId = null) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.forEach(clientId => {
            if (clientId !== excludeClientId) {
                this.sendToClient(clientId, data);
            }
        });

        console.log(`📢 Broadcast to room ${roomId}: ${data.type}`);
    }

    sendToClient(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) return;

        try {
            client.ws.send(JSON.stringify(data));
        } catch (error) {
            console.error(`❌ Error sending to client ${clientId}:`, error);
        }
    }

    broadcast(data) {
        this.clients.forEach((client, clientId) => {
            if (client.ws.readyState === WebSocket.OPEN) {
                this.sendToClient(clientId, data);
            }
        });
    }

    async handleTaskUpdate(clientId, data) {
        const { taskId, progress, status, message } = data;
        
        // بث التحديث إلى جميع المشتركين في مهمة Joe
        this.broadcast({
            type: 'task_update',
            taskId,
            progress,
            status,
            message,
            timestamp: new Date()
        });

        // حفظ في قاعدة البيانات
        try {
            const db = getDB();
            await db.collection('joe_task_updates').insertOne({
                taskId,
                progress,
                status,
                message,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('❌ Save task update error:', error);
        }
    }

    async handleStreamSubscribe(clientId, streamId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // إضافة العميل إلى قائمة انتظار البث
        if (!client.streams) {
            client.streams = new Set();
        }
        client.streams.add(streamId);

        // إشعار بالاشتراك
        this.sendToClient(clientId, {
            type: 'stream_subscribed',
            streamId,
            timestamp: new Date()
        });

        console.log(`📺 Client ${clientId} subscribed to stream: ${streamId}`);
    }

    async handleBrowserControl(clientId, data) {
        const { action, sessionId, parameters } = data;
        
        // بث أوامر التحكم في المتصفح
        this.broadcast({
            type: 'browser_control',
            clientId,
            action,
            sessionId,
            parameters,
            timestamp: new Date()
        });

        console.log(`🌐 Browser control: ${action} from client ${clientId}`);
    }

    handleDisconnect(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // إزالة من الغرف
        client.rooms.forEach(roomId => {
            this.leaveRoom(clientId, roomId);
        });

        // حفظ سجل الاتصال
        this.saveConnectionLog(client);

        // حذف العميل
        this.clients.delete(clientId);

        console.log(`🔌 Client disconnected: ${clientId}`);
    }

    async saveConnectionLog(client) {
        try {
            const db = getDB();
            await db.collection('joe_websocket_logs').insertOne({
                clientId: client.id,
                userId: client.userId,
                metadata: client.metadata,
                duration: Date.now() - client.metadata.connectedAt.getTime(),
                rooms: Array.from(client.rooms),
                timestamp: new Date()
            });
        } catch (error) {
            console.error('❌ Save connection log error:', error);
        }
    }

    // أدوات البث المتقدمة
    startLiveStream(streamId, streamData) {
        const stream = {
            id: streamId,
            startTime: new Date(),
            viewers: new Set(),
            data: streamData
        };

        // إشعار المشتركين
        this.broadcast({
            type: 'stream_started',
            streamId,
            data: streamData,
            timestamp: new Date()
        });

        console.log(`🎬 Live stream started: ${streamId}`);
    }

    updateLiveStream(streamId, data) {
        this.broadcast({
            type: 'stream_update',
            streamId,
            data,
            timestamp: new Date()
        });
    }

    stopLiveStream(streamId) {
        this.broadcast({
            type: 'stream_ended',
            streamId,
            timestamp: new Date()
        });

        console.log(`🛑 Live stream stopped: ${streamId}`);
    }

    // أدوات المساعدة
    getConnectedClients() {
        return Array.from(this.clients.keys());
    }

    getRoomMembers(roomId) {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room) : [];
    }

    getClientStats() {
        return {
            totalClients: this.clients.size,
            totalRooms: this.rooms.size,
            authenticatedClients: Array.from(this.clients.values()).filter(c => c.authenticated).length
        };
    }

    // WebSocket للبث الحي
    broadcastFrame(streamId, frameData) {
        const message = {
            type: 'frame',
            streamId,
            frame: frameData,
            timestamp: new Date()
        };

        this.broadcast(message);
    }

    broadcastProgress(taskId, progress, message) {
        const data = {
            type: 'progress',
            taskId,
            progress,
            message,
            timestamp: new Date()
        };

        this.broadcast(data);
    }

    // إدارة حالة النظام
    async getSystemStatus() {
        return {
            websocket: {
                connectedClients: this.clients.size,
                activeRooms: this.rooms.size,
                uptime: process.uptime()
            },
            timestamp: new Date()
        };
    }
}

// مدير البث المتقدم
export class StreamingManager {
    constructor(webSocketManager) {
        this.wsManager = webSocketManager;
        this.activeStreams = new Map();
    }

    createStream(streamId, streamType, metadata = {}) {
        const stream = {
            id: streamId,
            type: streamType,
            startTime: new Date(),
            metadata,
            frames: [],
            status: 'active',
            viewers: new Set()
        };

        this.activeStreams.set(streamId, stream);
        
        // بدء البث
        this.wsManager.startLiveStream(streamId, metadata);
        
        console.log(`🎬 Stream created: ${streamId} (${streamType})`);
        return stream;
    }

    addFrame(streamId, frameData) {
        const stream = this.activeStreams.get(streamId);
        if (!stream) return;

        const frame = {
            timestamp: Date.now(),
            data: frameData,
            type: 'screenshot'
        };

        stream.frames.push(frame);
        
        // بث الإطار
        this.wsManager.broadcastFrame(streamId, frameData);
        
        // حذف الإطارات القديمة (الاحتفاظ بآخر 100)
        if (stream.frames.length > 100) {
            stream.frames.shift();
        }
    }

    addViewer(streamId, clientId) {
        const stream = this.activeStreams.get(streamId);
        if (stream) {
            stream.viewers.add(clientId);
            console.log(`👤 Viewer added to stream ${streamId}: ${clientId}`);
        }
    }

    removeViewer(streamId, clientId) {
        const stream = this.activeStreams.get(streamId);
        if (stream) {
            stream.viewers.delete(clientId);
            console.log(`👋 Viewer removed from stream ${streamId}: ${clientId}`);
        }
    }

    stopStream(streamId) {
        const stream = this.activeStreams.get(streamId);
        if (!stream) return;

        stream.status = 'stopped';
        stream.endTime = new Date();
        
        // إيقاف البث
        this.wsManager.stopLiveStream(streamId);
        
        // حفظ السجل
        this.saveStreamLog(stream);
        
        // حذف من القائمة النشطة
        this.activeStreams.delete(streamId);
        
        console.log(`🛑 Stream stopped: ${streamId}`);
    }

    async saveStreamLog(stream) {
        try {
            const db = getDB();
            await db.collection('joe_stream_logs').insertOne({
                streamId: stream.id,
                type: stream.type,
                startTime: stream.startTime,
                endTime: stream.endTime,
                duration: stream.endTime.getTime() - stream.startTime.getTime(),
                frameCount: stream.frames.length,
                viewerCount: stream.viewers.size,
                metadata: stream.metadata
            });
        } catch (error) {
            console.error('❌ Save stream log error:', error);
        }
    }

    getStreamStats(streamId) {
        const stream = this.activeStreams.get(streamId);
        if (!stream) return null;

        return {
            id: stream.id,
            type: stream.type,
            duration: Date.now() - stream.startTime.getTime(),
            frameCount: stream.frames.length,
            viewerCount: stream.viewers.size,
            status: stream.status
        };
    }

    getAllStreams() {
        return Array.from(this.activeStreams.values()).map(stream => ({
            id: stream.id,
            type: stream.type,
            startTime: stream.startTime,
            viewerCount: stream.viewers.size,
            status: stream.status
        }));
    }
}

export default WebSocketManager;
export { StreamingManager };
