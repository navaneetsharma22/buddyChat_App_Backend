const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();
connectDB();

const app = express();
const clientUrlList = (process.env.CLIENT_URLS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOriginPatterns = [
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
  /^https:\/\/buddy-chat-app-frontend(?:-[a-z0-9-]+)?\.vercel\.app$/,
];
const isAllowedOrigin = (origin = "") =>
  clientUrlList.includes(origin) ||
  allowedOriginPatterns.some((pattern) => pattern.test(origin));
const corsOriginDelegate = (origin, callback) => {
  if (!origin || isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error("Not allowed by CORS"));
};

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  cors({
    origin: corsOriginDelegate,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("API is running successfully");
});

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: corsOriginDelegate,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const onlineUsers = new Set();

io.on("connection", (socket) => {
  socket.on("setup", (userData) => {
    if (!userData?._id) return;

    socket.userId = userData._id;
    socket.join(userData._id);
    onlineUsers.add(userData._id);
    io.emit("online users", Array.from(onlineUsers));
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    if (!room) return;
    socket.join(room);
  });

  socket.on("typing", (room) => {
    if (!room) return;
    socket.volatile.to(room).emit("typing");
  });

  socket.on("stop typing", (room) => {
    if (!room) return;
    socket.volatile.to(room).emit("stop typing");
  });

  socket.on("new message", (newMessageReceived, ack) => {
    const chat = newMessageReceived?.chat;

    if (!chat?.users?.length) return;

    chat.users.forEach((chatUser) => {
      if (chatUser._id === newMessageReceived.sender._id) return;
      socket.to(chatUser._id).emit("message recieved", newMessageReceived);
    });

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("message updated", (updatedMessage) => {
    const chat = updatedMessage?.chat;

    if (!chat?.users?.length) return;

    chat.users.forEach((chatUser) => {
      socket.to(chatUser._id).emit("message updated", updatedMessage);
    });
  });

  socket.on("message deleted", (deletedMessage) => {
    const chat = deletedMessage?.chat;

    if (!chat?.users?.length) return;

    chat.users.forEach((chatUser) => {
      socket.to(chatUser._id).emit("message deleted", deletedMessage);
    });
  });

  socket.on("messages seen", ({ chatId, userId }) => {
    if (!chatId || !userId) return;
    socket.to(chatId).emit("messages seen", { chatId, userId });
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("online users", Array.from(onlineUsers));
    }
  });
});
