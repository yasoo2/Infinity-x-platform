/**
 * 👥 Real-time Collaboration System
 * Real-time collaboration between developers + AI
 */

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import OpenAI from 'openai';
import { getDB } from '../services/db.mjs'; // Assuming db service
import { shouldUseRedis } from '../utils/upstashRedis.mjs';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

class RealTimeCollaborationSystem {
  constructor() {
    this.io = null;
    this.rooms = new Map();
    this.users = new Map();
  }

  async initialize(httpServer) {
    const defaultWhitelist = [
      'https://xelitesolutions.com',
      'https://www.xelitesolutions.com',
      'https://api.xelitesolutions.com',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4000',
      'http://localhost:4001',
      'http://localhost:4002'
    ];
    const envOrigins = process.env.CORS_ORIGINS ? String(process.env.CORS_ORIGINS).split(',').map(s => s.trim()) : [];
    const whitelist = [...new Set([...defaultWhitelist, ...envOrigins])];

    this.io = new Server(httpServer, {
      path: '/socket.io/',
      cors: { origin: whitelist, credentials: true },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 60000,
      allowEIO3: true,
      maxHttpBufferSize: 10e6
    });

    const wantsRedis = shouldUseRedis();
    if (wantsRedis && process.env.REDIS_URL) {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      try {
        await Promise.all([pubClient.connect(), subClient.connect()]);
        this.io.adapter(createAdapter(pubClient, subClient));
        console.log('✅ Socket.IO Redis Adapter connected.');
      } catch (error) {
        console.warn('⚠️ Could not connect Socket.IO to Redis. Falling back to in-memory adapter.', error.message);
      }
    } else {
      console.log('ℹ️ Redis disabled or not configured. Using in-memory Socket.IO adapter.');
    }

    this.setupEventHandlers();
    console.log('✅ Real-time Collaboration System initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      socket.on('join_room', async (data) => this.handleJoinRoom(socket, data));
      socket.on('code_change', async (data) => this.handleCodeChange(socket, data));
      socket.on('cursor_move', (data) => this.handleCursorMove(socket, data));
      socket.on('ai_assist', async (data) => this.handleAIAssist(socket, data));
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  async handleJoinRoom(socket, data) {
    const { roomId, userId, username } = data;
    if (!this.rooms.has(roomId)) {
        const db = await getDB();
        const roomData = await db.collection('collab_rooms').findOne({_id: roomId}) || { code: '// Welcome to the session!', language: 'javascript', history: [] };
        this.rooms.set(roomId, {
            id: roomId,
            users: new Map(),
            code: roomData.code,
            language: roomData.language,
            history: roomData.history,
        });
    }

    const room = this.rooms.get(roomId);
    const user = { id: userId, socketId: socket.id, username, color: this.generateUserColor(userId) };
    room.users.set(userId, user);
    this.users.set(socket.id, { userId, roomId });

    socket.join(roomId);
    socket.emit('room_state', { code: room.code, language: room.language, users: Array.from(room.users.values()) });
    socket.to(roomId).emit('user_joined', user);
    console.log(`${username} joined room ${roomId}`);
  }

  async handleCodeChange(socket, data) {
    const userInfo = this.users.get(socket.id);
    if (!userInfo) return;
    const { roomId, userId } = userInfo;
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.code = data.code;
    const change = { userId, changes: data.changes, timestamp: Date.now() };
    room.history.push(change);

    socket.to(roomId).emit('code_update', { userId, changes: data.changes });
    
    // Save to DB periodically, not on every change
    if (room.history.length % 10 === 0) { 
        const db = await getDB();
        await db.collection('collab_rooms').updateOne({_id: roomId}, {$set: {code: room.code, history: room.history}}, {upsert: true});
    }
  }
  
  handleCursorMove(socket, data) {
    const userInfo = this.users.get(socket.id);
    if (!userInfo) return;
    socket.to(userInfo.roomId).emit('cursor_update', { userId: userInfo.userId, cursor: data.cursor });
  }

  async handleAIAssist(socket, data) {
      const userInfo = this.users.get(socket.id);
      if (!userInfo) return;
      const room = this.rooms.get(userInfo.roomId);
      if (!room) return;

      const prompt = `You are a pair programming assistant. Based on the current code and the user request, provide a helpful response, suggestion, or code block.\n\nCurrent Code:\n${room.code}\n\nUser Request: ${data.request}`;
      if (!openai) {
          this.io.to(userInfo.roomId).emit('ai_response', { response: 'AI assistance is disabled.' });
          return;
      }
      const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: 'You are a helpful pair programming assistant.' }, { role: 'user', content: prompt }]
      });
      const aiResponse = response.choices[0].message.content;
      this.io.to(userInfo.roomId).emit('ai_response', { response: aiResponse });
  }

  handleDisconnect(socket) {
    const userInfo = this.users.get(socket.id);
    if (!userInfo) return;
    const { roomId, userId } = userInfo;
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(userId);
      socket.to(roomId).emit('user_left', { userId });
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
        console.log(`Room ${roomId} closed.`);
      }
    }
    this.users.delete(socket.id);
    console.log(`User ${userId} disconnected.`);
  }

  generateUserColor(userId) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    const hash = userId.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return colors[Math.abs(hash) % colors.length];
  }

  async createRoom(roomId) {
    if (this.rooms.has(roomId)) {
        return { success: false, message: 'Room already exists.' };
    }
    const db = await getDB();
    await db.collection('collab_rooms').insertOne({ _id: roomId, code: '// New session started by JOE', language: 'javascript', history: [], createdAt: new Date() });
    return { success: true, roomId };
  }

  getRoomInfo(roomId) {
      const room = this.rooms.get(roomId);
      if (!room) return null;
      return { id: room.id, users: Array.from(room.users.values()), codeLength: room.code.length };
  }

  getStats() {
      return { totalRooms: this.rooms.size, totalUsers: this.users.size };
  }
}

export const collaborationSystem = new RealTimeCollaborationSystem();
