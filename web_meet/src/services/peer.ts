class PeerService {
  public peer: RTCPeerConnection | null = null;

  constructor() {
    if (!this.peer) {
      this.peer = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:global.stun.twilio.com:3478",
            ],
          },
        ],
      });
    }
  }
 
  
  // Get answer to a received offer
  async getAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (this.peer) {
      await this.peer.setRemoteDescription(offer);
      const answer = await this.peer.createAnswer();
      await this.peer.setLocalDescription(new RTCSessionDescription(answer));

      // Log the SDP offer and answer
      console.log("SDP Offer received:", offer.sdp);
      console.log("SDP Answer created:", answer.sdp);

      return answer;
    }
    throw new Error("Peer connection not initialized.");
  }

  // Set the local description (answer or offer)
  async setLocalDescription(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peer) {
      await this.peer.setRemoteDescription(new RTCSessionDescription(answer));

      // Log the local SDP description
      console.log("SDP Local Description set:", answer.sdp);
    } else {
      throw new Error("Peer connection not initialized.");
    }
  }

 
  async getOffer() {
      if (this.peer) {

          const Sstream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
          });
          for (const track of Sstream.getTracks()) {
              this.peer.addTrack(track, Sstream);
          }

      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(new RTCSessionDescription(offer));
      console.log("SDP Offer created:", offer);
      return offer;
    }
  }

}

export default new PeerService();