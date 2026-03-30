const express = require("express");
const {
  sendMessage,
  allMessages,
  uploadAttachments,
  updateMessage,
  deleteMessage,
  reactToMessage,
  markChatAsSeen,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.route("/").post(protect, sendMessage);
router.route("/upload").post(protect, upload.array("files", 4), uploadAttachments);
router.route("/seen/:chatId").post(protect, markChatAsSeen);
router.route("/:messageId/reaction").post(protect, reactToMessage);
router.route("/:chatId").get(protect, allMessages);
router.route("/:messageId").put(protect, updateMessage).delete(protect, deleteMessage);

module.exports = router;
