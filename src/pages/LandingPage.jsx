import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-600 px-4 text-white">
      
      {/* Logo / Title */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-wide">
          Online Tambola
        </h1>
        <p className="mt-3 text-sm md:text-base opacity-90">
          Play Housie with friends in real time
        </p>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => navigate("/lobby?mode=create")}
          className="w-full py-3 rounded-lg bg-white text-indigo-700 font-semibold text-lg hover:bg-gray-100 transition"
        >
          Create Room
        </button>

        <button
          onClick={() => navigate("/lobby?mode=join")}
          className="w-full py-3 rounded-lg border border-white text-white font-semibold text-lg hover:bg-white hover:text-indigo-700 transition"
        >
          Join Room
        </button>
      </div>

      {/* Rules Section */}

      <div className="mt-8 sm:mt-12 w-full max-w-md sm:max-w-2xl bg-white/10 backdrop-blur rounded-lg sm:rounded-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
          Game Rules
        </h2>

        <ul className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 list-disc list-inside opacity-95">
          <li>Each player gets a 3×9 Tambola ticket with 15 numbers.</li>
          <li>Numbers are called randomly from 1 to 90.</li>
          <li>Mark numbers on your ticket when they are called.</li>
          <li>Claim winning patterns like Early Five, Rows, and Full House.</li>
          <li>The host verifies and announces winners.</li>
        </ul>
      </div>

      {/* Footer */}
      <footer className="mt-10 text-xs opacity-80">
        © {new Date().getFullYear()} OnlineTambola
      </footer>
    </div>
  );
};

export default LandingPage;
