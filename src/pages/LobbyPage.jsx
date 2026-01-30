import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import socket from "../services/socket";

const LobbyPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get("mode"); // create | join

  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [maxTicket, setMaxTicket] = useState(1);
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
    // Generate room code is now handled by backend
    // But UI shows "Generate Room Code" button which locally generated it before.
    // We can just emit create_room immediately or if we want to keep the UX of "Generate" then "Start",
    // we might need to adjust.
    // For simplicity and better UX, "Start Game" can just create the room.
    // Or we can pre-generate code locally? No, backend should handle source of truth.
    // Let's make "Start Game" trigger the creation.
    // The previous UX had "Generate Room Code" -> show code -> "Start Game".
    // We can simulate this or just simplify to "Create Room" button.
    // Let's simplify: User enters name (wait, Create Room didn't ask for name before? It defaulted to "Host").
    // Let's ask for name even for Host or default to "Host".
    
    socket.emit("create_room", { playerName: "Host", maxPlayers, maxTicket });
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          {mode === "create" ? "Create Room" : "Join Room"}
        </h1>

        {!isConnected && (
           <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded mb-4 text-sm text-center">
             Connecting to server... <br/> 
             <span className="text-xs mt-1 block">
               (This may take a moment. If it fails, ensure the backend is running)
             </span>
           </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {/* CREATE ROOM */}
        {mode === "create" && (
          <>
            <label className="block text-sm font-medium mb-1">
              Maximum Players
            </label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            >
              {[3, 5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium mb-1">
              Tickets
            </label>
            <select
              value={maxTicket}
              onChange={(e) => setMaxTicket(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            >
              {[1, 2, 3, 4, 5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <button
              onClick={handleCreateRoom}
              disabled={!isConnected}
              className={`w-full py-2 rounded-lg font-semibold transition ${
                isConnected 
                 ? "bg-green-600 text-white hover:bg-green-700" 
                 : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }`}
            >
              Start Game (Create Room)
            </button>
          </>
        )}

        {/* JOIN ROOM */}
        {mode === "join" && (
          <>
            <label className="block text-sm font-medium mb-1">
              Player Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
              placeholder="Enter your name"
            />

            <label className="block text-sm font-medium mb-1">
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full border rounded-lg px-3 py-2 mb-6 tracking-widest"
              placeholder="ABC123"
            />

            <button
              onClick={handleJoinRoom}
              disabled={!isConnected}
              className={`w-full py-2 rounded-lg font-semibold transition ${
                isConnected 
                 ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                 : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }`}
            >
              Join Game
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LobbyPage;
