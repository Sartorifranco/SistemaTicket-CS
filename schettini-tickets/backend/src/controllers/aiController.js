// Controlador "Simulado" de IA
const predictCategory = async (req, res) => {
    // El frontend espera { success: true, data: { suggestedPriority: ... } }
    res.json({
        success: true,
        data: {
            suggestedCategory: 'Soporte General',
            suggestedPriority: 'Media', // 'Media' se traduce a 'medium' en el front
            confidence: 0.9
        }
    });
};

module.exports = {
    predictCategory
};