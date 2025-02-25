/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-refresh/only-export-components */


import React, { createContext, useMemo, useContext, ReactNode, useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { SocketUser, User } from "../config";

// Define the context type, including socket and connection status
interface SocketContextType {
  socket: Socket | undefined;
  isConnected: boolean;
}

// Define the context with a default value
const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Custom hook to access the socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

// Define the props type for SocketProvider
interface SocketProviderProps {
  children: ReactNode;
}

// SocketProvider component
export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<SocketUser[] | null>(null)

  // Create a memoized socket instance
  const socket = useMemo(() => io("http://localhost:8000"), []);

  // Monitor socket connection status
  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);


  useEffect(() => {

    if(!socket || !isConnected) return;

    socket.on('user', (res: User) => {
      console.log(res)
      setUser(res);

      console.log(res)
    });

    socket.on('getUsers', (res: SocketUser[]) => {
      setOnlineUsers(res);
      console.log(onlineUsers)
    });

    return () => {
      socket.off('getUsers', (res: SocketUser[]) => {
        setOnlineUsers(res);
      })
    }
  }, [socket, user, isConnected, onlineUsers])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
