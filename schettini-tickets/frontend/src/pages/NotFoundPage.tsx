import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    // Contenedor principal para centrar el contenido
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      
      {/* ✅ Se ajusta el padding para que sea menor en pantallas pequeñas */}
      <div className="text-center p-6 sm:p-8 bg-white text-gray-800 rounded-lg border border-gray-200 shadow-xl max-w-xl w-full">
        
        {/* ✅ Título y textos con tamaño responsivo */}
        <h1 className="text-5xl sm:text-7xl font-bold text-red-600 mb-4">404</h1>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-4">Página no encontrada</h2>
        
        <p className="text-base sm:text-lg text-gray-600 mb-8">
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
        </p>

        <Link 
          to="/" 
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300"
        >
          Volver a la Página de Inicio
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;