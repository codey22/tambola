import io from 'socket.io-client';

const isProduction = process.env.NODE_ENV === 'production';

// If an env var provides the backend URL (e.g. for Vercel -> Render setup), use it.
// Otherwise, rely on relative path (if served together) or localhost (dev).
const backendUrl = process.env.REACT_APP_BACKEND_URL || (isProduction ? '/' : 'http://localhost:5000');

console.log(`Connecting to backend at: ${backendUrl}`);

const socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
});

export default socket;
