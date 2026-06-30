/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 成大主色（暗紅/勝利紫調性），用於品牌點綴
        ncku: {
          DEFAULT: '#8a1538',
          light: '#b03a5b',
        },
      },
    },
  },
  plugins: [],
};
