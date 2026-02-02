// frontend/src/components/Notifications/ToastContainer.tsx
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Toast, ToastNotificationType } from '../../types'; // Importar Toast directamente

interface ToastContainerProps {
    toasts: Toast[]; // Ahora usa la interfaz Toast
    onRemoveToast: (id: number | string) => void; // id puede ser number o string
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
    // Busca el elemento 'toast-root' o usa 'document.body' como fallback
    const portalElement = document.getElementById('toast-root');

    useEffect(() => {
        // Configura un temporizador para cada toast para que desaparezca automáticamente
        const timers = toasts.map((toast) => {
            const timer = setTimeout(() => {
                onRemoveToast(toast.id);
            }, 5000); // El toast desaparece después de 5 segundos
            return timer;
        });

        // Limpia los temporizadores cuando el componente se desmonta o los toasts cambian
        return () => {
            timers.forEach(clearTimeout);
        };
    }, [toasts, onRemoveToast]);

    // Si no se encuentra el elemento portal, se renderiza directamente en el body
    // Es recomendable tener un <div id="toast-root"></div> en tu index.html o App.tsx
    return ReactDOM.createPortal(
        // Contenedor principal de los toasts, posicionado fijo en la parte inferior derecha
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col space-y-2"> {/* z-[9999] para asegurar que esté por encima de todo */}
            {toasts.map((toast) => {
                let bgColorClass = '';
                switch (toast.type) {
                    case 'success':
                        bgColorClass = 'bg-green-600';
                        break;
                    case 'error':
                        bgColorClass = 'bg-red-600';
                        break;
                    case 'info':
                        bgColorClass = 'bg-blue-600';
                        break;
                    case 'warning':
                        bgColorClass = 'bg-yellow-600';
                        break;
                    default:
                        // Si se agrega un nuevo tipo de notificación y no se maneja,
                        // se usará un color por defecto y se podría añadir un console.warn
                        // para depuración.
                        bgColorClass = 'bg-gray-800'; // Color por defecto
                        break;
                }

                return (
                    // Elemento individual del toast
                    <div
                        key={toast.id} // Ahora el id puede ser number o string
                        className={`relative p-4 pr-10 rounded-lg shadow-lg text-white max-w-xs w-full flex items-center justify-between ${bgColorClass}`}
                    >
                        <p className="text-sm font-medium pr-2">{toast.message}</p>
                        {/* Botón de cerrar el toast */}
                        <button
                            onClick={() => onRemoveToast(toast.id)}
                            className="absolute top-1 right-2 text-white text-xl font-bold leading-none opacity-70 hover:opacity-100 transition-opacity duration-200"
                            aria-label="Cerrar notificación"
                        >
                            &times;
                        </button>
                    </div>
                );
            })}
        </div>,
        portalElement || document.body
    );
};

export default ToastContainer;
