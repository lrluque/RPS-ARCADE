'use client';

import MultiplayerRPS from '@/components/game/MultiplayerRPS'

export default function Home() {
    return (
        <main className="min-h-screen flex items-center justify-center">
            <MultiplayerRPS />
        </main>
    )
}