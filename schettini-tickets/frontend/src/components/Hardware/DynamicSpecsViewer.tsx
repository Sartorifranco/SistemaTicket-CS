import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '../../config/firebaseConfig';

interface Props {
    pcId: string; // El ID de la PC en Firebase (ej: hostname o mac address)
}

const DynamicSpecsViewer: React.FC<Props> = ({ pcId }) => {
    const [specs, setSpecs] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Escucha en tiempo real (Realtime)
        const unsub = onSnapshot(doc(db, "computadoras", pcId), (doc) => {
            if (doc.exists()) {
                setSpecs(doc.data());
            }
            setLoading(false);
        });

        return () => unsub();
    }, [pcId]);

    // Función recursiva para renderizar objetos anidados
    const renderObject = (data: any, level = 0) => {
        if (!data) return null;

        return Object.entries(data).map(([key, value]) => {
            // Formatear la clave (ej: "cpu_temp" -> "Cpu Temp")
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            // Si el valor es otro objeto (ej: Discos -> Disco C, Disco D), llamar recursivamente
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                return (
                    <div key={key} className={`ml-${level * 4} mt-2 mb-2 border-l-2 border-blue-200 pl-3`}>
                        <h4 className="text-sm font-bold text-gray-600 uppercase mb-1">{label}</h4>
                        {renderObject(value, level + 1)}
                    </div>
                );
            }

            // Si es un valor simple (String, Number, Boolean)
            return (
                <div key={key} className={`flex justify-between py-2 border-b border-gray-100 ml-${level * 4} hover:bg-gray-50`}>
                    <span className="text-gray-500 font-medium">{label}:</span>
                    <span className="text-gray-800 font-mono font-bold text-right">
                        {value === true ? '✅ Sí' : value === false ? '❌ No' : String(value)}
                    </span>
                </div>
            );
        });
    };

    if (loading) return <div className="animate-pulse">Cargando especificaciones...</div>;
    if (!specs) return <div className="text-red-500">No se encontraron datos para esta PC.</div>;

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-xl font-bold text-indigo-900 mb-4 border-b pb-2">
                🖥️ Especificaciones en Vivo (Firebase)
            </h3>
            <div className="space-y-1">
                {/* Aquí sucede la magia automática */}
                {renderObject(specs)}
            </div>
            <p className="text-xs text-gray-400 mt-4 text-right">
                Datos sincronizados en tiempo real.
            </p>
        </div>
    );
};

export default DynamicSpecsViewer;