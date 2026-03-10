const path = require('path');
const fs = require('fs').promises;

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'uploads', 'templates');

const ensureTemplatesDir = async () => {
  try {
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
  } catch (e) {
    console.error('Error creando carpeta templates:', e.message);
  }
};

// GET /api/settings/cloud-contracts — Lista PDFs disponibles
const listCloudContracts = async (req, res) => {
  try {
    await ensureTemplatesDir();
    const files = await fs.readdir(TEMPLATES_DIR);
    const pdfs = files
      .filter((f) => f.toLowerCase().endsWith('.pdf'))
      .map((filename) => ({
        filename,
        label: filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '),
        url: `/uploads/templates/${filename}`
      }));
    res.json({ success: true, data: pdfs });
  } catch (error) {
    console.error('Error listCloudContracts:', error);
    res.status(500).json({ success: false, message: 'Error al listar contratos.' });
  }
};

// POST /api/settings/cloud-contracts — Sube un nuevo PDF (Multer sube a req.file)
const uploadCloudContract = async (req, res) => {
  try {
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ success: false, message: 'No se recibió ningún archivo PDF.' });
    }
    const url = `/uploads/templates/${req.file.filename}`;
    res.status(201).json({
      success: true,
      message: 'Contrato subido correctamente.',
      data: { filename: req.file.filename, url, label: req.file.filename.replace(/\.pdf$/i, '') }
    });
  } catch (error) {
    console.error('Error uploadCloudContract:', error);
    res.status(500).json({ success: false, message: 'Error al subir contrato.' });
  }
};

// DELETE /api/settings/cloud-contracts/:filename — Elimina un PDF
const deleteCloudContract = async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename || /\.\.|\//.test(filename)) {
      return res.status(400).json({ success: false, message: 'Nombre de archivo inválido.' });
    }
    const filePath = path.join(TEMPLATES_DIR, filename);
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado.' });
    }
    await fs.unlink(filePath);
    res.json({ success: true, message: 'Contrato eliminado.' });
  } catch (error) {
    console.error('Error deleteCloudContract:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar contrato.' });
  }
};

module.exports = {
  listCloudContracts,
  uploadCloudContract,
  deleteCloudContract,
  ensureTemplatesDir
};
