const { generateTicket } = require('../utils/ticketGenerator');
const { checkPatterns } = require('../utils/patternChecker');

class GameManager {
    constructor() {
        this.rooms = new Map(); // roomCode -> RoomObject
        this.socketRoomMap = new Map(); // socketId -> roomCode
    }

    createRoom(socketId, playerName, maxPlayers, ticketCount) {
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const room = {
            code: roomCode,
            hostId: socketId,
            maxPlayers: parseInt(maxPlayers) || 10,
            ticketCount: parseInt(ticketCount) || 1,
            players: new Map(), // socketId -> Player
            calledNumbers: [],
            status: 'WAITING', // WAITING, PLAYING, ENDED, PAUSED
            winners: {}, // pattern -> { player: name, socketId: id }
            autoCallInterval: null, // Timer reference
            currentNumber: null,
            lastCallTime: null
        };

        // Add host as player
        const hostTickets = Array.from({ length: room.ticketCount }, () => generateTicket());
        room.players.set(socketId, {
            id: socketId,
            name: playerName,
            tickets: hostTickets, // Array of tickets
            isHost: true
        });

        this.rooms.set(roomCode, room);
        this.socketRoomMap.set(socketId, roomCode);

        return room;
    }

    joinRoom(roomCode, socketId, playerName) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };
        if (room.status !== 'WAITING') return { error: "Game has already started. You cannot join now." };
        if (room.players.size >= room.maxPlayers) return { error: "This Room Is Full, You Can't Join To This Room" };

        const tickets = Array.from({ length: room.ticketCount }, () => generateTicket());
        room.players.set(socketId, {
            id: socketId,
            name: playerName,
            tickets: tickets,
            isHost: false
        });

        this.socketRoomMap.set(socketId, roomCode);
        return {
            room,
            player: room.players.get(socketId),
            gameState: {
                status: room.status,
                calledNumbers: room.calledNumbers
            }
        };
    }

    // Updated: Accepts callback to emit events to room
    startGame(roomCode, socketId, emitCallback) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };
        if (room.hostId !== socketId) return { error: "Only host can start game" };

        room.status = 'PLAYING';
        
        // Start auto-calling loop
        this.startAutoCall(room, emitCallback);

        return { success: true };
    }

    startAutoCall(room, emitCallback) {
        if (room.autoCallInterval) clearInterval(room.autoCallInterval);

        // Immediate first call or wait? Usually wait 3s then start.
        // Let's call immediately to start the flow.
        this.performAutoCall(room, emitCallback);

        room.autoCallInterval = setInterval(() => {
            if (room.status === 'PLAYING') {
                this.performAutoCall(room, emitCallback);
            }
        }, 10000); // 10 seconds
    }

    performAutoCall(room, emitCallback) {
        // Generate next random number 1-90 not in calledNumbers
        const allNums = Array.from({ length: 90 }, (_, i) => i + 1);
        const available = allNums.filter(n => !room.calledNumbers.includes(n));

        if (available.length === 0) {
            // Game Over or Full House?
            // Stop timer
            if (room.autoCallInterval) clearInterval(room.autoCallInterval);
            room.status = 'ENDED';
             emitCallback(room.code, 'game_ended', { message: "All numbers called!" });
            return;
        }

        const randomIndex = Math.floor(Math.random() * available.length);
        const nextNumber = available[randomIndex];

        room.calledNumbers.push(nextNumber);
        room.currentNumber = nextNumber;
        room.lastCallTime = Date.now();

        // Emit to room
        emitCallback(room.code, 'number_called', {
            number: nextNumber,
            calledNumbers: room.calledNumbers,
            timeLeft: 10
        });
    }

    pauseGame(roomCode, socketId) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };
        if (room.hostId !== socketId) return { error: "Only host can pause game" };
        if (room.status !== 'PLAYING') return { error: "Game is not playing" };

        room.status = 'PAUSED';
        // Clear interval
        if (room.autoCallInterval) clearInterval(room.autoCallInterval);
        
        return { success: true, status: room.status };
    }

    resumeGame(roomCode, socketId, emitCallback) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };
        if (room.hostId !== socketId) return { error: "Only host can resume game" };
        if (room.status !== 'PAUSED') return { error: "Game is not paused" };

        room.status = 'PLAYING';
        // Restart interval
        this.startAutoCall(room, emitCallback);
        
        return { success: true, status: room.status };
    }

    endGame(roomCode, socketId) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };
        if (room.hostId !== socketId) return { error: "Only host can end game" };

        room.status = 'ENDED';
        if (room.autoCallInterval) clearInterval(room.autoCallInterval);
        
        return { success: true, status: room.status };
    }
    
    // Manual call is disabled now, but we keep the method or remove it?
    // User said "Host should NOT manually call numbers".
    // We can keep it but make it return error or do nothing if auto mode is on.
    callNumber(roomCode, socketId) {
         return { error: "Auto-calling is enabled. Manual calls disabled." };
    }

    claimWin(roomCode, socketId, pattern) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };

        // Check if already claimed
        if (room.winners[pattern]) return { error: "Pattern already claimed" };

        const player = room.players.get(socketId);
        if (!player) return { error: "Player not found" };

        // Check patterns on ALL tickets
        let hasWon = false;
        
        // Handle single ticket (legacy) or multiple tickets
        const tickets = player.tickets || [player.ticket];

        for (const ticket of tickets) {
            const checks = checkPatterns(ticket, room.calledNumbers);
            
            // Map claim string to boolean check
            const patternMap = {
                'EARLY_FIVE': checks.earlyFive,
                'TOP_ROW': checks.topRow,
                'MIDDLE_ROW': checks.middleRow,
                'BOTTOM_ROW': checks.bottomRow,
                'FOUR_CORNERS': checks.fourCorners,
                'FULL_HOUSE': checks.fullHouse
            };

            if (patternMap[pattern]) {
                hasWon = true;
                break;
            }
        }

        if (hasWon) {
            room.winners[pattern] = { name: player.name, socketId };

            // Check if Game Over
            if (pattern === 'FULL_HOUSE') {
                room.status = 'ENDED';
            }

            return { success: true, winner: room.winners[pattern], gameStatus: room.status };
        } else {
            return { error: "Bogus claim!" };
        }
    }

    handleDisconnect(socketId) {
        const roomCode = this.socketRoomMap.get(socketId);
        if (!roomCode) return;

        const room = this.rooms.get(roomCode);
        if (room) {
            room.players.delete(socketId);
            this.socketRoomMap.delete(socketId);

            // If host left, maybe assign new host or end game? 
            // For simplicity, if empty, delete room.
            if (room.players.size === 0) {
                this.rooms.delete(roomCode);
            }
            return { roomCode, room };
        }
    }
}

module.exports = new GameManager();
