import { io } from "socket.io-client";
import { useRef, useEffect, useState } from "react";
import { FiVideo, FiVideoOff, FiMic, FiMicOff } from "react-icons/fi";
import { useParams } from "react-router-dom";

const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

interface Profile {
  userName: string;
  type: string;
  phoneNo: string;
}

interface User {
  userId: string;
  socketId: string;
  profile: Profile;
}

const socket = io("https://webrtc.twixor.com", {});

let pc: RTCPeerConnection | null;
let localStream: MediaStream | null;
let remoteStream: MediaStream | null;

function App() {
  const { type, phone } = useParams<{ type: string; phone: string }>();
  const [remoteSocketInfo, setRemoteSocketInfo] = useState<User | null>(null);
  const [audiostate, setAudio] = useState(false);
  const [recordStart, setRecordStart] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const drawInterval = useRef<number | null>(null);
  const startButton = useRef<HTMLButtonElement | null>(null);
  const hangupButton = useRef<HTMLButtonElement | null>(null);
  const muteAudButton = useRef<HTMLButtonElement | null>(null);
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    hangupButton.current?.setAttribute("disabled", "true");
    muteAudButton.current?.setAttribute("disabled", "true");

    if (socket) {
      const data = {
        userName: "Test",
        type: type,
        phoneNo: phone,
      };
      socket?.emit("register", data);
    }
  }, [type, phone]);

  socket.on("message", (e) => {
    if (!localStream) {
      console.log("not ready yet");
      return;
    }
    switch (e.type) {
      case "offer":
        handleOffer(e);
        break;
      case "answer":
        handleAnswer(e);
        break;
      case "candidate":
        handleCandidate(e);
        break;
      case "ready":
        // A second tab joined. This tab will initiate a call unless in a call already.
        if (pc) {
          console.log("already in call, ignoring");
          return;
        }
        makeCall();
        break;
      case "bye":
        if (pc) {
          hangup();
        }
        break;
      default:
        console.log("unhandled", e);
        break;
    }
  });

  socket.on("registeruser", (onlineUsers: [User]) => {
    const unique = onlineUsers.find((user) => user.profile.type !== type);
    if (unique) {
      setRemoteSocketInfo(unique); // Store remote peer's socket ID
    }
  });

  async function makeCall() {
    try {
      pc = new RTCPeerConnection(configuration);
      pc.onicecandidate = (e) => {
        const message = {
          type: "candidate",
          candidate: e.candidate ? e.candidate.candidate : null,
          sdpMid: e.candidate ? e.candidate.sdpMid : undefined,
          sdpMLineIndex: e.candidate ? e.candidate.sdpMLineIndex : undefined,
        };
        socket.emit("message", message);
      };
      pc.ontrack = (e) => {
        remoteStream = e.streams[0];
        if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
      };
      localStream?.getTracks().forEach((track) => pc?.addTrack(track, localStream!));
      const offer = await pc.createOffer();
      socket.emit("message", { type: "offer", sdp: offer.sdp });
      await pc.setLocalDescription(offer);
    } catch (e) {
      console.log(e);
    }
  }

  async function handleOffer(offer: RTCSessionDescription) {
    if (pc) {
      console.error("existing peerconnection");
      return;
    }
    try {
      pc = new RTCPeerConnection(configuration);
      pc.onicecandidate = (e) => {
        const message = {
          type: "candidate",
          candidate: e.candidate ? e.candidate.candidate : null,
          sdpMid: e.candidate ? e.candidate.sdpMid : undefined,
          sdpMLineIndex: e.candidate ? e.candidate.sdpMLineIndex : undefined,
        };
        socket.emit("message", message);
      };
      pc.ontrack = (e) => {
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = e.streams[0];
        }
      };
      localStream?.getTracks().forEach((track) => pc?.addTrack(track, localStream!));
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      socket.emit("message", { type: "answer", sdp: answer.sdp });
      await pc.setLocalDescription(answer);
    } catch (e) {
      console.log(e);
    }
  }

  async function handleAnswer(answer: RTCSessionDescription) {
    if (!pc) {
      console.error("no peerconnection");
      return;
    }
    try {
      await pc.setRemoteDescription(answer);
    } catch (e) {
      console.log(e);
    }
  }

  async function handleCandidate(candidate: RTCIceCandidate | null) {
    try {
      if (!pc) {
        console.error("no peerconnection");
        return;
      }
      await pc.addIceCandidate(candidate); // It can either be a candidate or null
    } catch (e) {
      console.log(e);
    }
  }

  async function hangup() {
    if (pc) {
      pc.close();
      pc = null;
    }
    localStream?.getTracks().forEach((track) => track.stop());
    localStream = null;
    startButton.current?.removeAttribute("disabled");
    hangupButton.current?.setAttribute("disabled", "true");
    muteAudButton.current?.setAttribute("disabled", "true");
    window.location.reload();
  }

  const startB = async () => {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true },
      });
      if (localVideo.current) localVideo.current.srcObject = localStream;
    } catch (err) {
      console.log(err);
    }
    if (startButton.current) startButton.current.disabled = true;
    if (hangupButton.current) hangupButton.current.disabled = false;
    if (muteAudButton.current) muteAudButton.current.disabled = false;
    socket.emit("message", { type: "ready" });
    if (remoteSocketInfo) {
      socket.emit("requestcall", phone);
    }
  };

  const hangB = async () => {
    hangup();
    socket.emit("message", { type: "bye" });
  };


  function muteAudio() {
    if (audiostate) {
      if (localVideo.current) localVideo.current.muted = true;
      setAudio(false);
    } else {
      if (localVideo.current) localVideo.current.muted = false;
      setAudio(true);
    }
  }

  const handleStartRecord = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!remoteStream || !localStream) {
      console.log("Remote or Local stream is not ready.");
      return;
    }
    // Create the canvas and context for drawing
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const canvasWidth = 1280;
    const canvasHeight = 720;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    // Create video elements to capture remote and local streams
    const remoteVideoElement = document.createElement("video");
    const myVideoElement = document.createElement("video");
    remoteVideoElement.srcObject = remoteStream;
    myVideoElement.srcObject = localStream;
    remoteVideoElement.play();
    myVideoElement.play();
    // Function to draw video frames onto the canvas
    const drawCanvas = () => {
      if (ctx) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear previous frame
        ctx.drawImage(remoteVideoElement, 0, 0, canvasWidth / 2, canvasHeight);
        ctx.drawImage(myVideoElement, canvasWidth / 2, 0, canvasWidth / 2, canvasHeight);
        requestAnimationFrame(drawCanvas); // Keep updating the canvas
      }
    };
    // Start drawing the frames
    drawCanvas();
    // Capture the combined stream from the canvas
    const combinedStream = new MediaStream();
    const videoTrack = canvas.captureStream(30).getVideoTracks()[0];
    combinedStream.addTrack(videoTrack);

    // Add audio tracks from local and remote streams
    localStream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
    remoteStream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));

    // Start recording the combined stream
    mediaRecorderRef.current = new MediaRecorder(combinedStream);
    mediaRecorderRef.current.start();

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (mediaRecorderRef.current?.state === "inactive") {
        makeLink(e.data);
      }
    };

    setRecordStart(true); // Set the record start state to true
  };

  const handleStopRecord = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // Stop drawing frames to the canvas
    if (drawInterval.current) {
      clearInterval(drawInterval.current);
    }

    // Stop recording
    mediaRecorderRef.current?.stop();
    setRecordStart(false); // Set the record start state to false
  };

  const makeLink = (data: Blob) => {
    const blob = new Blob([data], { type: "video/mp4;codecs=vp8,opus" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recording.mp4`;
    a.click();
  };

  
  return (
    <main className="container">
      <div className="video bg-main">
        <video ref={localVideo} className="video-item" autoPlay playsInline />
        <video ref={remoteVideo} className="video-item" autoPlay playsInline />
      </div>
      <div className="btn">
        <button
          className="btn-item btn-start"
          ref={startButton}
          onClick={startB}
        >
          <FiVideo />
        </button>
        <button
          className="btn-item btn-end"
          ref={hangupButton}
          onClick={hangB}
        >
          <FiVideoOff />
        </button>
        <button
          className="btn-item btn-start"
          ref={muteAudButton}
          onClick={muteAudio}
        >
          {audiostate ? <FiMic /> : <FiMicOff />}
        </button>
        <button
          className="btn-item btn-start"
          onClick={handleStartRecord}
          disabled={recordStart}
        >
          Start Recording
        </button>
        <button
          className="btn-item btn-start"
          onClick={handleStopRecord}
          disabled={!recordStart}
        >
          Stop Recording
        </button>
      </div>
    </main>
  );
}

export default App;
