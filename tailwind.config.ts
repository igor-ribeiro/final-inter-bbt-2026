import type { Config } from 'tailwindcss';
import { TEAM_COLORS } from './src/game';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0D10',
        surface: '#101318',
        'surface-2': '#13161B',
        video: '#15181D',
        hover: '#1A1F27',
        selected: '#161B22',
        'just-added': '#1A2130',
        line: '#23272F',
        'line-strong': '#2C313A',
        'line-faint': '#1A1E25',
        text: '#E6E8EB',
        'text-2': '#C9CDD3',
        muted: '#8A9099',
        faint: '#6B717B',
        dash: '#4A505A',
        'team-a': TEAM_COLORS.A,
        'team-b': TEAM_COLORS.B,
        ok: '#3DD68C',
      },
      fontFamily: {
        sans: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
} satisfies Config;
