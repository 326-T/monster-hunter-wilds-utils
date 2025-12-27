import type { Config } from "tailwindcss";

const config: Config = {
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				card: "hsl(var(--card))",
				"card-foreground": "hsl(var(--card-foreground))",
				muted: "hsl(var(--muted))",
				"muted-foreground": "hsl(var(--muted-foreground))",
				accent: "hsl(var(--accent))",
				"accent-foreground": "hsl(var(--accent-foreground))",
				border: "hsl(var(--border))",
				ring: "hsl(var(--ring))",
				input: "hsl(var(--input))",
			},
			fontFamily: {
				sans: [
					'"Zen Kaku Gothic Antique"',
					'"Hiragino Kaku Gothic ProN"',
					'"Hiragino Sans"',
					'"Noto Sans JP"',
					"sans-serif",
				],
				serif: [
					'"Shippori Mincho"',
					'"Hiragino Mincho ProN"',
					'"Noto Serif JP"',
					"serif",
				],
			},
			keyframes: {
				"fade-up": {
					"0%": { opacity: "0", transform: "translateY(10px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				float: {
					"0%": { transform: "translateY(0px)" },
					"50%": { transform: "translateY(-10px)" },
					"100%": { transform: "translateY(0px)" },
				},
			},
			animation: {
				"fade-up": "fade-up 0.6s ease-out both",
				float: "float 10s ease-in-out infinite",
			},
		},
	},
	plugins: [],
};

export default config;
