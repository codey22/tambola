import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 px-4 text-white font-sans">
      
      {/* Logo / Title */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-500 to-indigo-400 drop-shadow-lg">
          Tambola
        </h1>
        <p className="mt-4 text-lg md:text-xl text-indigo-200 font-light tracking-wide">
          The Next-Gen Multiplayer Housie Experience
        </p>
      </motion.div>

      {/* Action Buttons */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm space-y-4 z-10"
      >
        <button
          onClick={() => navigate("/lobby?mode=create")}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold text-xl shadow-xl hover:scale-105 transition transform active:scale-95 border border-white/20"
        >
          Create Room
        </button>

        <button
          onClick={() => navigate("/lobby?mode=join")}
          className="w-full py-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white font-bold text-xl hover:bg-white/20 transition transform hover:scale-105 active:scale-95 shadow-lg"
        >
          Join Room
        </button>
      </motion.div>

      {/* Rules Section */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12 w-full max-w-2xl bg-white/5 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl"
      >
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-indigo-200 flex items-center gap-2">
          <span>📜</span> Game Rules
        </h2>

        <ul className="space-y-3 text-sm md:text-base text-gray-300">
          <li className="flex gap-2">
            <span className="text-pink-500 font-bold">1.</span>
            <span>Numbers are called <strong>automatically every 10 seconds</strong>.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-pink-500 font-bold">2.</span>
            <span><strong>Speed is Key!</strong> You must mark the number while it is active.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-pink-500 font-bold">3.</span>
            <span>If you miss marking a number, it gets <strong>locked forever</strong>!</span>
          </li>
          <li className="flex gap-2">
            <span className="text-pink-500 font-bold">4.</span>
            <span>Claim winning patterns (Early 5, Rows, Full House) to win.</span>
          </li>
        </ul>
      </motion.div>

      {/* Footer */}
      <footer className="mt-12 text-xs text-indigo-400 opacity-60">
        © {new Date().getFullYear()} Tambola Live
      </footer>
    </div>
  );
};

export default LandingPage;
