import React, { useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FaCamera, FaTimes, FaUpload } from 'react-icons/fa';

const PERSPECTIVE_OPTIONS = ['Frente', 'Abajo', 'Izquierdo', 'Derecho', 'Arriba', 'Atrás'] as const;
const MAX_PHOTOS = 6;

export interface CapturedPhoto {
  file: File;
  label: string;
  dataUrl: string;
}

interface WebcamCaptureProps {
  photos: CapturedPhoto[];
  onPhotosChange: (photos: CapturedPhoto[]) => void;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ photos, onPhotosChange }) => {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const capture = useCallback(() => {
    if (!webcamRef.current || photos.length >= MAX_PHOTOS) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    fetch(imageSrc)
      .then((res) => res.blob())
      .then((blob) => {
        const label = PERSPECTIVE_OPTIONS[photos.length] ?? `Foto ${photos.length + 1}`;
        const file = new File([blob], `foto-${label.toLowerCase().replace(/\s/g, '_')}-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        onPhotosChange([
          ...photos,
          { file, label, dataUrl: imageSrc }
        ]);
      })
      .catch(console.error);
  }, [photos, onPhotosChange]);

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  // DOC2.5: permitir subir fotos desde el dispositivo (archivo/galería)
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
      if (e.target) e.target.value = '';
      if (files.length === 0) return;

      const available = MAX_PHOTOS - photos.length;
      if (available <= 0) return;
      const toAdd = files.slice(0, available);

      const readAsDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      try {
        const newPhotos: CapturedPhoto[] = [];
        for (let i = 0; i < toAdd.length; i++) {
          const file = toAdd[i];
          const dataUrl = await readAsDataUrl(file);
          const idx = photos.length + newPhotos.length;
          const label = PERSPECTIVE_OPTIONS[idx] ?? `Foto ${idx + 1}`;
          newPhotos.push({ file, label, dataUrl });
        }
        onPhotosChange([...photos, ...newPhotos]);
      } catch (err) {
        console.error('Error leyendo archivo de imagen:', err);
      }
    },
    [photos, onPhotosChange]
  );

  const canCapture = photos.length < MAX_PHOTOS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[280px]">
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-200">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'environment', width: 640, height: 480 }}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={capture}
              disabled={!canCapture}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaCamera /> Tomar foto
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canCapture}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Subir imagen desde el dispositivo"
            >
              <FaUpload /> Subir desde archivo
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {photos.length}/{MAX_PHOTOS} fotos cargadas
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-medium text-gray-700 mb-2">Vista previa ({photos.length}/{MAX_PHOTOS})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photos.map((p, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={p.dataUrl}
                  alt={p.label}
                  className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                />
                <select
                  value={p.label}
                  onChange={(e) => {
                    const next = [...photos];
                    next[idx] = { ...next[idx], label: e.target.value };
                    onPhotosChange(next);
                  }}
                  className="absolute bottom-0 left-0 right-8 text-xs bg-black/70 text-white px-1 py-0.5 rounded-b-lg border-0 focus:ring-1"
                >
                  {PERSPECTIVE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-gray-800">{opt}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 shadow"
                >
                  <FaTimes size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebcamCapture;
