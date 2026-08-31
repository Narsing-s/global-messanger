import type { Server, Socket } from 'socket.io';

export function registerCallSignaling(io: Server, socket: Socket) {
  const userId = socket.data.user.id as string;
  socket.on('call:start', (data:any) => {
    if (!data?.callId || !data?.toUserId || !data?.signal) return;
    io.to(`user:${data.toUserId}`).emit('call:incoming', {...data, fromUserId:userId, peer:data.peer});
  });
  socket.on('call:accept', (data:any) => {
    if (!data?.callId || !data?.toUserId || !data?.signal) return;
    io.to(`user:${data.toUserId}`).emit('call:accepted', {...data, fromUserId:userId});
  });
  socket.on('call:ice', (data:any) => {
    if (!data?.callId || !data?.toUserId || !data?.signal) return;
    io.to(`user:${data.toUserId}`).emit('call:ice', {...data, fromUserId:userId});
  });
  socket.on('call:end', (data:any) => {
    if (!data?.callId || !data?.toUserId) return;
    io.to(`user:${data.toUserId}`).emit('call:ended', {...data, fromUserId:userId});
  });
}
