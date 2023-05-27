import { serve, type ConnInfo, type Handler } from "https://deno.land/std@0.166.0/http/server.ts";
import { Server } from "https://deno.land/x/socket_io@0.2.0/mod.ts";

let ip_room: string;

function assertIsNetAddr (addr: Deno.Addr): asserts addr is Deno.NetAddr {
  if (!['tcp', 'udp'].includes(addr.transport)) {
    throw new Error('Not a network address');
  }
}

function getRemoteAddress (connInfo: ConnInfo): Deno.NetAddr {
  assertIsNetAddr(connInfo.remoteAddr);
  return connInfo.remoteAddr;
}

const handler: Handler = (request: Request, connInfo: ConnInfo) => {
  const {hostname, port} = getRemoteAddress(connInfo);
  const message = `You connected from the following address: ${hostname}`;
  ip_room = hostname;
  return new Response(message);
};

const io = new Server({
  cors: {
    origin: "*" /* had to google it */,
  },
});


io.on("connection", (socket: any) => {
  //const ip_room = requestIp.getClientIp(socket.request.);

  socket.join(ip_room);

  let room_obj = io.sockets.adapter.rooms.get(ip_room); // list of all the clients

  io.to(ip_room).emit("room-size", room_obj.size); /* googled this too */

  io.to(socket.id).emit("room-members", [
    ...room_obj,
  ]); /* should be manually seralized */

  io.to(ip_room).emit("new-room-member", socket.id);

  socket.on("transfer-offer", (from: string, to: string, data: any) => {
    //console.log(from, to, "offer");
    io.to(to).emit("receive-offer", from, data);
  });

  socket.on("transfer-answer", (from: string, to: string, data: any) => {
    //console.log(from, to, "answer");
    io.to(to).emit("receive-answer", from, data);
  });

  socket.on("transfer-ice", (from: string, to: string, data: any) => {
    //console.log(from, to, "ice");
    io.to(to).emit("receive-ice", from, data);
  });

  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected!`);
    let room_obj = io.sockets.adapter.rooms.get(ip_room);
    if (room_obj) {
      io.to(ip_room).emit("room-size", room_obj.size);
      io.to(ip_room).emit("remove-room-member", socket.id);
    }
  });
});


await serve(handler, io.handler(), {
  port: 3000,
});