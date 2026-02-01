const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const gameManager = require('./game/GameManager');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity in dev
        methods: ["GET", "POST"]
    }
});

const path = require('path');

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', ({ playerName, maxPlayers, ticketCount }) => {
        const room = gameManager.createRoom(socket.id, playerName, maxPlayers, ticketCount);
        socket.join(room.code);

        socket.emit('room_created', {
            roomCode: room.code,
            isHost: true,
            player: room.players.get(socket.id)
        });
    });

    socket.on('join_room', ({ roomCode, playerName }) => {
        const result = gameManager.joinRoom(roomCode, socket.id, playerName);

        if (result.error) {
            socket.emit('error', { message: result.error });
            return;
        }

        socket.join(roomCode);

        // Notify user
        socket.emit('room_joined', {
            roomCode: roomCode,
            isHost: false,
            player: result.player,
            players: Array.from(result.room.players.values()),
            gameStatus: result.gameState.status,
            calledNumbers: result.gameState.calledNumbers
        });

        // Notify room
        io.to(roomCode).emit('player_joined', {
            player: result.player,
            players: Array.from(result.room.players.values())
        });
    });

    socket.on('start_game', ({ roomCode }) => {
        // Callback function to allow GameManager to emit events asynchronously
        const emitCallback = (rCode, event, data) => {
            io.to(rCode).emit(event, data);
        };

        const result = gameManager.startGame(roomCode, socket.id, emitCallback);
        if (result.error) {
            socket.emit('error', { message: result.error });
            return;
        }

        const room = gameManager.rooms.get(roomCode); 
        
        io.to(roomCode).emit('game_started', {
            status: 'PLAYING'
        });
    });

    socket.on('call_number', ({ roomCode }) => {
        // Manual calls are disabled in GameManager, this will return error
        const result = gameManager.callNumber(roomCode, socket.id);
        if (result.error) {
            socket.emit('error', { message: result.error });
            return;
        }
    });

    socket.on('pause_game', ({ roomCode }) => {
        const result = gameManager.pauseGame(roomCode, socket.id);
        if (result.error) {
            socket.emit('error', { message: result.error });
            return;
        }

        io.to(roomCode).emit('game_paused', {
            status: result.status
        });
    });

    socket.on('resume_game', ({ roomCode }) => {
        // Pass callback to emit 'number_called'
        const emitCallback = (room, event, data) => {
            io.to(room).emit(event, data);
        };

        const result = gameManager.resumeGame(roomCode, socket.id, emitCallback);
        if (result.error) {
            socket.emit('error', { message: result.error });
            return;
        }

        io.to(roomCode).emit('game_resumed', {
            status: result.status
        });
    });

    socket.on('end_game', ({ roomCode }) => {
        const result = gameManager.endGame(roomCode, socket.id);
        if (result.error) {
            socket.emit('error', { message: result.error });
            return;
        }

        io.to(roomCode).emit('game_ended', {
            message: "Game Ended by Host"
        });
    });

    socket.on('claim_win', ({ roomCode, pattern }) => {
        const result = gameManager.claimWin(roomCode, socket.id, pattern);
        if (result.error) {
            socket.emit('claim_rejected', { message: result.error, pattern });
            return;
        }

        io.to(roomCode).emit('win_announced', {
            pattern,
            winner: result.winner,
            gameStatus: result.gameStatus
        });
    });

    socket.on('disconnect', () => {
        const result = gameManager.handleDisconnect(socket.id);
        if (result && result.room) {
            io.to(result.roomCode).emit('player_left', {
                players: Array.from(result.room.players.values())
            });
        }
        console.log('User disconnected:', socket.id);
    });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
