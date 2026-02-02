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
            disconnectedPlayers: new Map(), // playerName -> { playerObj, disconnectTime }
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

        // Check Rejoin Eligibility
        if (room.disconnectedPlayers.has(playerName)) {
            const disconnectedData = room.disconnectedPlayers.get(playerName);
            const timeElapsed = Date.now() - disconnectedData.disconnectTime;

            if (timeElapsed <= 15000) { // 15 seconds window
                 // Rejoin allowed
                 const player = disconnectedData.player;
                 player.id = socketId; // Update socket ID
                 
                 room.players.set(socketId, player);
                 room.disconnectedPlayers.delete(playerName);
                 this.socketRoomMap.set(socketId, roomCode);
                 
                 return { room, player, gameState: { status: room.status, calledNumbers: room.calledNumbers } };
            } else {
                // Time expired
                room.disconnectedPlayers.delete(playerName); // Clean up
                return { error: "Rejoin time expired. You cannot join this game anymore." };
            }
        }

        if (room.status !== 'WAITING') return { error: "Game already started" };
        if (room.players.size >= room.maxPlayers) return { error: "Room is full" };

        // Check for duplicate names
        for (const p of room.players.values()) {
            if (p.name === playerName) return { error: "Name taken" };
        }

        const tickets = Array.from({ length: room.ticketCount }, () => generateTicket());
        const player = {
            id: socketId,
            name: playerName,
            tickets: tickets,
            isHost: false
        };

        room.players.set(socketId, player);
        this.socketRoomMap.set(socketId, roomCode);

        return { room, player, gameState: { status: room.status, calledNumbers: room.calledNumbers } };
    }

    startGame(roomCode, socketId, emitCallback) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };
        if (room.hostId !== socketId) return { error: "Only host can start game" };

        room.status = 'PLAYING';
        this.startAutoCall(room, emitCallback);

        return { success: true };
    }

    startAutoCall(room, emitCallback) {
        if (room.autoCallInterval) clearInterval(room.autoCallInterval);

        // Call immediately to start
        this.performAutoCall(room, emitCallback);

        room.autoCallInterval = setInterval(() => {
            if (room.status === 'PLAYING') {
                this.performAutoCall(room, emitCallback);
            }
        }, 10000); // 10 seconds
    }

    performAutoCall(room, emitCallback) {
        const allNums = Array.from({ length: 90 }, (_, i) => i + 1);
        const available = allNums.filter(n => !room.calledNumbers.includes(n));

        if (available.length === 0) {
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
        if (room.autoCallInterval) clearInterval(room.autoCallInterval);
        
        return { success: true, status: room.status };
    }

    resumeGame(roomCode, socketId, emitCallback) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };
        if (room.hostId !== socketId) return { error: "Only host can resume game" };
        if (room.status !== 'PAUSED') return { error: "Game is not paused" };

        room.status = 'PLAYING';
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

    callNumber(roomCode, socketId) {
         return { error: "Auto-calling is enabled. Manual calls disabled." };
    }

    claimWin(roomCode, socketId, pattern) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };

        if (room.winners[pattern]) return { error: "Pattern already claimed" };

        const player = room.players.get(socketId);
        if (!player) return { error: "Player not found" };

        let hasWon = false;
        const tickets = player.tickets || [player.ticket];

        for (const ticket of tickets) {
            const checks = checkPatterns(ticket, room.calledNumbers);
            
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
            const player = room.players.get(socketId);
            
            if (player) {
                // If game is in progress (PLAYING/PAUSED), move to disconnected list
                if (room.status === 'PLAYING' || room.status === 'PAUSED') {
                    room.disconnectedPlayers.set(player.name, {
                        player: player,
                        disconnectTime: Date.now()
                    });
                }
                
                room.players.delete(socketId);
                this.socketRoomMap.delete(socketId);

                // If room is empty and no disconnected players waiting, delete it
                if (room.players.size === 0 && room.disconnectedPlayers.size === 0) {
                    this.rooms.delete(roomCode);
                } else if (room.players.size === 0) {
                     // Cleanup after 20s if only disconnected players remain
                     setTimeout(() => {
                         if (this.rooms.has(roomCode) && this.rooms.get(roomCode).players.size === 0) {
                             this.rooms.delete(roomCode);
                         }
                     }, 20000); // 20s cleanup
                }
                
                return { roomCode, room };
            }
        }
    }
}

module.exports = new GameManager();