const { Server } = require("socket.io");
const io = new Server(8000, {
    cors: true,
});
let onlineUsers = [];

io.on("connection", (socket) => {
    console.log("Connected");

    socket.on("message", (message) => {
        console.log("message====?", message);
        socket.broadcast.emit("message", message);
    });

    socket.on("requestcall", (to) => {
        console.log("message====?", to);
        //Object.values(connectedSockets).forEach((s) => s.emit("requestcall", to));
        //socket.broadcast.emit("requestcall", to);
    });

    socket.on("register", (data) => {
        console.log("request from => ", data);
        const newUser = {
            userId: `a${Math.floor(Math.random() * 1000) + 100}`, // Generate a random userId
            socketId: socket.id,
            profile: data,
        }

        const index = onlineUsers.findIndex((user) => user.profile.type === newUser.profile.type
            /*&& user.profile.phoneNo === newUser.profile.phoneNo*/);
        if (index !== -1) {
            onlineUsers[index] = newUser;
        } else {
            onlineUsers.push(newUser);
        }
        
        try {
            console.log("===>" + data.type );
            if (data.type === "user") {
                const verifier = onlineUsers.find((user) => user.profile.type === "verifier");
                console.log("verifier===>" + JSON.stringify(verifier));
                if (verifier) {
                    io.to(verifier.socketId).emit("registeruser", socket.id);
                    io.to(socket.id).emit("registeruser", verifier.socketId);
                } 
            } else if (data.type === "verifier") {
                const user = onlineUsers.find((user) => user.profile.type === "user");
                console.log("user===>" + JSON.stringify(user));
                if (user) {
                    io.to(user.socketId).emit("registeruser", socket.id);
                    io.to(socket.id).emit("registeruser", user.socketId);
                } 
            }
        } catch (error) {
            console.log("===>" + error);
        }
    });

    socket.on("disconnect", () => {
        console.log("Disconnected");
    });
});
