import React from 'react';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    // ✅ Padding responsivo para más espacio en pantallas grandes
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-var(--footer-height))] p-4 sm:p-8 bg-gray-50">
      
      {/* ✅ Título y subtítulo con tamaños de fuente responsivos */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-indigo-600 mb-4 text-center">
        Bienvenido al Sistema de Tickets
      </h1>
      <p className="text-base sm:text-lg text-gray-700 text-center mb-8">
        {user ? `Hola, ${user.username}! Tu rol es: ${user.role}.` : 'Por favor, inicia sesión o regístrate para continuar.'}
      </p>
      
      <div className="mt-8 p-6 bg-white rounded-lg shadow-md text-center max-w-lg w-full">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">¿Qué puedes hacer aquí?</h2>
        <ul className="list-disc list-inside text-left text-gray-600 space-y-2">
          <li>Si eres un <strong>cliente</strong>, puedes crear nuevos tickets y seguir el estado de tus solicitudes.</li>
          <li>Si eres un <strong>agente</strong>, puedes gestionar los tickets asignados, cambiar estados y añadir comentarios.</li>
          <li>Si eres un <strong>administrador</strong>, tienes acceso completo para gestionar usuarios, departamentos, tickets y ver informes.</li>
        </ul>
        <p className="mt-6 text-gray-500 text-sm">
          ¡Explora las funcionalidades según tu rol!
        </p>
      </div>
    </div>
  );
};

export default Home;