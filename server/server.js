const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http').createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const io = require('socket.io')(http, {
    cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors());

const sessions = new Map();
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_game', (username) => {
        const roomId = Math.random().toString(36).substring(7);
        const session = {
            id: roomId,
            creator: {
                id: socket.id,
                username,
                points: 300,
                ready: false
            },
            opponent: null,
            status: 'waiting',
            currentRound: null
        };

        rooms.set(roomId, session);
        socket.join(roomId);
        sessions.set(socket.id, roomId);
        socket.emit('game_created', { roomId, session });
    });

    socket.on('join_game', ({ roomId, username }) => {
        const session = rooms.get(roomId);
        if (!session) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        if (session.opponent) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }

        session.opponent = {
            id: socket.id,
            username,
            points: 300,
            ready: false
        };
        session.status = 'playing';

        sessions.set(socket.id, roomId);
        socket.join(roomId);
        rooms.set(roomId, session);

        io.to(roomId).emit('player_joined', { session });
    });

    socket.on('make_move', ({ choice, bet }) => {
        const roomId = sessions.get(socket.id);
        if (!roomId) return;

        const session = rooms.get(roomId);
        if (!session || session.status !== 'playing') return;

        if (!session.currentRound) {
            session.currentRound = {
                moves: {},
                bet
            };
        }

        session.currentRound.moves[socket.id] = { choice, bet };

        if (Object.keys(session.currentRound.moves).length === 2) {
            const creatorMove = session.currentRound.moves[session.creator.id];
            const opponentMove = session.currentRound.moves[session.opponent.id];
            const result = determineWinner(creatorMove.choice, opponentMove.choice);

            if (result !== 'tie') {
                const winner = result === 'creator' ? session.creator : session.opponent;
                const loser = result === 'creator' ? session.opponent : session.creator;
                winner.points += bet;
                loser.points -= bet;
            }

            io.to(roomId).emit('round_completed', {
                session,
                result,
                moves: { creator: creatorMove, opponent: opponentMove }
            });

            session.currentRound = null;

            if (session.creator.points <= 0 || session.opponent.points <= 0) {
                session.status = 'finished';
                io.to(roomId).emit('game_finished', { session });
            }
        } else {
            const waitingPlayerId = session.creator.id === socket.id
                ? session.creator.id
                : session.opponent.id;
            io.to(waitingPlayerId).emit('waiting_for_move');
        }

        rooms.set(roomId, session);
    });

    socket.on('disconnect', () => {
        const roomId = sessions.get(socket.id);
        if (roomId) {
            const session = rooms.get(roomId);
            if (session) {
                io.to(roomId).emit('player_disconnected', { playerId: socket.id });
                rooms.delete(roomId);
            }
            sessions.delete(socket.id);
        }
    });
});

function determineWinner(choice1, choice2) {
    if (choice1 === choice2) return 'tie';
    const rules = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
    return rules[choice1] === choice2 ? 'creator' : 'opponent';
}

const PORT = process.env.PORT || 3001;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});