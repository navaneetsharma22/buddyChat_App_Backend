const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const messageModel = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true, default: "" },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    attachments: { type: [attachmentSchema], default: [] },
    reactions: { type: [reactionSchema], default: [] },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    edited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageModel);

module.exports = Message;
