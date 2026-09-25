import { io } from 'socket.io-client';
import { api, getToken } from './api';

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  socket = io(api.base, { auth: { token: getToken() }, autoConnect: true });
  return socket;
}

export function getSocket() {
  return socket;
}
