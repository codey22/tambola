import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import socket from "../services/socket";
import { motion } from "framer-motion";

const LobbyPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get("mode"); // create | join

  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [ticketCount, setTicketCount] = useState(1);
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setError("");
    };

    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.on("room_created", ({ roomCode, isHost, player }) => {
      navigate(`/game/${roomCode}`, {
        state: { isHost, playerName: player.name, player },
      });
    });

    socket.on("room_joined", ({ roomCode, isHost, player }) => {
      navigate(`/game/${roomCode}`, {
        state: { isHost, playerName: player.name, player },
      });
    });

    socket.on("error", ({ message }) => {
      setError(message);
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_created");
      socket.off("room_joined");
      socket.off("error");
    };
  }, [navigate]);

  const handleCreateRoom = () => {
    if (!isConnected) {
      setError("Cannot create room: Disconnected from server.");
      return;
    }
    if (!playerName) {
        setError("Please enter your name.");
        return;
    }
    socket.emit("create_room", { playerName, maxPlayers, ticketCount });
  };

  const handleJoinRoom = () => {
    if (!roomCode || !playerName) return;
    if (!isConnected) {
      setError("Cannot join room: Disconnected from server.");
      return;
    }
    socket.emit("join_room", { roomCode, playerName });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 px-4 font-sans text-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8"
      >
        <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-500">
                Tambola
            </h1>
            <h2 className="text-xl font-medium text-indigo-200">
                {mode === "create" ? "Create New Room" : "Join Game"}
            </h2>
        </div>

        {!isConnected && (
           <div className="bg-yellow-500/20 border border-yellow-400/50 text-yellow-200 px-4 py-3 rounded-xl mb-6 text-sm text-center animate-pulse">
             Connecting to server... <br/> 
             <span className="text-xs opacity-75">
               (Please wait...)
             </span>
           </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-400/50 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm font-semibold">
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-4">
            {/* Player Name Input (For both modes now) */}
            <div>
                <label className="block text-sm font-medium text-indigo-200 mb-1">Your Name</label>
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 transition"
                />
            </div>

            {mode === "create" ? (
                <>
                    <div>
                        <label className="block text-sm font-medium text-indigo-200 mb-1">Max Players</label>
                        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                            <input
                                type="range"
                                min="2"
                                max="20"
                                value={maxPlayers}
                                onChange={(e) => setMaxPlayers(e.target.value)}
                                className="w-full accent-pink-500"
                            />
                            <span className="font-bold text-xl w-8 text-center">{maxPlayers}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-indigo-200 mb-1">Tickets Per Player</label>
                        <div className="relative">
                            <select 
                                value={ticketCount}
                                onChange={(e) => setTicketCount(Number(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition appearance-none cursor-pointer"
                            >
                                {[...Array(10)].map((_, i) => (
                                    <option key={i + 1} value={i + 1} className="bg-indigo-900 text-white">
                                        {i + 1} Ticket{i > 0 ? 's' : ''}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-white">
                                ▼
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div>
                    <label className="block text-sm font-medium text-indigo-200 mb-1">Room Code</label>
                    <input
                        type="text"
                        placeholder="e.g. ABC123"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 transition font-mono tracking-widest uppercase"
                    />
                </div>
            )}

            <button
                onClick={mode === "create" ? handleCreateRoom : handleJoinRoom}
                disabled={!isConnected}
                className={`
                    w-full py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:scale-105 active:scale-95
                    ${isConnected 
                        ? 'bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white' 
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
                `}
            >
                {mode === "create" ? "Create Room" : "Join Room"}
            </button>
            
            <button
                onClick={() => navigate('/')}
                className="w-full py-2 text-indigo-300 hover:text-white text-sm font-medium transition"
            >
                Cancel
            </button>
        </div>
      </motion.div>
    </div>
  );
};

export default LobbyPage;
