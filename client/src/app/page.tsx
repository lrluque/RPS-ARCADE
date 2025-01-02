import dynamic from 'next/dynamic'

const MultiplayerRPS = dynamic(() => import('@/components/game/MultiplayerRPS'), {
    ssr: false
})

export default function Home() {
    return <MultiplayerRPS />
}