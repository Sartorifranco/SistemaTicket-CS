// frontend/src/tailwind.config.js
module.exports = {
  darkMode: 'class', 
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Rojo Schettini (fuerte y profesional)
        primary: {
          light: '#D32F2F', // Rojo estándar
          dark: '#B71C1C',  // Rojo oscuro para hover/modo noche
        },
        // Gris neutro para dar ese toque "seco" y minimalista
        secondary: {
          light: '#F5F5F5', 
          dark: '#424242',  
        },
        // Fondos limpios
        background: {
          light: '#FFFFFF', 
          dark: '#121212',  
        },
        text: {
          DEFAULT: '#212121', // Negro casi puro, alta legibilidad
          dark: '#EEEEEE',
        }
      }
    },
  },
  plugins: [], 
}