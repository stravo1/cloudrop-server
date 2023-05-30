const express = require("express");
const { createServer } = require("http");
const path = require("path");
const { Server } = require("socket.io");
const requestIp = require("request-ip");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*" /* had to google it */,
  },
});

// io.of("/").adapter.on("create-room", (room) => {
//   console.log(`room ${room} was created`);
// });

// io.of("/").adapter.on("join-room", (room, id) => {
//   console.log(`socket ${id} has joined room ${room}`);
// });

// io.of("/").adapter.on("leave-room", (room, id) => {
//   console.log(`socket ${id} has left room ${room}`);
// });

// io.of("/").adapter.on("delete-room", (room) => {
//   console.log(`room ${room} was deleted!`);
// });

io.on("connection", (socket) => {
  const ip_room = requestIp.getClientIp(socket.request);

  socket.join(ip_room);

  let room_obj = io.sockets.adapter.rooms.get(ip_room); // list of all the clients

  io.to(ip_room).emit("room-size", room_obj.size); /* googled this too */

  io.to(socket.id).emit("room-members", [
    ...room_obj,
  ]); /* should be manually seralized */

  io.to(ip_room).emit("new-room-member", socket.id);

  socket.on("transfer-offer", (from, to, data) => {
    //console.log(from, to, "offer");
    io.to(to).emit("receive-offer", from, data);
  });

  socket.on("transfer-answer", (from, to, data) => {
    //console.log(from, to, "answer");
    io.to(to).emit("receive-answer", from, data);
  });

  socket.on("transfer-ice", (from, to, data) => {
    //console.log(from, to, "ice");
    io.to(to).emit("receive-ice", from, data);
  });

  socket.on("disconnect", () => {
    let room_obj = io.sockets.adapter.rooms.get(ip_room);
    if (room_obj) {
      io.to(ip_room).emit("room-size", room_obj.size);
      io.to(ip_room).emit("remove-room-member", socket.id);
    }
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

httpServer.listen(8080);
