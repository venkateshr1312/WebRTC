import { useEffect, useRef, useState } from 'react';
import { CiVideoOff, CiVideoOn } from 'react-icons/ci';
import { ImPhoneHangUp } from 'react-icons/im';
import { IoIosMic, IoIosMicOff } from 'react-icons/io';
import { TbPhoneCall } from 'react-icons/tb';
import { VscCallIncoming } from 'react-icons/vsc';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';


const configuration = {
    iceServers: [
        { urls: ["turn:159.65.159.152:3478"], username: "meenakshi", credential: "meenakshi" },
        { urls: ["stun:159.65.159.152:3478"] }]
    }

// Correctly pass the configuration object directly to the RTCPeerConnection constructor
//const peerConnection = new RTCPeerConnection(configuration);




/* const socket = io("https://webrtc.twixor.com", {
     //query: { tabId: Math.random().toString(36).substring(7) },
    // transports: ["websocket"],
 });
 */


const socket = io("http://localhost:3000", {
    query: { tabId: Math.random().toString(36).substring(7) },
   transports: ["websocket"],
});


 


let pc: RTCPeerConnection | null;
const Web = () => {
    const { type } = useParams();
    const local_video = useRef<HTMLVideoElement | null>(null);
    const remote_video = useRef<HTMLVideoElement | null>(null);
    const [incomingCall, setIncomingCall] = useState(false);
    const [mute, setMute] = useState(true);
    const [videoMute, setVideoMute] = useState(true);
    const [offer, setOffer] = useState<RTCSessionDescriptionInit | null>(null);
    const [isCallAceepted, setIsCallAccepted] = useState<boolean | false>(false)

    useEffect(() => {
        const initializeMedia = async () => {
            try {
                const localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: { echoCancellation: true },
                });

                if (local_video.current) {
                    local_video.current.srcObject = localStream;
                }
            } catch (err) {
                console.error('Error accessing media devices:', err);
            }
        };

        initializeMedia();

        return () => {
            if (local_video.current?.srcObject) {
                const tracks = (local_video.current?.srcObject as MediaStream).getTracks();
                tracks.forEach((track) => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        socket.on('connect', () => {
            socket.emit('register', {
                userId: socket.id,
                username: 'aravindh',
                created_at: Date.now(),
            });

        });

        socket.on('offer', (offer) => {
             setIncomingCall(true);
             setOffer(offer);
         });

        socket.on('answer', (answer) => {
            handleAnswer(answer);
        });

       

        return () => {
            socket.off('connect');
            socket.off('offer');
            socket.off('answer');
        };
    }, []);

    const handleMute = () => {
        if (local_video.current?.srcObject) {
            const stream = local_video.current.srcObject as MediaStream;
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setMute(audioTrack.enabled);
            }
        }
    };

    const handleVideoMute = () => {
        if (local_video.current?.srcObject) {
            const stream = local_video.current.srcObject as MediaStream;
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideoMute(videoTrack.enabled);
            }
        }
    };

   

    // Create Offer - Initiator
    const createOffer = async () => {
        pc = new RTCPeerConnection(configuration);

        // Add local video stream to the peer connection
        (local_video.current?.srcObject as MediaStream).getTracks().forEach((track) => {
            pc!.addTrack(track, local_video.current?.srcObject as MediaStream);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('create===offer==>', offer);
        // Emit the offer to the remote peer
        socket.emit('offer', {
            offer: offer,
            socketId: socket.id,
            username: 'Aravindh',
        });

        // Handle remote tracks
        pc.ontrack = (event) => {
            console.log("Received remote track");
            if (remote_video.current) {
                remote_video.current.srcObject = event.streams[0];  // Display remote video stream
            }
        };


        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("New ICE Candidate:", event.candidate);
            } else {
                console.log("All Ice candidates have been gathered");
            }
        };
    

        pc.addEventListener("oniceconnectionstatechange", () => {
            console.log("oniceconnectionstatechange -->" + pc?.iceConnectionState);
        });
    };

   



    async function handleAnswer(answer: RTCSessionDescriptionInit) {
        console.log("answer -->", JSON.stringify(answer));
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


    // Accept Call - Receiver
    const acceptCall = async () => {
        if (!offer ) return;

        try {

            pc = new RTCPeerConnection(configuration);

            
            // Handle remote stream (ontrack)
            pc.ontrack = (e) => {
                console.log("ontrack event triggered");
                if (remote_video.current) {
                    remote_video.current.srcObject = e.streams[0];  // Display remote stream
                }
            };

            pc.addEventListener("oniceconnectionstatechange", () => {
                console.log("oniceconnectionstatechange -->" + pc?.iceConnectionState);
            });

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log("New ICE Candidate:", event.candidate);
                } else {
                    console.log("All Ice candidates have been gathered");
                }
            };

            // Add local video stream to the peer connection
            (local_video.current?.srcObject as MediaStream).getTracks().forEach((track) => {
                pc!.addTrack(track, local_video.current?.srcObject as MediaStream);
            });

            // Set the remote description (Offer received)
            console.log("Setting remote description for the offer", offer);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            // Create an answer
            const answer = await pc.createAnswer();
            console.log("Created answer: ", answer);

            // Send the answer back to the caller
            socket.emit("answer", {
               
                answer: answer,
                socketId: socket.id,
                username: 'Aravindh'
            });

            // Set local description (answer)
            await pc.setLocalDescription(answer);

            console.log("Answer sent and local description set");

            setIncomingCall(false);  
            setIsCallAccepted(true);
        } catch (e) {
            console.error("Error accepting call", e);
        }
    };

    const stopCall = () => {
        console.log("call end...");
        // Stop local video and audio streams
        if (remote_video.current && remote_video.current.srcObject) {
            const stream = remote_video.current.srcObject as MediaStream; // Cast to MediaStream
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            remote_video.current.srcObject = null; // Clear the srcObject
        }

        // Stop remote video and audio streams
        if (local_video.current && local_video.current.srcObject) {
            const stream = local_video.current.srcObject as MediaStream; // Cast to MediaStream
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            local_video.current.srcObject = null; // Clear the srcObject
        }

        // Reset the call state
        //setIsCallActive(false);
        //setOfferValue(false);  // Or whatever state you need to reset
        //setRemoteSocketId(null);  // Clear the remote socket id (if applicable)
        window.location.reload();  // Optionally refresh the page
    };

    const handleRejectCall = () => {
      
            console.log("call reject...");
            if (remote_video.current && remote_video.current.srcObject) {
                const stream = remote_video.current.srcObject as MediaStream; // Cast to MediaStream
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
                remote_video.current.srcObject = null; // Clear the srcObject
            }
    
            // Stop remote video and audio streams
            if (local_video.current && local_video.current.srcObject) {
                const stream = local_video.current.srcObject as MediaStream; // Cast to MediaStream
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
                local_video.current.srcObject = null; // Clear the srcObject
            }
            window.location.reload();  // Optionally refresh the page
            //   setIsCallAccepted(true);
        
    };



    return (
        <div className="w-full h-full bg-zinc-700 relative">
            <div className="flex flex-col-reverse h-full">
                <div className="block w-full p-4 bg-transparent">
                    <div className="flex items-center gap-4 justify-center">
                        {type === 'verifier' && (
                            <button
                                className="inline-flex items-center justify-center min-w-24 min-h-16 cursor-pointer rounded-3xl bg-green-600"
                                onClick={createOffer}
                            >
                                <TbPhoneCall className="text-white text-2xl" />
                            </button>
                        )}
                        {type !== 'verifier' && (
                            <div className="flex items-center gap-4">
                                {incomingCall && (
                                    <button
                                        className="inline-flex items-center justify-center min-w-24 min-h-16 cursor-pointer rounded-3xl bg-green-600"
                                        onClick={acceptCall}
                                    >
                                        <VscCallIncoming className="text-white text-2xl" />
                                    </button>
                                )}
                                {incomingCall && (
                                    <button className="inline-flex items-center justify-center min-w-24 min-h-16 cursor-pointer rounded-3xl bg-red-600"
                                    onClick={handleRejectCall}
                                    >
                                        <ImPhoneHangUp className="text-white text-2xl" />
                                    </button>
                                )}{}
                                <button
                                    className="inline-flex items-center justify-center min-w-24 min-h-16 cursor-pointer rounded-3xl bg-zinc-600"
                                    onClick={handleMute}
                                >
                                    {mute ? <IoIosMic className="text-white text-2xl" /> : <IoIosMicOff className="text-white text-2xl" />}
                                </button>
                                <button
                                    className="inline-flex items-center justify-center min-w-24 min-h-16 cursor-pointer rounded-3xl bg-zinc-600"
                                    onClick={handleVideoMute}
                                >
                                    {videoMute ? <CiVideoOn className="text-white text-2xl" /> : <CiVideoOff className="text-white text-2xl" />}
                                </button>
                            </div>
                        )}

                        {isCallAceepted &&
                            <button className="inline-flex items-center justify-center min-w-24 min-h-16 cursor-pointer rounded-3xl bg-red-600"
                            onClick={stopCall}
                            >
                                <ImPhoneHangUp className="text-white text-2xl" />
                            </button>
                        }
                    </div>
                </div>
                <div className="flex-1 relative">
                    <div className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden z-0 p-4">
                        <div className="relative w-full h-full overflow-auto z-10">
                           <div className='h-full mx-auto relative container mt-0'>
                                <video
                                    ref={remote_video}
                                    className="max-w-full max-h-full object-cover -scale-x-[1] w-full h-full"
                                    autoPlay
                                    playsInline
                                />
                                <video
                                    ref={local_video}
                                    className="w-1/4 absolute bottom-4 right-4 h-2/4 bg-no-repeat object-cover rounded-xl border-2 border-purple-700 -scale-x-[1]"
                                    autoPlay
                                    playsInline
                                    muted
                                />
                           </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Web;
