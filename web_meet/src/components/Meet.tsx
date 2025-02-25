/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react';
import '../Meet.css';
import { useSocket } from '../context/SocketProvider';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';

// Define the prop types

const VideoBanner = styled.div`
  width: 100%;
  height: 100%;
  padding: .5rem
`;

const VideoContainer = styled.div`
  display: block;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  border-radius: 1rem;
  background:rgb(75, 75, 75); 
`;

const VideoRelative = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
`

const VideoMute = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
`

const NameChar = styled.div`
  display: inline-block;
  text-align: center;
  line-height: 14rem;
  min-width: 14rem;
  min-height: 14rem;
  border-radius: 50%;
  color: #ffffff;
  font-weight: 700;
  font-size: 4rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background:rgb(133, 54, 236)
`

const VideoActions = styled.div`
    position: absolute;
    bottom: .5rem;
    overflow-hidden;
    background: #ffffff;
`

const VideoActionContainer = styled.div`
   display: flex;
   align-items: center;
   gap: 1rem;
   max-width: max-content;
   padding: .5rem;
   border-radius: .5rem;
`




// Demo component accepts props for handling actions
const Meet: React.FC = () => {

  const { type, phone } = useParams();

  const { socket, isConnected } = useSocket();

  useEffect(() => {
    // console.log(isConnected)
    // console.dir(socket)

    const data = {
      userName: 'Aravindh',
      type: type,
      phoneNo: phone
    }
    if(isConnected) {
      socket?.emit("user", data);
    }


    socket?.on("getUsers", (message) => {
      console.dir(message)

      socket?.emit("call:request", "Request Calling")
    })
  }, [socket, isConnected])

  return (
    <VideoBanner>
        <VideoContainer>
            <VideoRelative>
                <VideoMute>
                  <NameChar>
                      A
                  </NameChar>
                </VideoMute>
                <VideoActions>
                    <VideoActionContainer>
                      Hello
                    </VideoActionContainer>
                </VideoActions>
            </VideoRelative>
        </VideoContainer>
    </VideoBanner>
    // <div className="video-container">
    //   <div className='video-flex-banner'>
    //     {isConnected && "connected"}
    //   </div>
    // </div>
  );
};

export default Meet;

