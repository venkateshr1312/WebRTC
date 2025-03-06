const { Server } = require("socket.io");

const io = new Server(8000, {
  cors: true,
});

let onlineUsers = [];

io.on("connection", (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  // When a user connects and sends their profile
  socket.on("user", (data) => {
    console.log("Received Data From Client:", data);

    // Store the online user with their profile and socket ID
    onlineUsers.push({
      userId: `a${Math.floor(Math.random() * 1000) + 100}`, // Generate a random userId
      socketId: socket.id,
      profile: data,
    });

    console.log("Current Online Users:", onlineUsers);

    // Emit the updated user list to all connected clients
    io.emit("getUsers", onlineUsers);

    socket.on("call:incoming", ({ to, message }) => {
      console.log(`Incoming call to user ${to}: ${message}`);
    
      // Find the recipient socketId by userId
      const recipient = onlineUsers.find(user => user.userId === to);
    
      if (recipient) {
        // Check if the recipient's type is "verifier"
        if (recipient.profile.type === "verifier") {
          // Emit the call message to the recipient (push notification)
          io.to(recipient.socketId).emit("call:user", message);
    
          // Send a push notification to the "verifier" user
          io.to(recipient.socketId).emit("push:notification", {
            title: "Incoming Call",
            body: message,
          });
    
          // Listen for the user's response to the call (user:call)
          socket.on("user:call", ({ to, offer }) => {
            console.log(`Received offer from ${socket.id} to ${to}:`, offer);
            // Emit the offer to the recipient
            io.to(to).emit("incoming:call", { from: socket.id, offer });
            io.to(recipient.socketId).emit("incoming:call", { from: socket.id, offer, isVideoCall: true });
            /* console.log("sockk="+io.to(recipient.socketId).emit("incoming:call", { from: socket.id, offer, isVideoCall: true })); */
          });
        } else {
          // If the recipient is not a "verifier", do not send the notification
          socket.emit("call:error", "Recipient is not a verifier.");
        }
      } else {
        // If recipient is not found, send an error message back
        socket.emit("call:error", "User is offline or not found.");
      }
    });

    // Listen for peer negotiation events outside the user:call listener
    socket.on("peer:nego:needed", ({ to, offer }) => {
      console.log("peer:nego:needed", offer);
      const recipient = onlineUsers.find(user => user.userId === to);
      if (recipient) {
        io.to(recipient.socketId).emit("peer:nego:needed", { from: socket.id, offer });
      } else {
        console.log("Recipient not found for peer negotiation.");
      }
    });

    socket.on("peer:nego:done", ({ to, ans }) => {
      console.log("peer:nego:done", ans);
      io.to(to).emit("peer:nego:final", { from: socket.id, ans });
    });

    // Handle offer acceptance
    socket.on("call:accepted", ({ to, ans }) => {
      console.log(`Call accepted response from ${socket.id} to ${to}:`, ans);
      io.to(to).emit("call:accepted", { from: socket.id, ans });
    });

    

    // Clean up when a user disconnects
    socket.on("disconnect", () => {
      console.log(`Socket Disconnected: ${socket.id}`);
      onlineUsers = onlineUsers.filter(user => user.socketId !== socket.id);
      io.emit("getUsers", onlineUsers);  // Broadcast the updated user list
    });
  });
});
