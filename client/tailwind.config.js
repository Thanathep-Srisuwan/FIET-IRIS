/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fiet: {
          blue:       '#42b5e1',
          bluedark:   '#2a9bc7',
          bluedeep:   '#1a6e8e',
          orange:     '#f7924a',
          orangedark: '#e07a35',
          navy:       '#0d2d3e',
          navylight:  '#163d52',
        },
        primary: {
          50:  '#eef9fd',
          100: '#d4f0f9',
          200: '#aae0f3',
          300: '#72caea',
          400: '#42b5e1',
          500: '#1f9fd0',
          600: '#1580b0',
          700: '#14668f',
          800: '#165576',
          900: '#174763',
        },
      },
      fontFamily: {
        display: ['"Noto Serif Thai"', 'serif'],
        body:    ['"IBM Plex Sans Thai"', 'sans-serif'],
      },
      boxShadow: {
        'card':  '0 2px 12px 0 rgba(13,45,62,0.08)',
        'glow':  '0 0 24px 0 rgba(66,181,225,0.18)',
      },
    },
  },
  plugins: [],
}
