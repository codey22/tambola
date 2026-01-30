import { useParams, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import socket from "../services/socket";

const GameRoomPage = () => {
  const { roomCode } = useParams();
  const { state } = useLocation();

  const [isHost, setIsHost] = useState(state?.isHost || false);
  const [playerName, setPlayerName] = useState(state?.playerName || "Player");

  const [calledNumbers, setCalledNumbers] = useState([]);
  const [currentNumber, setCurrentNumber] = useState(null);
  const [ticket, setTicket] = useState(state?.player?.ticket || []); // 3x9 grid
  const [gameStatus, setGameStatus] = useState("WAITING"); // WAITING, PLAYING, PAUSED
  const [msg, setMsg] = useState("");
  const [winners, setWinners] = useState({});

  useEffect(() => {
    // If we refreshed, we might lose state.Ideally should rejoin or fetch state.
    // For now assuming navigation from lobby.

    socket.on("game_started", () => {
      setGameStatus("PLAYING");
      setMsg("Game Started! Good Luck!");
    });

    socket.on("game_paused", () => {
      setGameStatus("PAUSED");
      setMsg("Game Paused by Host");
    });

    socket.on("game_resumed", () => {
      setGameStatus("PLAYING");
      setMsg("Game Resumed!");
    });

    // Handle late join / direct link join response
    socket.on("room_joined", ({ roomCode: rCode, isHost: hostStatus, player, gameStatus: gStatus, calledNumbers: cNumbers }) => {
      // Only if we are in the correct room (sanity check)
      if (rCode === roomCode) {
        setTicket(player.ticket);
        setIsHost(hostStatus);
        setGameStatus(gStatus || "WAITING");
        if (cNumbers) setCalledNumbers(cNumbers);
        // Hide modal if it's showing
        setShowJoinModal(false);
      }
    });

    socket.on("number_called", ({ number, calledNumbers }) => {
      setCalledNumbers(calledNumbers);
      setCurrentNumber(number);

      const utterance = new SpeechSynthesisUtterance(number.toString());
      speechSynthesis.speak(utterance);
    });

    socket.on("win_announced", ({ pattern, winner, gameStatus }) => {
      setWinners(prev => ({ ...prev, [pattern]: winner }));
      setMsg(`${winner.name} claimed ${pattern}!`);

      if (gameStatus === 'ENDED') {
        setGameStatus('ENDED');
        speechSynthesis.speak(new SpeechSynthesisUtterance("Game Over! Full House Claimed!"));
      } else {
        speechSynthesis.speak(new SpeechSynthesisUtterance(`${winner.name} won ${pattern.replace('_', ' ')}`));
      }
    });

    socket.on("claim_rejected", ({ message }) => {
      alert(`Claim Rejected: ${message}`);
    });

    socket.on("error", ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off("game_started");
      socket.off("game_paused");
      socket.off("game_resumed");
      socket.off("room_joined");
      socket.off("number_called");
      socket.off("win_announced");
      socket.off("claim_rejected");
      socket.off("error");
    };
  }, [roomCode]);

  const handleStartGame = () => {
    socket.emit("start_game", { roomCode });
  };

  const callNextNumber = () => {
    socket.emit("call_number", { roomCode });
  };

  const pauseGame = () => {
    socket.emit("pause_game", { roomCode });
  };

  const resumeGame = () => {
    socket.emit("resume_game", { roomCode });
  };

  const claimWin = (pattern) => {
    socket.emit("claim_win", { roomCode, pattern });
  };

  const handleNewGame = () => {
    window.location.href = "/";
  };

  // --- DIRECT LINK HANDLING ---
  const [showJoinModal, setShowJoinModal] = useState(!state?.playerName);
  const [newPlayerName, setNewPlayerName] = useState("");

  const handleManualJoin = () => {
    if (!newPlayerName) return;
    setPlayerName(newPlayerName);
    socket.emit("join_room", { roomCode, playerName: newPlayerName });
  };

  const patterns = [
    { key: "EARLY_FIVE", label: "Early 5" },
    { key: "TOP_ROW", label: "Top Row" },
    { key: "MIDDLE_ROW", label: "Middle Row" },
    { key: "BOTTOM_ROW", label: "Bottom Row" },
    { key: "FOUR_CORNERS", label: "4 Corners" },
    { key: "FULL_HOUSE", label: "Full House" },
  ];

  if (showJoinModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50 px-4">
        <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
          <h2 className="text-2xl font-bold text-center mb-6">Join Room: {roomCode}</h2>
          <input
            type="text"
            placeholder="Enter Your Name"
            className="w-full border rounded-lg px-4 py-2 mb-4"
            value={newPlayerName}
            onChange={e => setNewPlayerName(e.target.value)}
          />
          <button
            onClick={handleManualJoin}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700"
          >
            Join Game
          </button>
        </div>
      </div>
    );
  }

  if (gameStatus === "ENDED") {
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center">
          <h1 className="text-4xl font-bold text-indigo-700 mb-6">Game Over!</h1>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Winners List</h2>
          <div className="space-y-3 mb-8 text-left">
            {patterns.map(p => (
              <div key={p.key} className="flex justify-between items-center border-b pb-2">
                <span className="font-medium text-gray-600">{p.label}</span>
                <div className="text-right">
                  {winners[p.key] ? (
                    <span className="font-bold text-green-600">{winners[p.key].name}</span>
                  ) : (
                    <span className="text-gray-400 text-sm">Unclaimed</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleNewGame}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-indigo-700 transition"
          >
            Start New Game
          </button>
        </div>
      </div>
    );
  }

  const copyInviteLink = () => {
    // We want the link to be able to auto-join.
    // The link should be: /lobby?mode=join&code=ROOMCODE
    // But we are currently on /game/ROOMCODE
    // If we just copy current URL, it goes to GameRoomPage.
    // Does GameRoomPage handle "guest who is not joined"?
    // It checks showJoinModal = !state?.playerName.
    // If I open /game/ABC directly, state is undefined. So showJoinModal is true.
    // It shows "Join Room: ABC" and name input.
    // handleManualJoin emits "join_room".
    // So actually, the current URL IS ALREADY A VALID INVITE LINK!
    // No need to change it to /lobby...
    
    navigator.clipboard.writeText(window.location.href);
    alert("Game Link Copied! Share this with your friends.");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Room: {roomCode}</h1>
            <button
              onClick={copyInviteLink}
              className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold hover:bg-blue-200"
              title="Copy Link to Clipboard"
            >
              Copy Link
            </button>
          </div>
          <p className="text-sm text-gray-600">
            {isHost ? "Host" : "Player"} · {playerName}
          </p>
        </div>

        {isHost && gameStatus === "WAITING" && (
          <button
            onClick={handleStartGame}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
          >
            Start Game
          </button>
        )}

        {isHost && gameStatus === "PLAYING" && (
          <div className="flex gap-2">
            <button
              onClick={pauseGame}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-600"
            >
              Pause
            </button>
            <button
              onClick={callNextNumber}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700"
            >
              Call Number
            </button>
          </div>
        )}

        {isHost && gameStatus === "PAUSED" && (
          <button
            onClick={resumeGame}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
          >
            Resume Game
          </button>
        )}
      </div>

      {msg && (
        <div className="bg-yellow-100 p-2 mb-4 rounded text-center text-yellow-800 font-bold animate-pulse">
          {msg}
        </div>
      )}

      {/* Current Number */}
      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
          {currentNumber ?? "--"}
        </div>
      </div>

      {/* Called Numbers Board (Small view) */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Called Numbers</h3>
        <div className="flex flex-wrap gap-1">
          {calledNumbers.sort((a, b) => a - b).map(n => (
            <span key={n} className="bg-green-500 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full">
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* Ticket */}
      <div className="bg-white rounded-xl p-4 shadow-lg mb-6 overflow-x-auto">
        <h2 className="text-center font-bold mb-4">Your Ticket</h2>
        <div className="min-w-[600px]">
          {ticket.map((row, rIdx) => (
            <div key={rIdx} className="grid grid-cols-9 gap-1 border-b last:border-b-0">
              {row.map((num, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`h-12 flex items-center justify-center border-r last:border-r-0 font-bold ${num === 0 ? "bg-gray-100" :
                    calledNumbers.includes(num) ? "bg-green-200 text-green-800" : "bg-white"
                    }`}
                >
                  {num !== 0 ? num : ""}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Claim Buttons (Fixed Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg overflow-x-auto">
        <div className="flex space-x-2 min-w-max px-2">
          {patterns.map(p => (
            <button
              key={p.key}
              onClick={() => claimWin(p.key)}
              disabled={!!winners[p.key] || gameStatus !== "PLAYING"}
              className={`px-4 py-2 rounded-full text-sm font-bold shadow ${winners[p.key]
                ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                }`}
            >
              {p.label}
              {winners[p.key] && <span className="block text-xs font-normal">({winners[p.key].name})</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameRoomPage;
