import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Image as ImageIcon, X, Check, RotateCcw, Folder } from 'lucide-react';

export function InAppCamera({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const [mode, setMode] = useState('choose');
  const [previewSrc, setPreviewSrc] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [loading, setLoading] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // tryPlay: tenta play() com retries para WebView Android
  const tryPlay = useCallback((video, retries = 5) => {
    if (!video) return;
    video.play().catch(() => {
      if (retries > 0) setTimeout(() => tryPlay(video, retries - 1), 150);
    });
  }, []);

  const startCamera = useCallback(async (facing) => {
    const f = facing || facingMode;
    setLoading(true);
    setCameraError(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: f }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      // O <video> agora está permanentemente montado no DOM com layout calculado.
      // Atribuímos o stream diretamente e chamamos play, exatamente como no flip.
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          tryPlay(videoRef.current);
        };
        videoRef.current.oncanplay = () => {
          tryPlay(videoRef.current);
        };
        tryPlay(videoRef.current);
      }

      setMode('camera');
    } catch (err) {
      if (err.name === 'NotAllowedError') setCameraError('Permissão negada. Use a galeria.');
      else if (err.name === 'NotFoundError') setCameraError('Câmera não encontrada. Use a galeria.');
      else setCameraError('Não foi possível abrir a câmera. Use a galeria abaixo.');
      setMode('choose');
    } finally {
      setLoading(false);
    }
  }, [facingMode, stopStream, tryPlay]);

  useEffect(() => () => stopStream(), [stopStream]);

  const handleTakePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const MAX_W = 1024;
    let w = video.videoWidth || 640;
    let h = video.videoHeight || 480;
    if (w > MAX_W) { h = Math.round((h * MAX_W) / w); w = MAX_W; }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, w, h);
    setPreviewSrc(canvas.toDataURL('image/jpeg', 0.82));
    setMode('preview');
    stopStream();
  }, [facingMode, stopStream]);

  const handleFlipCamera = useCallback(() => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        const MAX_W = 1024;
        let w = img.width;
        let h = img.height;
        if (w > MAX_W) { h = Math.round((h * MAX_W) / w); w = MAX_W; }
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        setPreviewSrc(c.toDataURL('image/jpeg', 0.82));
        setMode('preview');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleConfirm = useCallback(() => {
    if (previewSrc && onCapture) onCapture(previewSrc);
  }, [previewSrc, onCapture]);

  const handleRetake = useCallback(() => {
    setPreviewSrc(null);
    setMode('choose');
  }, []);

  const handleClose = useCallback(() => {
    stopStream();
    onClose?.();
  }, [stopStream, onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Modo Câmera: mantido montado com visibility para que a superfície de hardware e o tamanho do <video> existam imediatamente */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          zIndex: mode === 'camera' ? 2 : 0,
          visibility: mode === 'camera' ? 'visible' : 'hidden',
          pointerEvents: mode === 'camera' ? 'auto' : 'none',
        }}
      >
        <button onClick={handleClose} style={{ position: 'absolute', top: '14px', left: '14px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 10 }}>
          <X size={22} />
        </button>
        <button onClick={handleFlipCamera} style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 10 }}>
          <RotateCcw size={20} />
        </button>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ flex: 1, width: '100%', objectFit: 'cover', backgroundColor: '#000', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        <div style={{ padding: '16px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <button onClick={() => { stopStream(); setMode('choose'); setTimeout(() => fileInputRef.current?.click(), 100); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
            <ImageIcon size={24} />
          </button>
          <button onClick={handleTakePhoto} style={{ width: '72px', height: '72px', borderRadius: '50%', border: '4px solid #fff', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(255,255,255,0.4)' }}>
            <div style={{ width: '58px', height: '58px', borderRadius: '50%', backgroundColor: '#fff', border: '3px solid #222' }} />
          </button>
          <div style={{ width: '52px' }} />
        </div>
      </div>

      {/* Modo Escolha */}
      {mode === 'choose' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '40px 24px', width: '100%', maxWidth: '360px', position: 'relative', zIndex: 10 }}>
          <button onClick={handleClose} style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
            <X size={20} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <Camera size={48} color="#10b981" style={{ marginBottom: '10px' }} />
            <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '800', marginBottom: '4px' }}>Adicionar Foto</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Tire uma foto agora ou escolha da galeria</p>
          </div>
          {cameraError && (
            <div style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.8rem', color: '#fca5a5', textAlign: 'center', width: '100%' }}>
              {cameraError}
            </div>
          )}
          <button onClick={() => startCamera()} disabled={loading} style={{ width: '100%', padding: '16px 20px', borderRadius: '14px', border: '2px solid #10b981', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '1rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: loading ? 0.7 : 1 }}>
            <Camera size={22} />
            <span>{loading ? 'Abrindo câmera...' : 'Tirar Foto Agora'}</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: '16px 20px', borderRadius: '14px', border: '2px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.07)', color: '#cbd5e1', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Folder size={22} />
            <span>Escolher da Galeria</span>
          </button>
        </div>
      )}

      {/* Modo Preview */}
      {mode === 'preview' && previewSrc && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 20 }}>
          <img src={previewSrc} alt="Prévia" style={{ flex: 1, width: '100%', objectFit: 'contain', backgroundColor: '#111' }} />
          <div style={{ padding: '16px 20px', display: 'flex', gap: '14px', backgroundColor: '#000' }}>
            <button onClick={handleRetake} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.25)', backgroundColor: 'transparent', color: '#fff', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <RotateCcw size={18} /><span>Tirar Outra</span>
            </button>
            <button onClick={handleConfirm} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Check size={18} /><span>Usar Esta Foto</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
