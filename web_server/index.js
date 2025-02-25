const { Server } = require("socket.io");

const io = new Server(8000, {
  cors: true,
});

let onlineUsers = [];

io.on("connection", (socket) => {
  console.log(`Socket Connected: ${socket.id}`);
  socket.on("user", (data) => {
    console.log("Received Data From Client:", data);
   
    onlineUsers.push({
      userId: `a${Math.floor(Math.random() * 1000) + 100}`,
      socketId: socket.id,
      profile: data,
    });

    console.log(onlineUsers);

   
    io.emit("getUsers", onlineUsers);

    socket.on("call:request", (data) => {
      console.log("hi",data)

      
    })
  });

  
  socket.on('disconnect', () => {
    console.log(`Socket Disconnected: ${socket.id}`);
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);

    io.emit('getUsers', onlineUsers);
  });
});

