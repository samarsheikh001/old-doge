const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
// const cors = require("cors");
const ytdl = require("ytdl-core"); 

const app = express();

const fetch = async(videoId) => {
    const a = await ytdl.getInfo(videoId);
    // console.log(a["videoDetails"]);
    return a["formats"]["0"];
};

// fetch('_DwmKtbVFJ4');
// _DwmKtbVFJ4

// app.use(cors());

const port = process.env.PORT || 3000;

const server = http.createServer(app);
const io = socketio(server);

const publicDirectoryPath = path.join(__dirname, "/public");


io.on("connection", (socket) => {
    console.log("socket joined");

    socket.on("set client video", ({ videoUrl, position, roomName }) => {
        io.to(roomName).emit("set client video", { videoUrl, position, roomName });
    });
    socket.on("control events", ({ event, roomName }) =>
        socket.broadcast.to(roomName).emit("control events", event)
    );
    socket.on("sync position", ({ roomName, position }) => socket.broadcast.to(roomName).emit("sync position", position));
    socket.on("create or join", (roomName) => {
        socket.join(roomName);
        const clientsInRoom = io.sockets.adapter.rooms.get(roomName);
        var numClients = clientsInRoom ? clientsInRoom.size : 0;
        if (numClients === 1) socket.emit("is Host");
        else io.to(roomName).emit("client joined");
    });

    socket.on("chat message", ({ userName, roomName, message, randomColor }) =>
        socket.broadcast.to(roomName).emit("chat message", { userName, message, userColor: randomColor }))
    socket.on('disconnect', () => console.log("disconnected"))
});

// setInterval(() => {
//     console.log(io.sockets.adapter.rooms);
// }, 1000);

app.use(express.static(publicDirectoryPath));
app.get("/", (req, res) => {
    res.render(publicDirectoryPath + "index.html");
});

app.use("/watch/:id", async(req, res) => {
    const link = await fetch(req.params.id);
    res.send({ link: link.url });
});

app.use("/json", (req, res) => res.send({ name: "Samar" }));

server.listen(port, () => console.log("Listening on port", port));