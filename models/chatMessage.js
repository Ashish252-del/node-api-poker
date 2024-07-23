const mongoose = require("mongoose");
const chatSchema = new mongoose.Schema({
   userId: {
      type: Number,
      required: true,
   },
   tableId: {
      type: Number,
      required: true,
   },
   roundId: {
      type: Number,
      required: true,
   },
   message: {
      type: String,
   },
}, {timestamps: true});

module.exports = mongoose.model("chatMessage", chatSchema);