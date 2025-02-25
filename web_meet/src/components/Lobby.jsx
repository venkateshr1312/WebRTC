import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";

const LobbyScreen = () => {
  const socket = useSocket();
  const navigate = useNavigate();

  const mobileNo = "9999999990"; // Hardcoded mobile number
  const room = "9898989898"; // Hardcoded Room 1

  // Emit room join event automatically when component mounts
  useEffect(() => {
    // Emit the join room event
    socket.emit("room:join", { mobileNo, room });

    // Listen for the room join event
    const handleJoinRoom = (data) => {
      const { mobileNo, room } = data;
      navigate(`/room/${room}`);
    };

    socket.on("room:join", handleJoinRoom);

    // Cleanup the listener when the component is unmounted
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, navigate]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#f4f4f9" }}>
      <div
        style={{
          maxWidth: "400px",
          width: "100%",
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          backgroundColor: "#fff",
          boxShadow: "0px 0px 15px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "20px" }}>WebRTC Login</h1>
        <p style={{ textAlign: "center" }}>You have been automatically connected to Room 1.</p>
      </div>
    </div>
  );
};

export default LobbyScreen;
