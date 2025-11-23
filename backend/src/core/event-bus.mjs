/**
 * 🚌 The Central Event Bus
 * @version 1.0.0
 * @description A simple, powerful, and centralized event emitter for the entire backend application.
 * It allows for decoupled communication between different services.
 * For example, the SandboxManager can emit an event without knowing that the RealtimeService is listening.
 */

import { EventEmitter } from 'events';

// Create a single, shared instance of the event emitter.
// This acts as the central bus for all application events.
const eventBus = new EventEmitter();

// Increase the listener limit to support more decoupled services
eventBus.setMaxListeners(50);

console.log('🚌 Event Bus initialized.');

export default eventBus;
