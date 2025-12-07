import mongoose from 'mongoose'

const chatSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.Mixed, required: true },
  title: { type: String, required: true },
  pinned: { type: Boolean, default: false },
  lastModified: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

chatSessionSchema.index({ userId: 1, updatedAt: -1 })
chatSessionSchema.index({ userId: 1, lastModified: -1 })

const ChatSession = mongoose.model('ChatSession', chatSessionSchema)

export default ChatSession
