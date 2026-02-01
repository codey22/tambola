import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import socket from "../services/socket";
import { motion, AnimatePresence } from "framer-motion";

// Helper for local storage persistence
const useStickyState = (defaultValue, key) => {
  const [value, setValue] = useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
};

const GameRoomPage = () => {
  const { roomCode } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [isHost, setIsHost] = useState(state?.isHost || false);
  const [playerName, setPlayerName] = useState(state?.playerName || "Player");

  // Game State
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [currentNumber, setCurrentNumber] = useState(null);
  const [tickets, setTickets] = useState(state?.player?.tickets || (state?.player?.ticket ? [state.player.ticket] : [])); 
  const [gameStatus, setGameStatus] = useState("WAITING"); 
  const [msg, setMsg] = useState("");
  const [winners, setWinners] = useState({});
  const [playersList, setPlayersList] = useState([]);

  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);

  // Manual Marking State (Persisted to survive refreshes)
  const [markedNumbers, setMarkedNumbers] = useStickyState([], `tambola_marks_${roomCode}`);

  // Join Modal State
  const [showJoinModal, setShowJoinModal] = useState(!state?.playerName);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [joinError, setJoinError] = useState("");

  // Refs for audio
  const speakNumber = (num) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(num.toString());
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    // 1. Listeners
    socket.on("game_started", () => {
      setGameStatus("PLAYING");
      setMsg("Game Started! Eyes on the screen!");
    });

    socket.on("game_paused", () => {
      setGameStatus("PAUSED");
      setMsg("Game Paused by Host");
    });

    socket.on("game_resumed", () => {
      setGameStatus("PLAYING");
      setMsg("Game Resumed!");
    });

    socket.on("player_joined", ({ players }) => {
       setPlayersList(players);
    });
    
    socket.on("player_left", ({ players }) => {
       setPlayersList(players);
    });

    socket.on("room_joined", ({ roomCode: rCode, isHost: hostStatus, player, players, gameStatus: gStatus, calledNumbers: cNumbers }) => {
      if (rCode === roomCode) {
        setTickets(player.tickets || [player.ticket]);
        setIsHost(hostStatus);
        setGameStatus(gStatus || "WAITING");
        if (cNumbers) setCalledNumbers(cNumbers);
        if (players) setPlayersList(players);
        setShowJoinModal(false);
      }
    });

    socket.on("number_called", ({ number, calledNumbers, timeLeft: serverTimeLeft }) => {
      setCalledNumbers(calledNumbers);
      setCurrentNumber(number);
      setTimeLeft(serverTimeLeft || 10);
      speakNumber(number);
    });

    socket.on("win_announced", ({ pattern, winner, gameStatus }) => {
      setWinners(prev => ({ ...prev, [pattern]: winner }));
      setMsg(`${winner.name} claimed ${pattern.replace('_', ' ')}!`);
      
      if (gameStatus === 'ENDED') {
        setGameStatus('ENDED');
      }
    });
    
    socket.on("game_ended", ({ message }) => {
        setGameStatus('ENDED');
        setMsg(message);
    });

    socket.on("claim_rejected", ({ message }) => {
      alert(`Claim Rejected: ${message}`);
    });

    socket.on("error", ({ message }) => {
      if (message.includes("Full")) {
          setJoinError(message);
      } else {
          alert(message);
      }
    });

    return () => {
      socket.off("game_started");
      socket.off("game_paused");
      socket.off("game_resumed");
      socket.off("player_joined");
      socket.off("player_left");
      socket.off("room_joined");
      socket.off("number_called");
      socket.off("win_announced");
      socket.off("game_ended");
      socket.off("claim_rejected");
      socket.off("error");
    };
  }, [roomCode]);

  // Timer Effect
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Actions
  const handleStartGame = () => socket.emit("start_game", { roomCode });
  const pauseGame = () => socket.emit("pause_game", { roomCode });
  const resumeGame = () => socket.emit("resume_game", { roomCode });
  const endGame = () => {
      if(window.confirm("Are you sure you want to end the game for everyone?")) {
          socket.emit("end_game", { roomCode });
      }
  };
  const claimWin = (pattern) => socket.emit("claim_win", { roomCode, pattern });
  const handleNewGame = () => window.location.href = "/";

  const handleManualJoin = () => {
    if (!newPlayerName) return;
    setPlayerName(newPlayerName);
    socket.emit("join_room", { roomCode, playerName: newPlayerName });
  };

  const copyInviteLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert("Game Link Copied! Share this URL with your friends to join.");
    } catch (err) {
      alert("Failed to copy link manually.");
    }
  };

  const handleNumberClick = (num) => {
    if (gameStatus !== 'PLAYING') return;
    if (num === 0) return;
    
    // Strict Rule: Can only mark current number within time limit
    if (num !== currentNumber) return;
    if (timeLeft <= 0) return;
    
    if (!markedNumbers.includes(num)) {
      setMarkedNumbers(prev => [...prev, num]);
    }
  };

  // Winning Patterns
  const patterns = [
    { key: "EARLY_FIVE", label: "Early 5" },
    { key: "TOP_ROW", label: "Top Row" },
    { key: "MIDDLE_ROW", label: "Middle Row" },
    { key: "BOTTOM_ROW", label: "Bottom Row" },
    { key: "FOUR_CORNERS", label: "4 Corners" },
    { key: "FULL_HOUSE", label: "Full House" },
  ];

  // --- RENDER HELPERS ---

  // Render Full Screen Join Error
  if (joinError) {
      return (
          <div className="min-h-screen bg-red-900 text-white flex items-center justify-center p-4">
              <div className="text-center">
                  <h1 className="text-3xl font-bold mb-4">⚠️ Access Denied</h1>
                  <p className="text-xl">{joinError}</p>
                  <button onClick={() => navigate('/')} className="mt-8 bg-white text-red-900 px-6 py-2 rounded-full font-bold">Go Home</button>
              </div>
          </div>
      );
  }

  // Render Join Modal
  if (showJoinModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-800 px-4">
        <div className="bg-white/95 backdrop-blur p-8 rounded-2xl shadow-2xl w-full max-w-sm">
          <h2 className="text-2xl font-bold text-center mb-6 text-indigo-900">Join Tambola Room</h2>
          <div className="mb-4 text-center bg-indigo-100 py-2 rounded-lg text-indigo-700 font-mono text-xl tracking-widest">{roomCode}</div>
          <input
            type="text"
            placeholder="Enter Your Name"
            className="w-full border-2 border-indigo-100 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-indigo-500 transition"
            value={newPlayerName}
            onChange={e => setNewPlayerName(e.target.value)}
          />
          <button
            onClick={handleManualJoin}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg"
          >
            Join Game
          </button>
        </div>
      </div>
    );
  }

  // Render Game Over / Scoreboard
  if (gameStatus === "ENDED") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white/95 rounded-3xl shadow-2xl p-8 max-w-2xl w-full text-center border-4 border-yellow-400">
          <h1 className="text-5xl font-extrabold text-indigo-900 mb-2">🏆 Game Over 🏆</h1>
          <p className="text-indigo-600 mb-8 font-medium">Final Scoreboard</p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8 text-left">
            <div className="bg-indigo-50 p-6 rounded-2xl">
                <h3 className="text-xl font-bold mb-4 text-indigo-800 border-b border-indigo-200 pb-2">Winners Hall of Fame</h3>
                <div className="space-y-3">
                    {patterns.map(p => (
                    <div key={p.key} className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">{p.label}</span>
                        <span className={`font-bold ${winners[p.key] ? 'text-green-600' : 'text-gray-400'}`}>
                            {winners[p.key] ? winners[p.key].name : '-'}
                        </span>
                    </div>
                    ))}
                </div>
            </div>
            
            <div className="bg-indigo-50 p-6 rounded-2xl">
                 <h3 className="text-xl font-bold mb-4 text-indigo-800 border-b border-indigo-200 pb-2">All Players</h3>
                 <div className="flex flex-wrap gap-2">
                     {playersList.map(p => (
                         <span key={p.id} className="bg-white px-3 py-1 rounded-full text-sm font-medium text-indigo-600 shadow-sm border">
                             {p.name}
                         </span>
                     ))}
                 </div>
            </div>
          </div>

          <button
            onClick={handleNewGame}
            className="w-full md:w-auto bg-gradient-to-r from-pink-500 to-yellow-500 text-white px-12 py-4 rounded-full font-bold text-xl hover:scale-105 transition shadow-xl"
          >
            Start New Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-2 md:p-6 pb-32 text-white font-sans">
      
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <div className="w-full md:w-auto flex justify-between md:block items-center">
           <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
             <span>🎱</span> Tambola <span className="opacity-50">|</span> <span className="font-mono tracking-wider">{roomCode}</span>
           </h1>
           <p className="md:hidden text-xs text-indigo-200">
             {isHost ? "👑 Host" : "👤 Player"}
           </p>
        </div>
        
        <div className="hidden md:block">
            <p className="text-xs md:text-sm text-indigo-200 mt-1">
                {isHost ? "👑 Host" : "👤 Player"} : <span className="font-bold text-white">{playerName}</span>
            </p>
        </div>

        <div className="flex gap-2 flex-wrap justify-center w-full md:w-auto">
            <button onClick={copyInviteLink} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-bold transition flex-1 md:flex-none whitespace-nowrap">
                Copy Link 📋
            </button>
            {isHost && gameStatus === 'WAITING' && (
                <button onClick={handleStartGame} className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition animate-pulse flex-1 md:flex-none whitespace-nowrap">
                    Start Game ▶
                </button>
            )}
            {isHost && gameStatus === 'PLAYING' && (
                <button onClick={pauseGame} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg transition flex-1 md:flex-none whitespace-nowrap">
                    Pause ⏸
                </button>
            )}
            {isHost && gameStatus === 'PAUSED' && (
                <button onClick={resumeGame} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg transition flex-1 md:flex-none whitespace-nowrap">
                    Resume ▶
                </button>
            )}
            {isHost && (gameStatus === 'PLAYING' || gameStatus === 'PAUSED') && (
                <button onClick={endGame} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg transition flex-1 md:flex-none whitespace-nowrap">
                    End Game ⏹
                </button>
            )}
        </div>
      </div>

      {msg && (
        <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-400/90 text-yellow-900 text-center py-2 px-4 rounded-xl font-bold mb-6 shadow-lg mx-auto max-w-md"
        >
          {msg}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Game Info & Ticket */}
        <div className="lg:col-span-8 space-y-6">
            
            {/* Active Number & Timer Area */}
            <div className="flex items-center justify-center gap-8 py-2">
                 <div className="relative">
                     {/* Timer Ring */}
                     <svg className="w-[100px] h-[100px] transform -rotate-90">
                         <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-indigo-900/50" />
                         <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="8" fill="transparent" 
                            className={`${timeLeft <= 3 ? 'text-red-500' : 'text-green-400'} transition-all duration-1000 ease-linear`}
                            strokeDasharray={2 * Math.PI * 46}
                            strokeDashoffset={2 * Math.PI * 46 * ((10 - timeLeft) / 10)}
                         />
                     </svg>
                     
                     {/* Number Ball */}
                     <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                         <AnimatePresence mode="wait">
                            <motion.div 
                                key={currentNumber || "start"}
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0 }}
                                className="w-[80px] h-[80px] rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 shadow-[0_0_15px_rgba(255,165,0,0.5)] flex items-center justify-center border-4 border-white"
                            >
                                <span className="text-4xl font-black text-white drop-shadow-md">
                                    {currentNumber ?? "?"}
                                </span>
                            </motion.div>
                         </AnimatePresence>
                     </div>
                 </div>
                 
                 <div className="text-center">
                     <p className="text-indigo-200 text-xs uppercase tracking-widest font-bold mb-1">Time</p>
                     <p className={`text-xl font-mono font-bold ${timeLeft <= 3 ? 'text-red-400' : 'text-white'}`}>
                         {gameStatus === 'PLAYING' ? `00:${timeLeft.toString().padStart(2, '0')}` : '--:--'}
                     </p>
                 </div>
            </div>

            {/* TICKET AREA */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Your Tickets ({tickets.length})</h2>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full text-indigo-100">Tap to mark</span>
                </div>
                
                <div className="flex flex-col gap-4">
                    {tickets.map((ticket, tIdx) => (
                        <div key={tIdx} className="space-y-1">
                            <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider pl-1">Ticket #{tIdx + 1}</div>
                            {/* Mobile: Vertical (3 cols), Desktop: Horizontal (9 cols) */}
                            <div className="bg-white rounded-lg border-2 border-indigo-900 overflow-hidden shadow-inner w-full max-w-full">
                                {ticket.map((row, rIdx) => (
                                    <div key={rIdx} className="grid grid-cols-3 md:grid-cols-9 md:h-12 bg-indigo-50 border-b-2 md:border-b-0 md:border-b border-indigo-900/20 last:border-b-0">
                                        {row.map((num, cIdx) => {
                                            const isMarked = markedNumbers.includes(num);
                                            const isCalled = calledNumbers.includes(num);
                                            const isCurrent = num === currentNumber;
                                            const isEmpty = num === 0;
                                            const isMissed = isCalled && !isMarked && !isCurrent;

                                            return (
                                                <div 
                                                    key={`${tIdx}-${rIdx}-${cIdx}`}
                                                    onClick={() => !isEmpty && handleNumberClick(num)}
                                                    className={`
                                                        h-16 md:h-full md:aspect-auto
                                                        border-r border-b border-indigo-200 flex items-center justify-center text-xl md:text-2xl font-black relative transition-all duration-200
                                                        ${isEmpty ? 'bg-indigo-100/50' : 'cursor-pointer hover:bg-indigo-100'}
                                                        ${isMarked ? 'bg-green-500 text-white !border-green-600 scale-95 rounded md:rounded-md m-0.5 md:m-1 shadow-inner' : ''}
                                                        ${isMissed ? 'bg-gray-300 text-gray-500 opacity-50 cursor-not-allowed grayscale' : ''}
                                                        ${isCurrent && !isMarked ? 'bg-yellow-300 text-yellow-900 animate-pulse border-yellow-500 border-2 md:border-4' : ''}
                                                        ${!isEmpty && !isMarked && !isMissed && !isCurrent ? 'text-indigo-900' : ''}
                                                        /* Mobile Grid Borders Fixes */
                                                        ${(cIdx + 1) % 3 === 0 ? 'border-r-0 md:border-r' : ''} 
                                                        ${cIdx >= 6 ? 'border-b-0 md:border-b' : ''}
                                                    `}
                                                >
                                                    {isEmpty ? "" : num}
                                                    {isMarked && (
                                                        <motion.div 
                                                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                            className="absolute inset-0 flex items-center justify-center text-green-200 opacity-30"
                                                        >
                                                            ✓
                                                        </motion.div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Claims Area */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {patterns.map(p => (
                    <button
                        key={p.key}
                        disabled={!!winners[p.key]}
                        onClick={() => claimWin(p.key)}
                        className={`
                            py-3 px-4 rounded-xl font-bold text-sm md:text-base transition shadow-lg
                            ${winners[p.key] 
                                ? 'bg-green-800/50 text-green-200 border border-green-700/50 cursor-default' 
                                : 'bg-white text-indigo-900 hover:bg-indigo-50 hover:scale-105 active:scale-95'
                            }
                        `}
                    >
                        {p.label}
                        {winners[p.key] && <div className="text-xs mt-1 font-normal opacity-75">🏆 {winners[p.key].name}</div>}
                    </button>
                ))}
            </div>

        </div>

        {/* RIGHT COLUMN: Sidebar (Host Controls & History) */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* Players List (Realtime) */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <span>👥</span> Players ({playersList.length})
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {playersList.map(p => (
                        <div key={p.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
                                {p.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm truncate">{p.name} {p.isHost && '👑'}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Host Only: Called Numbers History */}
            {isHost && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span>📜</span> Master Board
                    </h3>
                    <div className="grid grid-cols-10 gap-1">
                        {Array.from({ length: 90 }, (_, i) => i + 1).map(n => (
                            <div 
                                key={n}
                                className={`
                                    aspect-square flex items-center justify-center text-[10px] md:text-xs rounded-full font-bold
                                    ${calledNumbers.includes(n) ? 'bg-green-500 text-white shadow-sm' : 'bg-white/10 text-white/30'}
                                    ${currentNumber === n ? 'ring-2 ring-yellow-400 bg-yellow-400 text-black z-10 scale-125' : ''}
                                `}
                            >
                                {n}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {!isHost && (
                <div className="bg-blue-500/20 rounded-2xl p-6 border border-blue-400/30 text-center">
                    <p className="text-sm text-blue-100">Only the host can see the full number history.</p>
                    <p className="font-bold mt-2">Stay alert & mark fast!</p>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default GameRoomPage;
