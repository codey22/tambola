import io from 'socket.io-client';

const isProduction = process.env.NODE_ENV === 'production';

// If an env var provides the backend URL (e.g. for Vercel -> Render setup), use it.
// Otherwise, rely on relative path (if served together) or localhost (dev).
const backendUrl = process.env.REACT_APP_BACKEND_URL || (isProduction ? '/' : 'http://localhost:5000');
const socket = io(backendUrl);

export default socket;
