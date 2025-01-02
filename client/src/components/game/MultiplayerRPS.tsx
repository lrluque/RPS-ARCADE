"use client";

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const socket = io('https://rps-arcade.onrender.com', { transports: ['websocket'], reconnection: true });

type LastResult = {
    result: 'creator' | 'opponent' | 'tie';
    moves: {
        creator: { choice: string; bet: number };
        opponent: { choice: string; bet: number };
    };
};

interface Player {
    id: string;
    username: string;
    points: number;
    ready: boolean;
}

interface GameSession {
    id: string;
    creator: Player;
    opponent: Player | null;
    status: 'waiting' | 'playing' | 'finished';
    currentRound: {
        moves: Record<string, { choice: string; bet: number }>;
        bet: number;
    } | null;
}

type Choice = 'rock' | 'paper' | 'scissors';

type Choices = {
    [K in Choice]: {
        emoji: string;
        beats: Choice;
        weak: Choice;
        name: string;
    }
};


const playSound = (soundPath) => {
    const audio = new Audio(soundPath);
    audio.play();
};

export default function MultiplayerRPS() {
    const [username, setUsername] = useState('');
    const [roomId, setRoomId] = useState('');
    const [gameSession, setGameSession] = useState<GameSession | null>(null);
    const [currentBet] = useState(100);
    const [gameStatus, setGameStatus] = useState('init');
    const [lastResult, setLastResult] = useState<LastResult | null>(null);
    const [error, setError] = useState('');
    const [waitingForOpponent, setWaitingForOpponent] = useState(false);

    const choices: Choices = {
        rock: { emoji: '✊', beats: 'scissors', weak: 'paper', name: 'ROCK' },
        paper: { emoji: '✋', beats: 'rock', weak: 'scissors', name: 'PAPER' },
        scissors: { emoji: '✌️', beats: 'paper', weak: 'rock', name: 'SCISSORS' }
    };

    useEffect(() => {
        socket.on('game_created', ({ roomId, session }) => {
            console.log('Game created:', session);
            setRoomId(roomId);
            setGameSession(session);
            setGameStatus('waiting');
        });

        socket.on('player_joined', ({ session }) => {
            console.log('Player joined:', session);
            setGameSession(session);
            setGameStatus(session.status);
            setWaitingForOpponent(false);
            playSound("/sounds/join_room.wav")
        });

        socket.on("round_completed", ({ session, result, moves }) => {
            setGameSession(session);
            setLastResult({ result, moves });
            setWaitingForOpponent(false);

            if (result === "tie") {
                playSound("/sounds/tie.wav");
            } else if ((result === "creator" && socket.id === session.creator.id) ||
                (result === "opponent" && socket.id !== session.creator.id)) {
                playSound("/sounds/win_round.wav");
            } else {
                playSound("/sounds/lose_round.wav");
            }
        });

        socket.on('waiting_for_move', () => {
            console.log('Waiting for opponent move');
            setWaitingForOpponent(true);
        });

        socket.on('game_finished', ({ session }) => {
            console.log('Game finished');
            setGameSession(session);
            setGameStatus('finished');
            const winner = session.creator.points > session.opponent?.points ? session.creator : session.opponent;
            playSound(winner.id === socket.id ? "/sounds/win_game.wav" : "/sounds/lose_game.wav");
        });

        socket.on('player_disconnected', () => {
            setError('Opponent disconnected');
            setGameStatus('finished');
        });

        socket.on('error', (error) => {
            setError(error.message);
        });

        return () => {
            socket.off('game_created');
            socket.off('player_joined');
            socket.off('round_completed');
            socket.off('waiting_for_move');
            socket.off('game_finished');
            socket.off('player_disconnected');
            socket.off('error');
        };
    }, []);

    const createGame = () => {
        if (!username) {
            setError('Please enter your name');
            return;
        }
        socket.emit('create_game', username.toUpperCase());
    };

    const joinGame = () => {
        if (!username || !roomId) {
            setError('Please enter your name and room code');
            return;
        }
        socket.emit('join_game', {
            roomId: roomId.toLowerCase(),
            username: username.toUpperCase()
        });
    };

    const makeChoice = (choice: Choice) => {
        if (gameSession?.status === 'playing') {
            socket.emit('make_move', { choice, bet: currentBet });
            setWaitingForOpponent(true);
            playSound("/sounds/button.wav")
        }
    };

    const getPlayerInfo = () => {
        if (!gameSession) return null;
        const isCreator = socket.id === gameSession.creator.id;
        return {
            player: isCreator ? gameSession.creator : gameSession.opponent,
            opponent: isCreator ? gameSession.opponent : gameSession.creator,
            isCreator
        };
    };

    return (
        <div className="fixed inset-0 bg-[#000B3B] bg-gradient-to-br from-[#000B3B] to-[#001666] overflow-hidden text-white">
            <div className="h-full flex flex-col p-2 md:p-4">
                <header className="bg-[#000850] rounded-lg p-3 md:p-4 border-2 border-blue-400 shadow-[0_0_10px_rgba(0,128,255,0.5)]">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-blue-300 tracking-wider">
                            RPS ARCADE
                        </h1>
                    </div>
                </header>

                <main className="flex-1 flex flex-col gap-3 mt-2 relative">
                    {error && (
                        <div className="absolute top-0 left-0 right-0 z-50 bg-red-900/50 border-2 border-red-500 text-white p-4 rounded-lg text-center animate-pulse">
                            {error}
                        </div>
                    )}

                    {gameStatus === 'init' && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="bg-[#000850] p-6 md:p-8 rounded-lg border-2 border-blue-400 shadow-[0_0_10px_rgba(0,128,255,0.5)] w-full max-w-md">
                                <div className="space-y-6">
                                    <Input
                                        type="text"
                                        placeholder="ENTER NAME"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toUpperCase())}
                                        className="w-full bg-black/60 border-2 border-blue-400 text-blue-300 p-4 text-xl rounded-lg placeholder:text-blue-300/50 uppercase"
                                        style={{textTransform: 'uppercase'}}
                                    />
                                    <div className="space-y-4">
                                        <Button
                                            onClick={createGame}
                                            className="w-full bg-blue-700 hover:bg-blue-600 text-xl p-6 rounded-lg border-2 border-blue-400 transition-all duration-300 hover:scale-[0.98]"
                                        >
                                            CREATE NEW GAME
                                        </Button>
                                        <div className="relative">
                                            <div className="absolute inset-x-0 top-1/2 h-px bg-blue-400/30"></div>
                                            <div className="relative flex justify-center">
                                                <span className="bg-[#000850] px-4 text-blue-300">OR</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Input
                                                type="text"
                                                placeholder="ENTER ROOM CODE"
                                                value={roomId}
                                                onChange={(e) => setRoomId(e.target.value)}
                                                className="w-full bg-black/60 border-2 border-blue-400 text-blue-300 p-4 text-xl rounded-lg placeholder:text-blue-300/50 uppercase"
                                            />
                                            <Button
                                                onClick={joinGame}
                                                className="w-full bg-green-700 hover:bg-green-600 text-xl p-6 rounded-lg border-2 border-blue-400 transition-all duration-300 hover:scale-[0.98]"
                                            >
                                                JOIN GAME
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {gameStatus === 'waiting' && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="bg-[#000850] p-8 rounded-lg border-2 border-blue-400 text-center">
                                <div className="text-2xl md:text-3xl text-blue-300 mb-4">ROOM CODE</div>
                                <div className="text-4xl md:text-6xl font-mono text-yellow-400 mb-8 bg-black/40 px-6 py-4 rounded-lg">
                                    {roomId}
                                </div>
                                <div className="flex items-center justify-center gap-2 mb-4">
                                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
                                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                                <div className="text-xl md:text-2xl text-blue-300">
                                    WAITING FOR OPPONENT...
                                </div>
                            </div>
                        </div>
                    )}

                    {(gameStatus === 'playing' || gameStatus === 'finished') && gameSession && (
                        <div className="flex-1 flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#000850] p-4 rounded-lg border-2 border-blue-400">
                                    <div className="text-lg md:text-xl text-blue-300 mb-1">
                                        {getPlayerInfo()?.player?.username}
                                    </div>
                                    <div className="text-2xl md:text-3xl text-yellow-400">
                                        {getPlayerInfo()?.player?.points} PTS
                                    </div>
                                </div>
                                <div className="bg-[#000850] p-4 rounded-lg border-2 border-blue-400">
                                    <div className="text-lg md:text-xl text-blue-300 mb-1">
                                        {getPlayerInfo()?.opponent?.username || 'OPPONENT'}
                                    </div>
                                    <div className="text-2xl md:text-3xl text-yellow-400">
                                        {getPlayerInfo()?.opponent?.points || 0} PTS
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center bg-[#000850] p-4 rounded-lg border-2 border-blue-400">
                                <div className="grid grid-cols-3 gap-4 w-full max-w-3xl mx-auto">
                                    {Object.entries(choices).map(([key, value]) => (
                                        <Button
                                            key={key}
                                            onClick={() => makeChoice(key as Choice)}
                                            disabled={gameStatus === 'finished' || waitingForOpponent}
                                            className={`
                                               aspect-square flex flex-col items-center justify-center
                                               ${waitingForOpponent
                                                ? 'bg-gray-800/50 cursor-not-allowed'
                                                : 'bg-blue-900/50 hover:bg-blue-800/50'}
                                               rounded-lg border-2 border-blue-400
                                               transition-all duration-300 hover:scale-[0.98]
                                               p-4 md:p-6
                                           `}
                                        >
                                           <span className="text-5xl md:text-7xl lg:text-8xl mb-4">
                                               {value.emoji}
                                           </span>
                                            <span className="text-lg md:text-xl text-blue-300">
                                               {value.name}
                                           </span>
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {lastResult && (
                                <div className="bg-[#000850] p-4 rounded-lg border-2 border-blue-400 text-center">
                                    <div className="text-3xl md:text-4xl text-yellow-400 mb-4 font-bold">
                                        {(() => {
                                            const isCreator = socket.id === gameSession.creator.id;
                                            if (lastResult.result === 'tie') return 'DRAW!';
                                            if ((isCreator && lastResult.result === 'creator') ||
                                                (!isCreator && lastResult.result === 'opponent')) {
                                                return '🏆 WINNER! 🏆';
                                            }
                                            return '❌ TRY AGAIN! ❌';
                                        })()}
                                    </div>
                                    <div className="flex items-center justify-center gap-6 md:gap-10">
                                        {socket.id === gameSession?.creator.id ? (
                                            <>
                                                <div className="text-5xl md:text-7xl">
                                                    {choices[lastResult.moves.creator.choice as Choice].emoji}
                                                </div>
                                                <div className="text-2xl md:text-3xl text-yellow-400 font-bold">VS</div>
                                                <div className="text-5xl md:text-7xl">
                                                    {choices[lastResult.moves.opponent.choice as Choice].emoji}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-5xl md:text-7xl">
                                                    {choices[lastResult.moves.opponent.choice as Choice].emoji}
                                                </div>
                                                <div className="text-2xl md:text-3xl text-yellow-400 font-bold">VS</div>
                                                <div className="text-5xl md:text-7xl">
                                                    {choices[lastResult.moves.creator.choice as Choice].emoji}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>

                <footer className="mt-2 bg-[#000850] p-2 rounded-lg border-2 border-blue-400">
                    <div className="text-center text-sm md:text-base text-blue-300">
                        {gameStatus === 'init' && 'READY TO PLAY'}
                        {gameStatus === 'waiting' && 'WAITING FOR OPPONENT'}
                        {gameStatus === 'playing' && (waitingForOpponent ? 'WAITING FOR OPPONENT MOVE' : 'YOUR TURN')}
                        {gameStatus === 'finished' && 'GAME OVER'}
                    </div>
                </footer>
            </div>
        </div>
    );
}