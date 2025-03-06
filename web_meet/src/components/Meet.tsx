import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useSocket } from '../context/SocketProvider';
// Assuming you have peerService for peer connection management
import peerService from '../services/peer'; 
import { SocketUser } from '../config';
import { useParams } from 'react-router-dom';

const Meet: React.FC = () => {
  const { type, phone } = useParams();
  const { socket, isConnected } = useSocket();
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const [recordStart, setRecordStart] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const drawInterval = useRef<number | null>(null);

  const handleGetUsers = (users: SocketUser[]) => {
    const unique = users.find((user) => user.profile.type !== type);
    console.log(unique);
    if (unique) {
      setRemoteSocketId(unique.userId); // Store remote peer's socket ID
      socket?.emit('call:incoming', { to: unique.userId, message: 'I am calling' });
    }
  };

  useEffect(() => {
    if (isConnected) {
      const data = {
        userName: 'Test',
        type: type,
        phoneNo: phone,
      };
      socket?.emit('user', data);

      socket?.on('getUsers', handleGetUsers);
      socket?.on('call:user', (message: string) => {
        console.log(message, 'hey');
        alert(message);
      });

        socket?.on('incoming:call', handleIncomingCall);
        socket?.on("peer:nego:needed", handleNegoNeedIncomming);
        socket?.on("peer:nego:final", handleNegoNeedFinal);

      return () => {
        socket?.off('getUsers', handleGetUsers);
        socket?.off('call:user');
          socket?.off('incoming:call', handleIncomingCall);
          socket?.off("peer:nego:needed", handleNegoNeedIncomming);
          socket?.off("peer:nego:final", handleNegoNeedFinal);

      };
    }
  }, [socket, isConnected, type, phone]);


    const handleNegoNeeded = useCallback(async () => {
        const offer = await peerService.getOffer();
        socket?.emit("peer:nego:needed", { offer, to: remoteSocketId });
    }, [remoteSocketId, socket]);

    useEffect(() => {
        peerService.peer?.addEventListener("negotiationneeded", handleNegoNeeded);
        return () => {
            peerService.peer?.removeEventListener("negotiationneeded", handleNegoNeeded);
        };
    }, [handleNegoNeeded]);

    const handleNegoNeedIncomming = useCallback(
        async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit; }) => {
            const ans = await peerService.getAnswer(offer);
            socket?.emit("peer:nego:done", { to: from, ans });
        },
        [socket]
    );

    const handleNegoNeedFinal = useCallback(async ({ ans }: { ans: RTCSessionDescriptionInit }) => {
        await peerService.setLocalDescription(ans);
    }, []);

    useEffect(() => {
        peerService.peer?.addEventListener("track", (ev) => {
            const remoteStream = ev.streams[0];
            console.log("Remote Track Received");
            setRemoteStream(remoteStream);
        });
    }, []);

  // Handle incoming call
  const handleIncomingCall = useCallback(
    async ({ from, offer, isVideoCall }: { from: string; offer: RTCSessionDescriptionInit; isVideoCall: boolean }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall,
      });
      setMyStream(stream); // Set the local stream
      console.log(`Incoming Call from: ${from}`, offer);

      const ans = await peerService.getAnswer(offer);
          socket?.emit('call:accepted', { to: from, ans });
    },
    [socket]
  );

  const handleStartCall = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);

    // Create an offer to start the peer connection
    const offer = await peerService.getOffer();
    if (remoteSocketId) {
      socket?.emit('user:call', { to: remoteSocketId, offer });
      console.log("Outgoing Call to", remoteSocketId);
    }
  }, [socket, remoteSocketId]);

  const handleAudioCall = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    setMyStream(stream);

    // Create an offer for audio-only call
    const offer = await peerService.getOffer();
    if (remoteSocketId) {
      socket?.emit('user:call', { to: remoteSocketId, offer });
    }
  }, [socket, remoteSocketId]);

  const handleEndCall = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
    }
    if (peerService.peer) {
      peerService.peer.close();
    }
    setMyStream(null);
    setRemoteStream(null);
    if (remoteSocketId) {
      socket?.emit('call:ended', { to: remoteSocketId });
    }
  }, [myStream, socket, remoteSocketId]);

  const handleRejectCall = useCallback(() => {
    // Close the peer connection if the call is rejected
    if (peerService.peer) {
      peerService.peer.close();
      console.log("Call Rejected!");
    }

    // Reset the streams and states
    setMyStream(null);
    setRemoteStream(null);

    if (remoteSocketId) {
      socket?.emit('call:rejected', { to: remoteSocketId });
    }
  }, [remoteSocketId, socket]);

  const handleStartRecord = (e: React.MouseEvent) => {
    e.preventDefault();

    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size
    const canvasWidth = 1280;
    const canvasHeight = 720;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Create video elements to play the streams
    const remoteVideoElement = document.createElement('video');
    const myVideoElement = document.createElement('video');

    // Set up the video elements with the respective streams
    remoteVideoElement.srcObject = remoteStream;
    myVideoElement.srcObject = myStream;

    // Play both videos in their respective elements (hidden in the DOM)
    remoteVideoElement.play();
    myVideoElement.play();

    // Function to draw videos on the canvas
    const drawCanvas = () => {
      // Draw the remote stream (left side of the canvas)
      ctx?.drawImage(remoteVideoElement, 0, 0, canvasWidth / 2, canvasHeight);

      // Draw the local stream (right side of the canvas)
      ctx?.drawImage(myVideoElement, canvasWidth / 2, 0, canvasWidth / 2, canvasHeight);
    };

    // Set up a loop to draw both videos on the canvas periodically
    drawInterval.current = setInterval(drawCanvas, 1000 / 30); // 30 FPS

    // Combine both video and audio tracks from the streams
    const combinedStream = new MediaStream();

    // Add video track from the canvas
    const videoTrack = canvas.captureStream(30).getVideoTracks()[0];
    combinedStream.addTrack(videoTrack);

   // Add audio tracks from both local and remote streams
if (myStream) {
  myStream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
}

if (remoteStream) {
  remoteStream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
}

    // Start recording from the combined stream (audio + video)
    mediaRecorderRef.current = new MediaRecorder(combinedStream);
    mediaRecorderRef.current.start();

    // Set up event listeners for data availability
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (mediaRecorderRef.current?.state === 'inactive') {
        makeLink(e.data); // Assuming makeLink is defined elsewhere
      }
    };

    setRecordStart(true);
  };

  const handleStopRecord = (e: React.MouseEvent) => {
    if (drawInterval.current) {
      clearInterval(drawInterval.current); // Stop drawing loop
    }
    e.preventDefault();
    mediaRecorderRef.current?.stop();
    setRecordStart(false);
  };

  const makeLink = (data: Blob) => {
    console.log(data);
    const blob = new Blob([data], {
      type: 'video/mp4;codecs=vp8,opus',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${remoteSocketId}.mp4`;
    a.click();
  };

  const buttonStyle = {
    padding: '12px 24px',
    fontSize: '16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#4CAF50', // Green button color
    color: 'white',
    fontWeight: 'bold',
    transition: 'background-color 0.3s, transform 0.2s',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
  };

  return (
    <div>
      <h4>{remoteSocketId ? 'Connected' : 'Joined'}</h4>
      {myStream && (
        <>
          <h1>My Stream</h1>
          <video
            ref={(ref) => {
              if (ref && myStream) {
                ref.srcObject = myStream;
              }
            }}
            autoPlay
            style={{
              height: '200px',
              width: '200px',
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
              height: 'auto',
              width: '600px',
            }}
          />
        </>
      )}
      <div
        className="button-container"
        style={{
          display: 'flex',
          justifyContent: 'center', // Center the buttons vertically
          alignItems: 'center', // Center the buttons horizontally
          gap: '8px', // Adds space between buttons
          marginBottom: '20px',
        }}
      >
        {remoteSocketId ? (
          <>
            <button onClick={handleStartCall} style={buttonStyle}>
              <i className="fas fa-video" style={{ marginRight: '8px' }}></i>Start Video Call
            </button>
            <button onClick={handleAudioCall} style={buttonStyle}>
              <i className="fas fa-phone-alt" style={{ marginRight: '8px' }}></i>Start Audio Call
            </button>
          </>
        ) : (
          <p>Waiting for other user to join...</p>
        )}
        {remoteSocketId && (
          <>
            <button onClick={handleEndCall} style={buttonStyle}>
              <i className="fas fa-phone-slash" style={{ marginRight: '8px' }}></i>End Call
            </button>
            {!recordStart ? (
              <button onClick={handleStartRecord} style={buttonStyle}>
                <i className="fas fa-record-vinyl" style={{ marginRight: '8px' }}></i>Start Recording
              </button>
            ) : (
              <button onClick={handleStopRecord} style={buttonStyle}>
                <i className="fas fa-stop" style={{ marginRight: '8px' }}></i>Stop Recording
              </button>
            )}
            <button onClick={handleRejectCall} style={buttonStyle}>
              <i className="fas fa-times-circle" style={{ marginRight: '8px' }}></i>Reject Call
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Meet;
