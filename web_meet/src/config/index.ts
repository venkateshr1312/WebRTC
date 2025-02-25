export type meet = {
    sdp: string
}


export type User = {
    userName: string,
    phoneNo: string,
    type: string,
}


export type SocketUser = {
    userId: string,
    socketId: string,
    profile: User
}