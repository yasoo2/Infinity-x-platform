import mongoose from 'mongoose'

const chatMessageSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true },
  userId: { type: mongoose.Schema.Types.Mixed, required: true },
  type: { type: String, enum: ['user', 'joe'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

chatMessageSchema.index({ sessionId: 1, createdAt: 1 })
chatMessageSchema.index({ sessionId: 1, updatedAt: 1 })

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)

export default ChatMessage
