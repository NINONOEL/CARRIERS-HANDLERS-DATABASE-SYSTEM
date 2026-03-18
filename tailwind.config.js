/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#f4f7e8',
          100: '#e5ecc8',
          200: '#ccd9a0',
          300: '#aec272',
          400: '#94ad4e',
          500: '#7a9834',
          600: '#637d28',
          700: '#4d6220',
          800: '#3a4a1b',
          900: '#293515',
          DEFAULT: '#849C44',
        },
        golden: {
          DEFAULT: '#F7A825',
          light: '#FCEEA0',
          dark: '#D4891A',
        },
        brick: {
          DEFAULT: '#B83210',
          light: '#D94020',
          dark: '#8B2510',
        },
        cream: '#FDF0A0',
      },
    },
  },
  plugins: [],
}
