import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SectionCard from '../components/Common/SectionCard';
import api from '../config/axiosConfig';
import { getImageUrl } from '../utils/imageUrl';
import { FaFileExcel, FaSearch, FaPlus, FaTrash, FaCopy, FaWhatsapp, FaFilePdf, FaTimes } from 'react-icons/fa';

interface CompanySettings {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string | null;
  tax_percentage: number;
  quote_footer_text: string;
  primary_color: string;
}

const defaultCompanySettings: CompanySettings = {
  company_name: 'Tu Empresa S.A.',
  address: 'Av. Ejemplo 1234, CABA',
  phone: '(011) 1234-5678',
  email: 'contacto@tuempresa.com',
  website: 'www.tuempresa.com.ar',
  logo_url: null,
  tax_percentage: 21,
  quote_footer_text: 'Presupuesto válido por 15 días. Precios sujetos a variación del dólar.',
  primary_color: '#000000',
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, '');
  const expanded = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expanded);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const fullUrl = getImageUrl(url);
    const res = await fetch(fullUrl, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface PriceItem {
  codigo: string;
  descripcion: string;
  aptoModelo: string;
  costoSinIva: number;
  costoConIva: number;
  precioVentaPesos: number;
  precioVentaUsd: number;
  precioListaCuotas: number;
  precioListaDebito: number;
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] ?? '').toUpperCase();
      if (cell.includes('CODIGO') && cell.includes('PRODUCTO')) return i;
    }
  }
  return -1;
}

function toNum(val: unknown): number {
  if (val == null || val === '') return 0;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const s = String(val).replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseSheet(rows: unknown[][]): PriceItem[] {
  const headerIdx = findHeaderRow(rows);
  if (headerIdx < 0) return [];

  const headers = (rows[headerIdx] as unknown[]).map((h) => String(h ?? '').trim());
  const col = (key: string): number => {
    const k = key.toUpperCase();
    const idx = headers.findIndex((h) => String(h).toUpperCase().includes(k));
    return idx >= 0 ? idx : -1;
  };

  const idxCodigo = col('CODIGO PRODUCTO');
  const idxDesc = col('DESCRIPCION');
  const idxApto = col('APTO MODELO');
  const idxCostoSin = col('COSTO S/IVA');
  const idxCostoCon = col('COSTO + IVA');
  const idxPrecioPesos = col('PRECIO VENTA FINAL PESOS');
  const idxPrecioUsd = col('PRECIO VENTA FINAL USD');
  const idxListaCuotas = col('PRECIO DE LISTA HASTA 3');
  const idxListaDebito = col('PRECIO DE LISTA -30%');

  const items: PriceItem[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const codigo = idxCodigo >= 0 ? String(row[idxCodigo] ?? '').trim() : '';
    const descripcion = idxDesc >= 0 ? String(row[idxDesc] ?? '').trim() : '';
    if (!codigo && !descripcion) continue;

    items.push({
      codigo,
      descripcion,
      aptoModelo: idxApto >= 0 ? String(row[idxApto] ?? '').trim() : '',
      costoSinIva: idxCostoSin >= 0 ? toNum(row[idxCostoSin]) : 0,
      costoConIva: idxCostoCon >= 0 ? toNum(row[idxCostoCon]) : 0,
      precioVentaPesos: idxPrecioPesos >= 0 ? toNum(row[idxPrecioPesos]) : 0,
      precioVentaUsd: idxPrecioUsd >= 0 ? toNum(row[idxPrecioUsd]) : 0,
      precioListaCuotas: idxListaCuotas >= 0 ? toNum(row[idxListaCuotas]) : 0,
      precioListaDebito: idxListaDebito >= 0 ? toNum(row[idxListaDebito]) : 0
    });
  }
  return items;
}

const QuoterPage: React.FC = () => {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [search, setSearch] = useState('');
  const [quoteItems, setQuoteItems] = useState<PriceItem[]>([]);
  const [dolarActual, setDolarActual] = useState<number>(1150);
  const [margenGanancia, setMargenGanancia] = useState<number>(30);
  const [costoEnPesos, setCostoEnPesos] = useState(true);
  const [fileName, setFileName] = useState<string>('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);

  useEffect(() => {
    api.get('/api/settings/company').then((res) => {
      const d = res.data.data || res.data;
      if (d) {
        setCompanySettings({
          company_name: d.company_name ?? defaultCompanySettings.company_name,
          address: d.address ?? defaultCompanySettings.address,
          phone: d.phone ?? defaultCompanySettings.phone,
          email: d.email ?? defaultCompanySettings.email,
          website: d.website ?? defaultCompanySettings.website,
          logo_url: d.logo_url ?? null,
          tax_percentage: d.tax_percentage != null ? Number(d.tax_percentage) : 21,
          quote_footer_text: d.quote_footer_text ?? defaultCompanySettings.quote_footer_text,
          primary_color: d.primary_color ?? '#000000',
        });
      }
    }).catch(() => {});
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        if (!data || (typeof data !== 'string' && !(data instanceof ArrayBuffer))) return;

        const wb = XLSX.read(data, { type: data instanceof ArrayBuffer ? 'array' : 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const rows = json as unknown[][];

        const parsed = parseSheet(rows);
        if (parsed.length === 0) {
          toast.error('No se encontró la fila "CODIGO PRODUCTO". Revisá el formato del Excel.');
          return;
        }
        setItems(parsed);
        setFileName(file.name);
        toast.success(`Se importaron ${parsed.length} artículos.`);
      } catch (err) {
        console.error(err);
        toast.error('Error al leer el archivo Excel.');
      }
    };
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsBinaryString(file);
    }
    e.target.value = '';
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.codigo.toLowerCase().includes(q) ||
        i.descripcion.toLowerCase().includes(q)
    );
  }, [items, search]);

  const addToQuote = (item: PriceItem) => {
    setQuoteItems((prev) => [...prev, { ...item }]);
    toast.info(`"${item.descripcion || item.codigo}" agregado a la cotización.`);
  };

  const removeFromQuote = (idx: number) => setQuoteItems((prev) => prev.filter((_, i) => i !== idx));
  const clearQuote = () => { setQuoteItems([]); toast.info('Cotización vaciada.'); };

  const costoBase = (item: PriceItem): number => (item.costoConIva > 0 ? item.costoConIva : item.costoSinIva);

  const precioACobrar = (item: PriceItem): number => {
    const costo = costoBase(item);
    if (costo <= 0) return item.precioVentaPesos > 0 ? item.precioVentaPesos : 0;

    let costoUsd: number;
    if (costoEnPesos) {
      costoUsd = costo / dolarActual;
    } else {
      costoUsd = costo;
    }
    const precioUsd = costoUsd * (1 + margenGanancia / 100);
    return costoEnPesos ? precioUsd * dolarActual : precioUsd * dolarActual;
  };

  const totales = useMemo(() => {
    let totalPesosExcel = 0;
    let totalUsdExcel = 0;
    let totalACobrar = 0;
    quoteItems.forEach((i) => {
      totalPesosExcel += i.precioVentaPesos;
      totalUsdExcel += i.precioVentaUsd;
      totalACobrar += precioACobrar(i);
    });
    return { totalPesosExcel, totalUsdExcel, totalACobrar };
  }, [quoteItems, dolarActual, margenGanancia, costoEnPesos]);

  const generarTextoCotizacion = (): string => {
    if (quoteItems.length === 0) return '';

    const lines: string[] = [
      '═══════════════════════════════════════',
      '         COTIZACIÓN',
      '═══════════════════════════════════════',
      ''
    ];
    quoteItems.forEach((i, idx) => {
      const precio = precioACobrar(i);
      const precioExcel = i.precioVentaPesos > 0 ? i.precioVentaPesos : i.precioVentaUsd * dolarActual;
      const usar = precio > 0 ? precio : precioExcel;
      lines.push(`${idx + 1}. ${i.descripcion || i.codigo || 'Sin nombre'}`);
      if (i.codigo) lines.push(`   Código: ${i.codigo}`);
      lines.push(`   Precio: $${Math.round(usar).toLocaleString('es-AR')}`);
      lines.push('');
    });
    lines.push('───────────────────────────────────');
    lines.push(`TOTAL: $${Math.round(totales.totalACobrar > 0 ? totales.totalACobrar : totales.totalPesosExcel).toLocaleString('es-AR')}`);
    lines.push('');
    lines.push(`Dólar: $${dolarActual}`);
    lines.push('═══════════════════════════════════════');
    return lines.join('\n');
  };

  const handleCopyQuote = () => {
    const text = generarTextoCotizacion();
    if (!text) {
      toast.warning('Agregá artículos a la cotización primero.');
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => toast.success('Cotización copiada al portapapeles. Pegala en WhatsApp o en la nota de reparación.'),
      () => toast.error('No se pudo copiar.')
    );
  };

  const openWhatsAppModal = () => {
    const text = generarTextoCotizacion();
    if (!text) {
      toast.warning('Agregá artículos a la cotización primero.');
      return;
    }
    setWhatsappMessage(text);
    setShowWhatsAppModal(true);
  };

  const sendWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
    setShowWhatsAppModal(false);
    toast.success('Se abrirá WhatsApp. Elegí el contacto para enviar.');
  };

  const generarPDF = async () => {
    if (quoteItems.length === 0) {
      toast.warning('Agregá artículos a la cotización primero.');
      return;
    }

    const cs = companySettings;
    const [r, g, b] = hexToRgb(cs.primary_color);

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Header: Logo o placeholder (izq) + Datos empresa (der)
    let logoDataUrl: string | null = null;
    if (cs.logo_url) {
      logoDataUrl = await loadImageAsDataUrl(cs.logo_url);
    }
    if (logoDataUrl) {
      try {
        const fmt = logoDataUrl.includes('image/jpeg') || logoDataUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
        doc.addImage(logoDataUrl, fmt, margin, 12, 25, 18);
      } catch {
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, 12, 25, 18);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('LOGO', margin + 4, 22);
      }
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(margin, 12, 25, 18);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('LOGO', margin + 4, 22);
    }

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(cs.company_name || 'Tu Empresa S.A.', pageW - margin - 50, 16);
    doc.setFontSize(8);
    doc.text(cs.address || '—', pageW - margin - 50, 21);
    doc.text(`Tel: ${cs.phone || '—'}`, pageW - margin - 50, 26);
    doc.text(cs.website || cs.email || '—', pageW - margin - 50, 31);

    y = 45;
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESUPUESTO', margin, y);

    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin, y);
    y += 12;

    const totalFinal = totales.totalACobrar > 0 ? totales.totalACobrar : totales.totalPesosExcel;

    const tableData = quoteItems.map((i) => {
      const precio = precioACobrar(i);
      const precioExcel = i.precioVentaPesos > 0 ? i.precioVentaPesos : i.precioVentaUsd * dolarActual;
      const unitario = precio > 0 ? precio : precioExcel;
      const desc = `${i.descripcion || i.codigo || 'Sin nombre'}${i.codigo ? ` (${i.codigo})` : ''}`;
      return [1, desc, `$ ${Math.round(unitario).toLocaleString('es-AR')}`, `$ ${Math.round(unitario).toLocaleString('es-AR')}`];
    });

    autoTable(doc, {
      startY: y,
      head: [['Cant.', 'Descripción', 'Precio Unitario', 'Subtotal']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [r, g, b], textColor: 255 },
      styles: { fontSize: 9 }
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    const subtotal = totalFinal;
    const taxPct = cs.tax_percentage ?? 0;
    const iva = taxPct > 0 ? subtotal * (taxPct / 100) : 0;
    const totalPagar = subtotal + iva;

    doc.setFontSize(10);
    doc.text('Subtotal:', pageW - margin - 70, y);
    doc.text(`$ ${Math.round(subtotal).toLocaleString('es-AR')}`, pageW - margin - 15, y);
    y += 6;
    if (taxPct > 0) {
      doc.text(`IVA ${taxPct}%:`, pageW - margin - 70, y);
      doc.text(`$ ${Math.round(iva).toLocaleString('es-AR')}`, pageW - margin - 15, y);
      y += 6;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL A PAGAR:', pageW - margin - 70, y);
    doc.text(`$ ${Math.round(totalPagar).toLocaleString('es-AR')}`, pageW - margin - 15, y);

    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    const footerText = cs.quote_footer_text?.trim() || 'Presupuesto válido por 15 días. Precios sujetos a variación del dólar.';
    doc.text(footerText, margin, y);

    doc.save(`Presupuesto-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF descargado correctamente.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Cotizador</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <SectionCard title="Importador de Lista de Precios">
            <div className="flex flex-wrap gap-4 items-end">
              <label className="flex-1 min-w-[200px]">
                <span className="block text-sm font-medium text-gray-700 mb-1">Archivo Excel (formato cliente)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium hover:file:bg-indigo-100"
                  />
                  <FaFileExcel className="text-green-600 text-xl shrink-0" />
                </div>
              </label>
              {fileName && <span className="text-sm text-gray-500">Cargado: {fileName}</span>}
            </div>

            {items.length > 0 && (
              <>
                <div className="mt-4">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por Código o Descripción..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Descripción</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Precio Pesos</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Precio USD</th>
                        <th className="px-4 py-2 w-24 text-center text-xs font-semibold text-gray-600 uppercase">Agregar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/50 cursor-pointer" onClick={() => addToQuote(item)}>
                          <td className="px-4 py-2 text-sm">{item.codigo}</td>
                          <td className="px-4 py-2 text-sm">{item.descripcion}</td>
                          <td className="px-4 py-2 text-sm text-right">${item.precioVentaPesos.toLocaleString('es-AR')}</td>
                          <td className="px-4 py-2 text-sm text-right">${item.precioVentaUsd.toFixed(2)}</td>
                          <td className="px-4 py-2 text-center">
                            <button type="button" onClick={(ev) => { ev.stopPropagation(); addToQuote(item); }} className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                              <FaPlus size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </SectionCard>
        </div>

        <div className="lg:w-96 flex-shrink-0">
          <SectionCard title="Cotización Actual" className="sticky top-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dólar Actual (ARS)</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={dolarActual}
                  onChange={(e) => setDolarActual(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Margen de Ganancia (%)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={margenGanancia}
                  onChange={(e) => setMargenGanancia(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={costoEnPesos} onChange={(e) => setCostoEnPesos(e.target.checked)} className="rounded" />
                <span>COSTO + IVA está en Pesos</span>
              </label>

              <hr className="border-gray-200" />

              <div className="max-h-[280px] overflow-y-auto space-y-2">
                {quoteItems.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Hacé clic en un artículo de la tabla para agregarlo.</p>
                ) : (
                  quoteItems.map((item, idx) => {
                    const precio = precioACobrar(item);
                    return (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.descripcion || item.codigo}</p>
                            <p className="text-xs text-gray-500">
                              Pesos: ${item.precioVentaPesos.toLocaleString('es-AR')} | USD: ${item.precioVentaUsd.toFixed(2)}
                            </p>
                            <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                              Precio a Cobrar: ${Math.round(precio || item.precioVentaPesos).toLocaleString('es-AR')}
                            </p>
                          </div>
                          <button type="button" onClick={() => removeFromQuote(idx)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {quoteItems.length > 0 && (
                <>
                  <hr className="border-gray-200" />
                  <div className="text-sm">
                    <p className="flex justify-between"><span>Total (Excel Pesos):</span> <strong>${totales.totalPesosExcel.toLocaleString('es-AR')}</strong></p>
                    <p className="flex justify-between"><span>Total (Excel USD):</span> <strong>${totales.totalUsdExcel.toFixed(2)}</strong></p>
                    <p className="flex justify-between text-indigo-700 font-bold mt-1"><span>Total Final:</span> ${Math.round(totales.totalACobrar > 0 ? totales.totalACobrar : totales.totalPesosExcel).toLocaleString('es-AR')}</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyQuote}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
                  >
                    <FaCopy /> Copiar Cotización al Portapapeles
                  </button>
                  <button
                    type="button"
                    onClick={openWhatsAppModal}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
                  >
                    <FaWhatsapp /> Enviar Cotización por WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={generarPDF}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-800"
                  >
                    <FaFilePdf /> Imprimir Presupuesto PRO
                  </button>
                  <button type="button" onClick={clearQuote} className="w-full py-2 text-sm text-gray-600 hover:text-gray-800">
                    Vaciar cotización
                  </button>
                </>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Modal WhatsApp */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Enviar Cotización por WhatsApp</h2>
              <button onClick={() => setShowWhatsAppModal(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <FaTimes />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <p className="text-sm text-gray-500 mb-2">Revisá y editá el mensaje. Se abrirá WhatsApp Web para que elijas el contacto.</p>
              <textarea
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                rows={18}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm resize-y"
              />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setShowWhatsAppModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={sendWhatsApp} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <FaWhatsapp /> Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoterPage;
