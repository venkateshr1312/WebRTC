import React, { useEffect, useCallback, useState ,useRef} from "react";
// import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";

const RoomPage = () => {
    const socket = useSocket();
    const [remoteSocketId, setRemoteSocketId] = useState(null);
    const [myStream, setMyStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const mediaRecorderRef = useRef(null);
    const drawInterval = useRef(null); 
    const [recordStart, setRecordStart] = useState(false);
    
    const handleUserJoined = useCallback(({ email, id }) => {
      console.log(`Email ${email} joined room`);
      setRemoteSocketId(id);
    }, []);
  
    const handleCallUser = useCallback(async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      const offer = await peer.getOffer();
      socket.emit("user:call", { to: remoteSocketId, offer });
    }, [remoteSocketId, socket]);

    // Handle audio call (only audio, no video)
const handleAudioCall = useCallback(async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });
  setMyStream(stream);
  const offer = await peer.getOffer();
  socket.emit("user:call", { to: remoteSocketId, offer });
}, [remoteSocketId, socket]);

  
    
const handleIncommingCall = useCallback(
  async ({ from, offer, isVideoCall }) => {
    setRemoteSocketId(from);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true, // Enable video if it's a video call
    });
    setMyStream(stream); // Set the local stream
    console.log(`Incoming Call from: ${from}`, offer);

    const ans = await peer.getAnswer(offer);
    socket.emit("call:accepted", { to: from, ans });
  },
  [socket]
);
  
    const sendStreams = useCallback(() => {
      if (myStream) {
        myStream.getTracks().forEach((track) => {
          peer.peer.addTrack(track, myStream);
        });
      }
    }, [myStream]);
  
    const handleCallAccepted = useCallback(
      ({ from, ans }) => {
        peer.setLocalDescription(ans);
        console.log("Call Accepted!");
        sendStreams();
      },
      [sendStreams]
    );
  
    const handleNegoNeeded = useCallback(async () => {
      const offer = await peer.getOffer();
      socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
    }, [remoteSocketId, socket]);
  
    useEffect(() => {
      peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
      return () => {
        peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
      };
    }, [handleNegoNeeded]);
  
    const handleNegoNeedIncomming = useCallback(
      async ({ from, offer }) => {
        const ans = await peer.getAnswer(offer);
        socket.emit("peer:nego:done", { to: from, ans });
      },
      [socket]
    );
  
    const handleNegoNeedFinal = useCallback(async ({ ans }) => {
      await peer.setLocalDescription(ans);
    }, []);
  
    useEffect(() => {
      peer.peer.addEventListener("track", (ev) => {
        const remoteStream = ev.streams[0];
        console.log("Remote Track Received");
        setRemoteStream(remoteStream);
      });
    }, []);

    
  
    useEffect(() => {
      socket.on("user:joined", handleUserJoined);
      socket.on("incomming:call", handleIncommingCall);
      socket.on("call:accepted", handleCallAccepted);
      socket.on("peer:nego:needed", handleNegoNeedIncomming);
      socket.on("peer:nego:final", handleNegoNeedFinal);
  
      return () => {
        socket.off("user:joined", handleUserJoined);
        socket.off("incomming:call", handleIncommingCall);
        socket.off("call:accepted", handleCallAccepted);
        socket.off("peer:nego:needed", handleNegoNeedIncomming);
        socket.off("peer:nego:final", handleNegoNeedFinal);
      };
    }, [
      socket,
      handleUserJoined,
      handleIncommingCall,
      handleCallAccepted,
      handleNegoNeedIncomming,
      handleNegoNeedFinal,
    ]);

    const handleUserCallEnd = useCallback(() => {
        // Stop the local media tracks (audio/video)
        if (myStream) {
          myStream.getTracks().forEach((track) => track.stop());
        }
        
        // Close the peer connection
        if (peer.peer) {
          peer.peer.close();
        }
    
        // Reset the streams
        setMyStream(null);
        setRemoteStream(null);
    
        // Emit the call end signal to the other peer
        if (remoteSocketId) {
          socket.emit("call:ended", { to: remoteSocketId });
        }
         window.location.reload();
      }, [myStream, socket, remoteSocketId]);
  
  const handleRejectCall = useCallback(() => {
    // Close the peer connection if the call is rejected
    if (peer.peer) {
      peer.peer.close();
      console.log("Call Rejected!");
    }

    // Reset the streams and states
    setMyStream(null);
    setRemoteStream(null);

    if (remoteSocketId) {
      socket.emit("call:rejected", { to: remoteSocketId });
    }
  }, [remoteSocketId, socket]);

  const handleStartRecord = (e) => {
    e.preventDefault();

    // Create a canvas element
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Set canvas size
    const canvasWidth = 1280;
    const canvasHeight = 720;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Create video elements to play the streams
    const remoteVideoElement = document.createElement("video");
    const myVideoElement = document.createElement("video");

    // Set up the video elements with the respective streams
    remoteVideoElement.srcObject = remoteStream;
    myVideoElement.srcObject = myStream;

    // Play both videos in their respective elements (hidden in the DOM)
    remoteVideoElement.play();
    myVideoElement.play();

    // Function to draw videos on the canvas
    const drawCanvas = () => {
      // Draw the remote stream (left side of the canvas)
      ctx.drawImage(remoteVideoElement, 0, 0, canvasWidth / 2, canvasHeight);

      // Draw the local stream (right side of the canvas)
      ctx.drawImage(myVideoElement, canvasWidth / 2, 0, canvasWidth / 2, canvasHeight);
    };

    // Set up a loop to draw both videos on the canvas periodically
    drawInterval.current = setInterval(drawCanvas, 1000 / 30); // 30 FPS

    // Combine both video and audio tracks from the streams
    const combinedStream = new MediaStream();

    // Add video track from the canvas
    const videoTrack = canvas.captureStream(30).getVideoTracks()[0];
    combinedStream.addTrack(videoTrack);

    // Add audio tracks from both local and remote streams
    myStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    if (remoteStream) {
      remoteStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    }

    // Start recording from the combined stream (audio + video)
    mediaRecorderRef.current = new MediaRecorder(combinedStream);
    mediaRecorderRef.current.start();

    // Set up event listeners for data availability
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (mediaRecorderRef.current.state === "inactive") {
        makeLink(e.data); // Assuming makeLink is defined elsewhere
      }
    };

    setRecordStart(true);
  };

  const handleStopRecord = (e) => {
    clearInterval(drawInterval.current); // Stop drawing loop
    e.preventDefault();
    mediaRecorderRef.current.stop();
    setRecordStart(false);
  };

  const makeLink = (data) => {
    console.log(data);
    let blob = new Blob([data], {
      type: "video/mp4;codecs=vp8,opus",
    });

    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = remoteSocketId + ".mp4";
    a.click();
  };
  const buttonStyle = {
    padding: "12px 24px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#4CAF50", // Green button color
    color: "white",
    fontWeight: "bold",
    transition: "background-color 0.3s, transform 0.2s",
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.2)",
  };
return (
    <div>
      <h4>{remoteSocketId ? "Connected" : "Joined"}</h4>
      {myStream && (
        <>
          <h1>My Stream</h1>
          <video
            ref={(ref) => {
              if (ref && myStream) {
                ref.srcObject = myStream;
                console.log("ref="+ref.srcObject) 
                console.log("myStream="+myStream)
              }
            }}
            autoPlay
            style={{
              height: "200px",
              width: "200px",
            }}
          />
        </>
      )}
      {remoteStream && (
        <>
          <h1>Remote Stream</h1>
          <video
            ref={(ref) => {
              if (ref) {
                ref.srcObject = remoteStream;
              }
            }}
            autoPlay
            style={{
              height: "auto",
              width: "600px",
            }}
          />
        </>
      )}
      <div
        className="button-container"
        style={{
          display: "flex",
          justifyContent: "center", // Center the buttons vertically
          alignItems: "center", // Center the buttons horizontally
          gap: "8px", // Adds space between buttons
          marginBottom: "20px",
        }}
      >
        {remoteSocketId ? (
         <>
         <button onClick={() => handleCallUser(true)} style={buttonStyle}>
           <i className="fas fa-video" style={{ marginRight: "8px" }}></i>Start Video Call
         </button>
         <button onClick={() => handleAudioCall(false)} style={buttonStyle}>
           <i className="fas fa-phone-alt" style={{ marginRight: "8px" }}></i>Start Audio Call
         </button>
       </>
        ) : (
          <p>Waiting for other user to join...</p>
        )}
        {remoteSocketId && (
          <>
          <button onClick={handleUserCallEnd} style={buttonStyle}>
            <i className="fas fa-phone-slash" style={{ marginRight: "8px" }}></i>Call End
          </button>
          {!recordStart ? (
            <button onClick={handleStartRecord} style={buttonStyle}>
              <i className="fas fa-record-vinyl" style={{ marginRight: "8px" }}></i>Start Recording
            </button>
          ) : (
            <button onClick={handleStopRecord} style={buttonStyle}>
              <i className="fas fa-stop" style={{ marginRight: "8px" }}></i>Stop Recording
            </button>
          )}
          <button onClick={handleRejectCall} style={buttonStyle}>
            <i className="fas fa-times" style={{ marginRight: "8px" }}></i>Reject Call
          </button>
        </>
        )}
      </div>     
    </div>
  );
};

export default RoomPage;