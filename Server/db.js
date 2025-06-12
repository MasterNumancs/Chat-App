const mongoose = require('mongoose');

function connection() {
    const mongoURI = "mongodb://127.0.0.1:27017/Chats";
    mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => console.log("Server is connected to Database"))
    .catch((err) => console.error("DB connection error:", err));
}

module.exports = connection;
