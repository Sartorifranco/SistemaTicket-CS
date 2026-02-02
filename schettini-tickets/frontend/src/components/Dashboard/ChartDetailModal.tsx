// frontend/src/components/Dashboard/ChartDetailModal.tsx
import React from 'react';
// Ya no es necesario ReactDOM si usamos el componente Modal
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Modal from '../Common/Modal'; // Importar el componente Modal

interface ChartDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: { name: string; value: number }[];
}

// Colors for the pie chart segments (you can customize these)
const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7300'];

// Custom label for PieChart, adjusted to use direct colors or Tailwind if applicable
const CustomPieChartLabel = ({ cx, cy, midAngle, outerRadius, percent, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 10; // Distance of the text from the center
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="#4B5563" // Un gris oscuro de Tailwind (text-gray-700) para el texto del label
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            className="text-sm" // Font size class
        >
            {`${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
        </text>
    );
};

const ChartDetailModal: React.FC<ChartDetailModalProps> = ({ isOpen, onClose, title, data }) => {
    // El componente Modal ya maneja isOpen y el portal, así que no necesitamos esta comprobación aquí.
    // if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="w-full h-[300px]"> {/* Reemplazado chart-container-modal con clases de Tailwind */}
                {data && data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={120} // Chart radius
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                                label={CustomPieChartLabel}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                // Estilos del Tooltip ajustados a Tailwind o valores directos
                                contentStyle={{
                                    backgroundColor: '#FFFFFF', // bg-white
                                    border: '1px solid #E5E7EB', // border-gray-200
                                    color: '#1F2937', // text-gray-900
                                    borderRadius: '0.375rem', // rounded-md
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' // shadow-md
                                }}
                                itemStyle={{ color: '#1F2937' }} // text-gray-900
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-gray-600 text-center mt-12">No hay datos disponibles para este gráfico.</p> /* Reemplazado info-text y estilo en línea */
                )}
            </div>
        </Modal>
    );
};

export default ChartDetailModal;
