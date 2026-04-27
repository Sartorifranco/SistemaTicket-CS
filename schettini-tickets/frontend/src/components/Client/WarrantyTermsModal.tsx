import React, { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import api from '../../config/axiosConfig';

/** Contenido legal de referencia (fallback si falla la API o sin conexión). No eliminar: respaldo operativo. */
export const WarrantyTermsContent: React.FC = () => (
    <div className="text-sm text-gray-700 space-y-4">
        <h3 className="font-bold text-lg">POLÍTICA DE GARANTÍA</h3>
        <p>
            <strong>SCH COMERCIAL SAS</strong> garantiza el normal funcionamiento del producto que se identifica en la factura de venta emitida y/o recibo, por el termino de tres, seis o doce meses según el tiempo de garantía especificado por el fabricante.
        </p>
        <p>Aquellos productos qué tuviesen garantía oficial mayor al plazo de 12 meses, la misma deberá sera validada directamente ante la marca luego de transcurrido el primer año.</p>

        <h4 className="font-bold mt-4">CONDICIONES DE LA GARANTÍA:</h4>
        <p>
            La garantía durante el tiempo indicado precedentemente... incluye la reparación y/o reposición y/o cambio del producto y/o componentes sin cargo alguno para el cliente incluyendo los gastos incurridos por la mano de obra. Para que la garantía tenga validez, es requisito obligatorio que el cliente presente junto con el producto, su packaging original en buenas condiciones y el presente comprobante. En el caso de que no se presentará el comprobante, la garantía carece de valor.
        </p>
        <p>El usuario deberá mantener el equipo en condiciones óptimas, entendiéndose tales aquellas necesarias para un uso y funcionamiento normal...</p>

        <h4 className="font-bold mt-4">ESTA GARANTÍA NO SERÁ VÁLIDA BAJO LAS SIGUIENTES CONDICIONES:</h4>
        <ul className="list-disc pl-5 space-y-2">
            <li>Cuando la garantía manifieste claros signos de haber sido alterada en los datos originales consignados en ella.</li>
            <li>Cuando el uso, cuidado y operación del producto no haya sido de acuerdo con las instrucciones de uso indicadas en el correspondiente manual del producto.</li>
            <li>Cuando el producto haya sido usado fuera de su capacidad, maltratado, golpeado, expuesto a la humedad, manipulado por algún líquido y/o sustancia no permitida, así como cualquier otro daño atribuible al cliente.</li>
            <li>Cuando el producto haya sido desarmado, modificado o reparado por el cliente y/o por personas y/o empresas distintas a esta parte.</li>
            <li>Cuando la falla sea originada por el desgaste normal y natural de las piezas debido al uso del producto y transcurso del tiempo.</li>
            <li>Cuando la caja y/o packaging original del producto no esté en buenas condiciones de conservación y/o dañado.</li>
        </ul>

        <h4 className="font-bold mt-4">LÍMITES Y EXCEPCIONES:</h4>
        <p>
            La garantía no cubre el uso indebido y/o excesivo, ni en aquellos casos que se hayan desestimado las directivas impartidas en el manual de instrucciones. Se excluye de la garantía los golpes, roturas, abolladuras... La garantía tampoco cubrirá desperfectos en artefactos o placas electrónicas provocados por la presencia de cucarachas o insectos similares, desperfectos por fallas eléctricas externas, sobrecarga, instalación o manejos inapropiados.
        </p>
        <p>Únicamente será válida la garantía al advertir defectos de fábrica.</p>
        <p>La garantía expirará automáticamente en los supuestos en que el producto sea reparado, intentado reparar y/o modificado por el mismo usuario o por personas no autorizadas...</p>
        <p>No se reconocerá garantía alguna sobre insumos consumibles, como así también sobre los repuestos que por el tipo de uso también lo son (Cuchillas, listones, bujes, correas, cabezales térmicos, etc).</p>
        <p>La presente Garantía no cubre la mano de obra de limpieza ni calibraciones por normal uso del período, si fueran necesarias.</p>

        <h4 className="font-bold mt-4">REPARACIÓN</h4>
        <p>
            El personal técnico de CASA SCHETTINI se compromete a revisar el producto dentro de las 48hs contadas desde el día hábil siguiente a la recepción del producto... (Siempre y cuando se haya adjuntado la factura de compra con el producto).
        </p>
        <p>Cuando el personal técnico verifique problemas por defectos en su fabricación, SCH COMERCIAL SAS se encargará de reparar SIN COSTO el artículo.</p>

        <h4 className="font-bold mt-4">PROCEDIMIENTO</h4>
        <p>
            Para hacer uso de la garantía, es necesario que previamente el cliente se comunique a SCH COMERCIAL SAS vía WhatsApp o por teléfono para asentar el reclamo. Una vez establecido el contacto, el cliente procede a ingresar el producto a revisión...
        </p>
        <p>
            <strong>IMPORTANTE:</strong> En cualquier caso, será condición necesaria presentar la factura original de compra junto con el producto, para activar el procedimiento de garantía.
        </p>
        <p>
            <strong>FLETES/ TRASLADOS:</strong> Los gastos de traslado y/o flete, serán a cargo del comprador, sin excepción.
        </p>

        <h4 className="font-bold mt-4">SOBRE REPARACIONES FUERA DE TERMINO GARANTÍA U OTRAS REPARACIONES</h4>
        <p>
            Cualquier reparación llevada a cabo por el servicio técnico goza de una garantía de 30 días corridos a partir de la fecha de entrega... El plazo para el retiro del equipo en reparación es de 60 días a partir de la fecha de ingreso. Cumplido ese término sin que sea retirado, se cobrara un monto diario de usd$0.80+iva. Si la cosa no fuese retirada en el plazo de 90 días, se considerara abandonada por su dueño.
        </p>

        <h4 className="font-bold mt-4">SOBRE CONTROLADORES FISCALES Y SISTEMAS DE GESTIÓN</h4>
        <p>
            Una vez realizado el proceso de fiscalización o gravado de datos, estos productos no tienen cambio ni devolución. En estas soluciones qué requieren programación con datos del titular, será necesario completar el formulario dentro de los 90 días posteriores a la fecha de compra. De no recibir la planilla completa dentro del tiempo pactado, se procederá a realizar la nota de crédito...
        </p>

        <h4 className="font-bold mt-4">POLÍTICAS SOBRE DEVOLUCIONES</h4>
        <p>
            El plazo máximo para solicitar el cambio o devolución de un producto adquirido es de 7 días, siempre y cuando se trate de un producto apto para devolución. Sch Comercial Sas no realiza reembolsos de dinero por devoluciones (se emite nota de crédito).
        </p>

        <div className="mt-6 p-4 bg-gray-100 rounded">
            <p>
                <strong>Dirección envío para revisión técnica / garantía:</strong>
                <br />
                Av. FIGUEROA ALCORTA 333 (5000) Ciudad de Córdoba, Córdoba. Argentina.
                <br />
                Tel.: (0351) 4240279 - 4257298 // WhatsApp Posventa: 3518554352
                <br />
                Horario de atención: Lunes a Viernes de 9 a 17hs.
                <br />
                posventa@casaschettini.com / www.casaschettini-shop.com
            </p>
        </div>
    </div>
);

interface WarrantyTermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Modal con scroll para términos extensos de garantía (panel cliente).
 * El texto principal se obtiene de GET /api/settings/terms al abrir el modal.
 */
const WarrantyTermsModal: React.FC<WarrantyTermsModalProps> = ({ isOpen, onClose }) => {
    const [termsText, setTermsText] = useState<string | null>(null);
    const [loadingTerms, setLoadingTerms] = useState(false);
    const [useStaticFallback, setUseStaticFallback] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setLoadingTerms(true);
        setUseStaticFallback(false);
        setTermsText(null);
        (async () => {
            try {
                const res = await api.get<{ success: boolean; data: { text: string } }>('/api/settings/terms');
                if (!cancelled && res.data?.data?.text != null) {
                    setTermsText(res.data.data.text);
                }
            } catch {
                if (!cancelled) setUseStaticFallback(true);
            } finally {
                if (!cancelled) setLoadingTerms(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[10000] p-4 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="warranty-terms-title"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
                    <h2 id="warranty-terms-title" className="text-xl font-bold text-gray-800 pr-4">
                        Términos y Condiciones de Garantía
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 transition shrink-0"
                        aria-label="Cerrar"
                    >
                        <FaTimes size={22} />
                    </button>
                </div>
                <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0 max-h-[calc(90vh-5rem)]">
                    {loadingTerms ? (
                        <div className="text-center text-gray-600 py-8">Cargando términos...</div>
                    ) : useStaticFallback ? (
                        <WarrantyTermsContent />
                    ) : (
                        <div
                            className="text-sm text-gray-700 whitespace-pre-wrap break-words"
                            role="article"
                        >
                            {termsText ?? ''}
                        </div>
                    )}
                </div>
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WarrantyTermsModal;
