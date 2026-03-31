const path = require("path");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

const populateMessage = async (messageId) => {
  let message = await Message.findById(messageId)
    .populate("sender", "name pic email")
    .populate("chat")
    .populate("replyTo");

  if (!message) {
    return null;
  }

  message = await User.populate(message, {
    path: "chat.users replyTo.sender reactions.user readBy deliveredTo deletedBy",
    select: "name pic email",
  });

  return message;
};

const parseAttachments = (attachments) => {
  if (!attachments) {
    return [];
  }

  if (typeof attachments === "string") {
    try {
      return JSON.parse(attachments);
    } catch {
      return [];
    }
  }

  return Array.isArray(attachments) ? attachments : [];
};

const getOtherUserIds = (chat, currentUserId) =>
  (chat?.users || [])
    .map((user) => String(user._id || user))
    .filter((userId) => userId !== String(currentUserId));

const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId, replyTo } = req.body;
  const parsedAttachments = parseAttachments(req.body.attachments);

  if (!chatId || (!content?.trim() && parsedAttachments.length === 0)) {
    return res.status(400).json({ message: "Message content or attachment is required" });
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    return res.status(404).json({ message: "Chat not found" });
  }

  const newMessage = await Message.create({
    sender: req.user._id,
    content: content?.trim() || "",
    chat: chatId,
    attachments: parsedAttachments,
    replyTo: replyTo || null,
    readBy: [req.user._id],
    deliveredTo: getOtherUserIds(chat, req.user._id),
  });

  const message = await populateMessage(newMessage._id);

  await Chat.findByIdAndUpdate(chatId, {
    latestMessage: newMessage._id,
  });

  res.json(message);
});

const allMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  await Message.updateMany(
    { chat: chatId },
    {
      $addToSet: {
        deliveredTo: req.user._id,
        readBy: req.user._id,
      },
    }
  );

  const messages = await Message.find({ chat: chatId })
    .populate("sender", "name pic email")
    .populate("chat")
    .populate("replyTo");

  const populatedMessages = await User.populate(messages, {
    path: "replyTo.sender reactions.user readBy deliveredTo deletedBy",
    select: "name pic email",
  });

  res.json(populatedMessages);
});

const uploadAttachments = asyncHandler(async (req, res) => {
  const files = req.files || [];

  const attachments = files.map((file) => ({
    url: `/uploads/${path.basename(file.path)}`,
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }));

  res.json(attachments);
});

const updateMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  const message = await Message.findById(messageId).populate("chat");

  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  if (String(message.sender) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized to edit this message" });
  }

  if (!content?.trim()) {
    return res.status(400).json({ message: "Updated message cannot be empty" });
  }

  message.content = content.trim();
  message.edited = true;
  message.editedAt = new Date();
  await message.save();

  const populatedMessage = await populateMessage(message._id);
  res.json(populatedMessage);
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  if (String(message.sender) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized to delete this message" });
  }

  message.content = "This message was deleted";
  message.attachments = [];
  message.deletedAt = new Date();
  message.deletedBy = req.user._id;
  await message.save();

  const populatedMessage = await populateMessage(message._id);
  res.json(populatedMessage);
});

const reactToMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const emoji = req.body.emoji?.trim();

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return res.status(400).json({ message: "Invalid message id" });
  }

  if (!emoji) {
    return res.status(400).json({ message: "Emoji is required" });
  }

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  if (!Array.isArray(message.reactions)) {
    message.reactions = [];
  }

  const existingReactionIndex = message.reactions.findIndex(
    (reaction) => String(reaction.user) === String(req.user._id)
  );

  if (existingReactionIndex >= 0) {
    if (message.reactions[existingReactionIndex].emoji === emoji) {
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      message.reactions[existingReactionIndex].emoji = emoji;
    }
  } else {
    message.reactions.push({
      user: req.user._id,
      emoji,
    });
  }

  await message.save();

  const populatedMessage = await populateMessage(message._id);
  res.json(populatedMessage);
});

const markChatAsSeen = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  await Message.updateMany(
    {
      chat: chatId,
      $or: [
        { readBy: { $ne: req.user._id } },
        { deliveredTo: { $ne: req.user._id } },
      ],
    },
    {
      $addToSet: {
        readBy: req.user._id,
        deliveredTo: req.user._id,
      },
    }
  );

  const latestMessages = await Message.find({ chat: chatId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("sender", "name pic email")
    .populate("chat")
    .populate("replyTo");

  const populatedMessages = await User.populate(latestMessages, {
    path: "replyTo.sender reactions.user readBy deliveredTo deletedBy",
    select: "name pic email",
  });

  res.json(populatedMessages);
});

module.exports = {
  sendMessage,
  allMessages,
  uploadAttachments,
  updateMessage,
  deleteMessage,
  reactToMessage,
  markChatAsSeen,
};
