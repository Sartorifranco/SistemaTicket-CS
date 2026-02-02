// frontend/src/components/TestPortal.tsx
import React from 'react';
import ReactDOM from 'react-dom';

interface TestPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TestPortal: React.FC<TestPortalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const portalRoot = document.getElementById('modal-root');

  if (!portalRoot) {
    console.error("TestPortal: El elemento 'modal-root' no se encontró en el DOM.");
    return null;
  }

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full text-center relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl font-bold"
          aria-label="Cerrar"
        >
          &times;
        </button>
        <h2 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mb-4">
          ¡Hola desde el Portal!
        </h2>
        <p className="text-lg text-gray-700 dark:text-gray-200 mb-6">
          Si ves esto, el portal está funcionando correctamente.
        </p>
        <button
          onClick={onClose}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
        >
          Cerrar Prueba
        </button>
      </div>
    </div>,
    portalRoot
  );
};

export default TestPortal;