const express = require('express');
const http = require('http');
const { Server } = require('socket.io');  
const connectDB = require('./db.js');
const Chat = require('./Models/Chat.js');

const app = express();
app.use(express.json());

connectDB();

const server = http.createServer(app);
const io = new Server(server, { 
    cors: {
        origin: "*"
    }
});

io.on("connection", (socket) => {
    console.log("Client connected");

    const loadMessages = async () => {
        try {
            const messages = await Chat.find().sort({ timestamp: 1 }).exec();
            socket.emit('chat', messages);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    loadMessages();

    socket.on('newMessage', async (msg) => {
        try {
            const newMessage = new Chat(msg);
            await newMessage.save();
             // emit the saved message
            io.emit('message', newMessage);
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    socket.on("disconnect", () => {  
        console.log("Client disconnected");
    });
});

server.listen(3001, () => { 
    console.log("Server running on port 3001");
});
