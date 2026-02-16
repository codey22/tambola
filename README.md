# 🎱 Tambola: The Next-Gen Multiplayer Housie

Welcome to **Tambola**, a high-energy, real-time multiplayer version of the classic Indian game "Housie" or "Bingo". Built with modern web technologies, this project offers a seamless, automated, and competitive experience for players worldwide.

---

## 📖 Table of Contents
1. [Overview (Non-Technical)](#-overview-non-technical)
2. [How It Works (For Players)](#-how-it-works-for-players)
3. [Key Features](#-key-features)
4. [Tech Stack](#-tech-stack)
5. [Getting Started](#-getting-started)
6. [Project Structure](#-project-structure)
7. [How It Works (Technical Flow)](#-how-it-works-technical-flow)
8. [Game Rules & Logic](#-game-rules--logic)
9. [Socket.io API Reference](#-socketio-api-reference)

---

## 🌟 Overview (Non-Technical)
Tambola is a digital version of the popular social game where players mark numbers on a ticket as they are called out. 

**Wait, what makes this version different?**
Unlike traditional physical games, this app handles everything for you:
- **Automatic Calling**: No more manual number drawing. The server calls a new number every 10 seconds.
- **Speed Matters**: You must mark the number while it's active. If you miss it, you can't mark it later!
- **Instant Win Validation**: No more arguments over "Full House". The system verifies wins instantly based on the numbers called.

---

## 🕹️ How It Works (For Players)
Getting started with Tambola is easy! Here is the step-by-step journey:

1. **Create or Join**: On the landing page, click **Create Room** if you want to host, or **Join Room** if you have a code from a friend.
2. **Setup (Host Only)**: If you are the host, you can choose how many people can join and how many tickets each person gets.
3. **Invite Friends**: Copy the room code or invite link and send it to your friends.
4. **Start the Fun**: Once everyone is in, the host clicks **Start**. 
5. **Mark Your Ticket**: Every 10 seconds, a new number appears in the big yellow ball. **Tap the number on your ticket** as soon as you see it!
6. **Claim Your Prize**: If you complete a row or a pattern, click the corresponding button (like "Early 5" or "Full House") immediately to claim your win!
7. **Win & Celebrate**: The first person to claim the pattern correctly wins. The game ends when someone claims a "Full House".

---

## ✨ Key Features
- **Real-Time Multiplayer**: Create or join rooms with a unique 6-character code.
- **Automated Host Controls**: The host can pause, resume, or end the game at any time.
- **Interactive Tickets**: Beautiful UI with mobile-responsive design (Landscape mode optimized).
- **Game Chat**: Real-time communication with other players in the room.
- **Voice Notifications**: Built-in text-to-speech announces numbers as they are called.
- **Scoreboard**: Automatic point calculation and winner tracking.

---

## 🛠 Tech Stack
| Component | Technology |
|---|---|
| **Frontend** | React (v19), Framer Motion (Animations), Tailwind CSS (Styling) |
| **Backend** | Node.js, Express |
| **Real-time** | Socket.io |
| **Utilities** | Canvas-confetti (UI effects) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (>= 18.0.0)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd tambola
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *This command runs both the frontend and the backend simultaneously using `concurrently`.*

---

## 📁 Project Structure
```text
tambola/
├── backend/            # (Optional/Legacy) Secondary backend logic
├── game/               # Core Game Logic
│   └── GameManager.js  # Central authority for rooms, players, and state
├── public/             # Static assets
├── src/                # Frontend React Code
│   ├── components/     # Reusable UI components
│   ├── pages/          # Full page views (Landing, Lobby, GameRoom)
│   ├── services/       # Socket.io client setup
│   └── utils/          # Frontend helpers
├── utils/              # Shared Backend Utilities
│   ├── ticketGenerator.js # Logic for generating 3x9 tickets
│   └── patternChecker.js  # Logic for validating winning patterns
├── server.js           # Main Entry Point (Express + Socket.io)
└── package.json        # Dependencies and scripts
```

---

## 🔄 How It Works (Technical Flow)

### 1. User Journey
1. **Landing Page**: User chooses to "Create" or "Join" a room.
2. **Lobby Page**: Host configures game settings (max players, tickets per player). Players enter their names and join the room.
3. **Game Room**: The main arena where the ticket is displayed, numbers are called, and chat happens.

### 2. Socket.io Event Flow
The game relies on a series of real-time events between the client and server:

- **Room Setup**: `create_room` (Client) -> `room_created` (Server)
- **Joining**: `join_room` -> `room_joined` + `player_joined` (broadcast to others)
- **Game Control**: `start_game` -> `game_started`
- **Number Calling**: Every 10s, the server emits `number_called`.
- **Winning**: `claim_win` -> `win_announced` (if valid) or `claim_rejected` (if "bogus").
- **Chat**: `send_message` -> `receive_message`.

---

## ⚖️ Game Rules & Logic

### Ticket Generation
Tickets are generated using a standard **3x9 grid algorithm**:
- **Columns**: 9 columns (1-9, 10-19, ..., 80-90).
- **Numbers per Column**: At least 1 number in every column.
- **Numbers per Row**: Exactly 5 numbers per row.
- **Total Numbers**: 15 numbers per ticket.

### Winning Patterns
1. **Early Five**: First player to mark any 5 numbers.
2. **Top Row**: All 5 numbers in the top row marked.
3. **Middle Row**: All 5 numbers in the middle row marked.
4. **Bottom Row**: All 5 numbers in the bottom row marked.
5. **4 Corners**: First and last numbers of the Top and Bottom rows.
6. **Full House**: All 15 numbers on the ticket marked.

> [!IMPORTANT]
> **Anti-Cheat Logic**: The server tracks which numbers have been called. If a player tries to claim a win with a number that hasn't been announced yet, the server rejects it as a "Bogus Claim".

---

## 📡 Socket.io API Reference

### Client-to-Server
| Event | Payload | Description |
|---|---|---|
| `create_room` | `{playerName, maxPlayers, ticketCount}` | Creates a new room and returns a room code. |
| `join_room` | `{roomCode, playerName}` | Joins an existing room. |
| `start_game` | `{roomCode}` | (Host Only) Starts the auto-call timer. |
| `claim_win` | `{roomCode, pattern}` | Player claims a winning pattern. |
| `send_message`| `{roomCode, message, playerName}`| Sends a chat message. |

### Server-to-Client
| Event | Payload | Description |
|---|---|---|
| `number_called`| `{number, calledNumbers, timeLeft}`| Announces a new number. |
| `win_announced`| `{pattern, winner, gameStatus}`| Announces a winner to the entire room. |
| `game_paused`  | `{status}` | Notifies that the host paused the game. |
| `player_left`  | `{players}` | Updates the player list when someone disconnects. |

---

Developed with ❤️ for the Tambola Community. Happy Gaming! 🎱
