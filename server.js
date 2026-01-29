const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");

const {} = require("./middleware/errorMidsleware")



require("dotenv").config();


dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is Running Successfully");
});





// app.get("/api/chat", (req, res) => {
//   res.send(chats);
// });

// app.get("/api/chat/:id", (req, res) => {
// //   console.log(req.params.id);

//   const singleChat = chats.find((c) => c._id === req.params.id);
//   res.send(singleChat);
// });



app.use("/api/user", userRoutes);

app.user(notFound)
app.user(errorHandler)

  


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server Started on Port ${PORT}`);
});
































































