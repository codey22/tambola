const { generateTicket } = require('../utils/ticketGenerator');
const { checkPatterns } = require('../utils/patternChecker');

class GameManager {
    constructor() {
        this.rooms = new Map(); // roomCode -> RoomObject
        this.socketRoomMap = new Map(); // socketId -> roomCode
    }

    createRoom(socketId, playerName, maxPlayers) {
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const room = {
            code: roomCode,
            hostId: socketId,
            maxPlayers: parseInt(maxPlayers) || 10,
            players: new Map(), // socketId -> Player
            calledNumbers: [],
            status: 'WAITING', // WAITING, PLAYING, ENDED
            winners: {} // pattern -> { player: name, socketId: id }
        };

        // Add host as player
        const hostTicket = generateTicket();
        room.players.set(socketId, {
            id: socketId,
            name: playerName,
            ticket: hostTicket,
            isHost: true
        });

        this.rooms.set(roomCode, room);
        this.socketRoomMap.set(socketId, roomCode);

        return room;
    }

    joinRoom(roomCode, socketId, playerName) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };
        if (room.players.size >= room.maxPlayers) return { error: "Room is full" };

        const ticket = generateTicket();
        room.players.set(socketId, {
            id: socketId,
            name: playerName,
            ticket: ticket,
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

    startGame(roomCode, socketId) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };
        if (room.hostId !== socketId) return { error: "Only host can start game" };

        room.status = 'PLAYING';
        return { success: true };
    }

    pauseGame(roomCode, socketId) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };
        if (room.hostId !== socketId) return { error: "Only host can pause game" };
        if (room.status !== 'PLAYING') return { error: "Game is not playing" };

        room.status = 'PAUSED';
        return { success: true, status: room.status };
    }

    resumeGame(roomCode, socketId) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };
        if (room.hostId !== socketId) return { error: "Only host can resume game" };
        if (room.status !== 'PAUSED') return { error: "Game is not paused" };

        room.status = 'PLAYING';
        return { success: true, status: room.status };
    }

    callNumber(roomCode, socketId) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };
        if (room.hostId !== socketId) return { error: "Only host can call numbers" };
        if (room.status === 'PAUSED') return { error: "Game is paused" };
        if (room.status !== 'PLAYING') return { error: "Game not in progress" };

        // Generate next random number 1-90 not in calledNumbers
        const allNums = Array.from({ length: 90 }, (_, i) => i + 1);
        const available = allNums.filter(n => !room.calledNumbers.includes(n));

        if (available.length === 0) return { error: "All numbers called" };

        const nextNum = available[Math.floor(Math.random() * available.length)];
        room.calledNumbers.push(nextNum);

        return { number: nextNum, calledNumbers: room.calledNumbers };
    }

    claimWin(roomCode, socketId, pattern) {
        const room = this.rooms.get(roomCode);
        if (!room) return { error: "Room not found" };

        // Check if already claimed
        if (room.winners[pattern]) return { error: "Pattern already claimed" };

        const player = room.players.get(socketId);
        if (!player) return { error: "Player not found" };

        const checks = checkPatterns(player.ticket, room.calledNumbers);

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
