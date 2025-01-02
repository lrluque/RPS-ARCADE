import type { Config } from 'tailwindcss'

const config: Config = {
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			borderColor: {
				border: 'hsl(var(--border))',
			},
			colors: {
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				border: 'hsl(var(--border))',
			},
			animation: {
				'shine': 'shine 2s linear infinite',
				'neon-pulse': 'neon-pulse 1.5s ease-in-out infinite alternate',
			},
			keyframes: {
				shine: {
					'0%': { backgroundPosition: '200% center' },
					'100%': { backgroundPosition: '-200% center' },
				},
				'neon-pulse': {
					'0%, 100%': {
						textShadow: '0 0 7px #fff, 0 0 10px #fff, 0 0 21px #fff, 0 0 42px #ffd700',
					},
					'50%': {
						textShadow: '0 0 4px #fff, 0 0 7px #fff, 0 0 18px #fff, 0 0 38px #ffd700',
					},
				},
			},
		},
	},
	plugins: [],
}

export default config