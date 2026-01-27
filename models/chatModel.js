//create schema for chat first 
//what alla thing going to cointain
//chatName
//isGropChat
//users
//LatestMessage
//groupAdmin


const mongoose = require("mongoose");

const chatModel = mongoose.Schema({
    chatName: { type: String , trim: true },
    isGropChat: {type:boolean ,default:false},

    users:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",

    }],

    latestMessage: {
         type: mongoose.Schema.Types.ObjectId,
         ref:"Message",

    },

    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",


    }

    

    
},

{
    timestamps: true,
}

);

const Chat = mongoose.model("Chat", chatModel);

module.export = Chat;
