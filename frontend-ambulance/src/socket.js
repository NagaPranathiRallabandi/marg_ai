import { io } from 'socket.io-client';

// This creates one single connection that both dashboards will share.
const URL = 'http://localhost:5000';
export const socket = io(URL, {
  autoConnect: false // We will connect manually in the components
});