import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Quagga from '@ericblade/quagga2';
import { Camera, CameraOff, RefreshCw, Zap, ZapOff, Keyboard, AlertCircle, ScanLine, X, Lock, ExternalLink, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { playBeep } from './SoundEffects';

const FORMATS_TO_SUPPORT = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF
];

// Strict mathematical validator: confirms check digits for 1D retail barcodes (EAN-13, EAN-8, UPC-A)
// Discards noise, laptop vents, cables, blankets, textures, shadows
function isValidBarcode(rawCode) {
  if (!rawCode) return false;
  const code = String(rawCode).trim();
  if (code.length < 4) return false;

  // 1. EAN-13 (Standard retail packaging worldwide, 13 numeric digits)
  if (/^\d{13}$/.test(code)) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return checksum === parseInt(code[12], 10);
  }

  // 2. UPC-A (Standard retail barcode USA/Universal, 12 numeric digits)
  if (/^\d{12}$/.test(code)) {
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(code[i], 10) * (i % 2 === 0 ? 3 : 1);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return checksum === parseInt(code[11], 10);
  }

  // 3. EAN-8 (Compact retail packaging, 8 numeric digits)
  if (/^\d{8}$/.test(code)) {
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += parseInt(code[i], 10) * (i % 2 === 0 ? 3 : 1);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return checksum === parseInt(code[7], 10);
  }

  // 4. Code 128 / Code 39 / QR Code (Internal SKUs, alphanumeric)
  // Must be at least 4 chars and not repeating identical characters (e.g. '0000', '1111')
  if (code.length >= 4 && !/^(.)\1+$/.test(code)) {
    return true;
  }

  return false;
}

export default function Scanner({
  onScan,
  active = true,
  defaultOpen = false,
  onOpenStateChange,
  modeTitle = 'Scan Barcode or QR Code',
  subText = 'ដាក់បារកូដក្នុងប្រអប់ដើម្បីស្កេន',
  colorAccent = 'blue' // 'blue' or 'emerald'
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isScanning, setIsScanning] = useState(false);
  const [targetLocked, setTargetLocked] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [hasZoom, setHasZoom] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [manualInput, setManualInput] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [isDecodingFile, setIsDecodingFile] = useState(false);

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeDetectorLoopRef = useRef(null);
  const lastScannedCodeRef = useRef('');
  const lastScannedTimeRef = useRef(0);
  const candidateCodeRef = useRef('');
  const candidateHitsRef = useRef(0);
  const containerIdRef = useRef('mobile-barcode-reader');
  const scannerContainerId = containerIdRef.current;

  // Sync defaultOpen changes
  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const handleOpenScanner = () => {
    setIsOpen(true);
    if (onOpenStateChange) onOpenStateChange(true);
  };

  const handleCloseScanner = async () => {
    await stopScanner();
    setIsOpen(false);
    if (onOpenStateChange) onOpenStateChange(false);
  };

  const stopScanner = useCallback(async () => {
    // 1. Cancel intervals & candidate trackers
    if (nativeDetectorLoopRef.current) {
      clearInterval(nativeDetectorLoopRef.current);
      nativeDetectorLoopRef.current = null;
    }
    candidateCodeRef.current = '';
    candidateHitsRef.current = 0;

    // 2. Actively stop ALL video tracks directly on DOM elements
    try {
      const container = document.getElementById(scannerContainerId);
      const videoElements = container ? container.querySelectorAll('video') : document.querySelectorAll('video');
      videoElements.forEach((video) => {
        try {
          if (video.srcObject && typeof video.srcObject.getTracks === 'function') {
            video.srcObject.getTracks().forEach((track) => {
              try {
                track.stop();
                track.enabled = false;
              } catch {}
            });
            video.srcObject = null;
          }
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {}
      });
    } catch (e) {
      console.warn('Track cleanup error:', e);
    }

    // 3. Stop and clear Html5Qrcode
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Stop scanner warning:', err);
      }
      scannerRef.current = null;
    }

    setIsScanning(false);
    setTorchOn(false);
    setTargetLocked(false);
  }, [scannerContainerId]);

  const handleScanSuccess = useCallback((decodedText) => {
    if (!decodedText) return;
    const cleanCode = String(decodedText).trim();
    if (!cleanCode) return;

    // Strict validation: Reject noise, random numbers, false positives
    if (!isValidBarcode(cleanCode)) {
      return;
    }

    const now = Date.now();
    // Prevent duplicate scan within 2 seconds
    if (cleanCode === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 2000) {
      return;
    }

    lastScannedCodeRef.current = cleanCode;
    lastScannedTimeRef.current = now;

    // Visual Target Lock feedback & Cashier Beep
    setTargetLocked(true);
    playBeep('success');
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([40, 30, 40]); } catch {}
    }

    // Give user 350ms visual confirmation: green viewfinder locks on barcode and cashier beep sounds
    setTimeout(async () => {
      // 1. First, cleanly stop all video hardware streams and clear tracks
      await stopScanner();
      // 2. Then close the scanner UI state
      setIsOpen(false);
      if (onOpenStateChange) onOpenStateChange(false);
      // 3. Deliver scanned barcode to parent (modal opens over clean static background)
      onScan(cleanCode);
    }, 350);
  }, [onScan, onOpenStateChange, stopScanner]);

  const startScanner = useCallback(async () => {
    setCameraError(null);
    candidateCodeRef.current = '';
    candidateHitsRef.current = 0;

    try {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch {
          // ignore
        }
        scannerRef.current = null;
      }

      if (nativeDetectorLoopRef.current) {
        clearInterval(nativeDetectorLoopRef.current);
        nativeDetectorLoopRef.current = null;
      }

      const element = document.getElementById(scannerContainerId);
      if (!element) return;

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: FORMATS_TO_SUPPORT,
        verbose: false
      });
      scannerRef.current = html5QrCode;

      // Precision responsive qrbox: bounds ZXing decoding to the center viewfinder area
      // This increases 1D barcode scanline resolution and decoding speed on mobile by 3x!
      const config = {
        fps: 24,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          // Generous responsive area captures full 1D barcodes on cans and boxes with complete quiet zones
          const width = Math.min(Math.floor(viewfinderWidth * 0.94), 420);
          const height = Math.min(Math.floor(viewfinderHeight * 0.72), 300);
          return { width, height };
        },
        aspectRatio: 1.333333,
        videoConstraints: {
          facingMode: facingMode,
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 }
        }
      };

      await html5QrCode.start(
        { facingMode: facingMode },
        config,
        (text) => handleScanSuccess(text),
        () => {
          // Frame error (no code found in frame), safe to ignore
        }
      );

      setIsScanning(true);

      // Check flashlight & optical/digital zoom capabilities
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }

        if (capabilities && capabilities.zoom) {
          setHasZoom(true);
          setMaxZoom(capabilities.zoom.max || 2);
          setZoomLevel(1);
        } else {
          setHasZoom(false);
        }
      } catch {
        setHasTorch(false);
        setHasZoom(false);
      }

      const videoEl = element.querySelector('video');

      // Native Hardware BarcodeDetector API (Edge / Android / Safari 17+)
      if ('BarcodeDetector' in window) {
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats().catch(() => []);
          const formats = supported && supported.length > 0 ? supported : [
            'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'
          ];
          const nativeDetector = new window.BarcodeDetector({ formats });

          if (videoEl) {
            nativeDetectorLoopRef.current = setInterval(async () => {
              if (videoEl.readyState >= 2 && !targetLocked) {
                try {
                  const codes = await nativeDetector.detect(videoEl);
                  if (codes && codes.length > 0 && codes[0].rawValue) {
                    handleScanSuccess(codes[0].rawValue);
                  }
                } catch {
                  // ignore frame error
                }
              }
            }, 120);
          }
        } catch (e) {
          console.warn('Native BarcodeDetector loop init error:', e);
        }
      }
    } catch (err) {
      console.warn('Camera start error:', err);
      setIsScanning(false);
      const errMsg = err?.message || String(err);
      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
        setCameraError('ការអនុញ្ញាតកាមេរ៉ាត្រូវបានបដិសេធ (Camera access denied). សូមបើក permission ក្នុង browser ឬប្រើរូបថត/វាយកូដផ្ទាល់។');
      } else if (errMsg.includes('insecure context') || errMsg.includes('getUserMedia')) {
        setCameraError('កាមេរ៉ាត្រូវការ HTTPS ឬ localhost. អ្នកនៅតែអាច Upload រូបភាព ឬវាយកូដផ្ទាល់បាន!');
      } else {
        setCameraError('មិនអាចបើកកាមេរ៉ាបានទេ (Unable to open camera). សូមប្រើជម្រើសថតរូប ឬវាយលេខកូដ។');
      }
    }
  }, [facingMode, handleScanSuccess, scannerContainerId, targetLocked]);

  useEffect(() => {
    if (active && isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [active, isOpen, facingMode, startScanner, stopScanner]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch error:', err);
    }
  };

  const toggleZoom = async () => {
    if (!scannerRef.current || !hasZoom) return;
    try {
      const nextZoom = zoomLevel === 1 ? Math.min(2, maxZoom) : 1;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ zoom: nextZoom }]
      });
      setZoomLevel(nextZoom);
    } catch (err) {
      console.warn('Zoom error:', err);
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Helper: Quagga2 decode promise helper
  const tryQuagga = (srcUri) => new Promise((resolve) => {
    try {
      Quagga.decodeSingle({
        src: srcUri,
        numOfWorkers: 0,
        inputStream: { size: 1000 },
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'code_128_reader',
            'code_39_reader',
            'upc_reader',
            'upc_e_reader',
            'codabar_reader',
            'i2of5_reader'
          ]
        },
        locate: true
      }, (res) => {
        if (res && res.codeResult && res.codeResult.code) {
          resolve(res.codeResult.code);
        } else {
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });

  // Advanced Multi-Stage Image Barcode Decoder (API + Workarounds)
  const decodeImageWithEnhancements = async (file) => {
    const objectUrl = URL.createObjectURL(file);

    // Load image element
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (e) => reject(e);
      image.src = objectUrl;
    });

    try {
      // 1. Native Browser BarcodeDetector API (Google Chrome / Edge / Android)
      if ('BarcodeDetector' in window) {
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats().catch(() => []);
          const formats = supported && supported.length > 0 ? supported : [
            'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'
          ];
          const detector = new window.BarcodeDetector({ formats });
          const results = await detector.detect(img);
          if (results && results.length > 0 && results[0].rawValue) {
            return results[0].rawValue;
          }
        } catch (err) {
          console.warn('Native BarcodeDetector on image attempt:', err);
        }
      }

      // 2. Try Quagga2 on raw image
      const rawQuagga = await tryQuagga(objectUrl);
      if (rawQuagga) return rawQuagga;

      // 3. Try raw html5-qrcode
      let qrScanner = null;
      try {
        qrScanner = new Html5Qrcode('file-scanner-worker', {
          formatsToSupport: FORMATS_TO_SUPPORT,
          verbose: false
        });
      } catch {
        // ignore
      }

      if (qrScanner) {
        try {
          const direct = await qrScanner.scanFile(file, false);
          if (direct) {
            try { qrScanner.clear(); } catch {}
            return direct;
          }
        } catch {
          // Proceed to canvas preprocessing
        }
      }

      // 4. Preprocessing: Canvas Upscaling + White Quiet Zone (Margin)
      // 1D barcodes REQUIRE at least 10 modules of blank white margin to detect start/stop patterns!
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const scale = Math.max(1, Math.min(4, Math.round(800 / Math.max(img.width, 1))));
      const margin = 60; // 60px pure white margin quiet zone
      canvas.width = Math.round(img.width * scale + margin * 2);
      canvas.height = Math.round(img.height * scale + margin * 2);

      // Fill pure white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, margin, margin, Math.round(img.width * scale), Math.round(img.height * scale));

      // Try Quagga2 on padded canvas
      const paddedDataUrl = canvas.toDataURL('image/png');
      const paddedQuagga = await tryQuagga(paddedDataUrl);
      if (paddedQuagga) return paddedQuagga;

      // Try BarcodeDetector on padded canvas
      if ('BarcodeDetector' in window) {
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats().catch(() => []);
          const detector = new window.BarcodeDetector({ formats: supported });
          const res = await detector.detect(canvas);
          if (res && res.length > 0 && res[0].rawValue) {
            return res[0].rawValue;
          }
        } catch {
          // continue
        }
      }

      // Try html5-qrcode on padded canvas
      const canvasToBlob = (cvs) => new Promise((resolve) => cvs.toBlob(resolve, 'image/png'));
      const paddedBlob = await canvasToBlob(canvas);
      if (paddedBlob) {
        const paddedFile = new File([paddedBlob], 'padded.png', { type: 'image/png' });
        try {
          const paddedResult = await qrScanner.scanFile(paddedFile, false);
          if (paddedResult) return paddedResult;
        } catch {
          // continue to binarized pass
        }
      }

      // 5. High-contrast Grayscale Binarization (for low-light or faded barcodes)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const val = gray < 135 ? 0 : 255;
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }
      ctx.putImageData(imgData, 0, 0);

      const binarizedDataUrl = canvas.toDataURL('image/png');
      const binarizedQuagga = await tryQuagga(binarizedDataUrl);
      if (binarizedQuagga) return binarizedQuagga;

      const binarizedBlob = await canvasToBlob(canvas);
      if (binarizedBlob) {
        const binarizedFile = new File([binarizedBlob], 'binarized.png', { type: 'image/png' });
        try {
          const binarizedResult = await qrScanner.scanFile(binarizedFile, false);
          if (binarizedResult) return binarizedResult;
        } catch {
          // continue
        }
      }

      throw new Error('Barcode unreadable');
    } finally {
      if (qrScanner) {
        try { qrScanner.clear(); } catch {}
      }
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingFile(true);
    try {
      const decodedText = await decodeImageWithEnhancements(file);
      if (decodedText) {
        handleScanSuccess(decodedText);
      }
    } catch {
      playBeep('error');
      alert('⚠️ រូបថតមិនសូវច្បាស់ ឬតូចពេក។ សូមថតឱ្យជិត និងច្បាស់ជាងនេះដើម្បីឱ្យប្រព័ន្ធស្កេនស្វ័យប្រវត្តិ!');
    } finally {
      setIsDecodingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const submitManualCode = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleScanSuccess(manualInput.trim());
      setManualInput('');
      setShowManualModal(false);
    }
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* 1-Tap Switch to HTTPS on Mobile if on HTTP */}
      {typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
        <a
          href={`https://${window.location.hostname}:4443`}
          className="w-full max-w-md mb-2.5 p-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg shadow-blue-600/30 active:scale-[0.98] transition animate-pulse"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Lock size={15} className="text-amber-300" />
            </div>
            <div>
              <p className="leading-tight font-extrabold">បើកកាមេរ៉ាស្កេនស្វ័យប្រវត្តិលើ iPhone</p>
              <p className="text-[10px] text-blue-100 font-normal">ចុចទីនេះដើម្បីប្តូរទៅ HTTPS (ផត 4443)</p>
            </div>
          </div>
          <ExternalLink size={16} className="text-white shrink-0" />
        </a>
      )}

      {/* Viewport Frame when isOpen is true (Real Camera Scanner Viewfinder) */}
      {isOpen ? (
        <div className="relative w-full max-w-md bg-black rounded-3xl overflow-hidden border-2 border-slate-700/60 shadow-2xl aspect-[4/3] flex items-center justify-center animate-in fade-in zoom-in-95">
          {/* Loading Placeholder while camera hardware starts */}
          {!isScanning && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 z-0 pointer-events-none">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2.5 animate-pulse border border-blue-500/20">
                <ScanLine size={32} />
              </div>
              <p className="text-xs font-bold text-slate-200">កំពុងបើកកាមេរ៉ាស្កេន...</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Starting HD Camera Viewfinder...</p>
            </div>
          )}

          {/* html5-qrcode target div */}
          <div id={scannerContainerId} className="scanner-viewport w-full h-full overflow-hidden object-cover bg-transparent relative z-0" />

          {/* REAL CAMERA SCANNER HUD (Clean Minimalist Apple iOS Style) */}
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-between p-4">
            {/* Top Bar Spacer for Floating Controls */}
            <div className="h-10 w-full" />

            {/* Clear Center Cutout Box for Barcode Aiming */}
            <div
              style={{
                width: '82%',
                height: '56%',
                maxWidth: '320px',
                maxHeight: '210px',
                position: 'relative',
                borderRadius: '1.25rem',
                border: targetLocked ? '2.5px solid #10b981' : '1.5px solid rgba(255, 255, 255, 0.65)',
                boxShadow: targetLocked
                  ? '0 0 24px rgba(16, 185, 129, 0.7), 0 0 0 9999px rgba(0, 0, 0, 0.45)'
                  : '0 0 0 9999px rgba(0, 0, 0, 0.42)',
                transition: 'all 0.25s ease',
                backgroundColor: targetLocked ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              }}
              className="flex items-center justify-center my-auto"
            >
              {/* 4 Crisp Minimalist Corner Brackets (Apple iOS Style) */}
              <div
                style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-2px',
                  width: '24px',
                  height: '24px',
                  borderTop: targetLocked ? '3.5px solid #10b981' : '3.5px solid #ffffff',
                  borderLeft: targetLocked ? '3.5px solid #10b981' : '3.5px solid #ffffff',
                  borderTopLeftRadius: '14px',
                  transition: 'border-color 0.2s ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '24px',
                  height: '24px',
                  borderTop: targetLocked ? '3.5px solid #10b981' : '3.5px solid #ffffff',
                  borderRight: targetLocked ? '3.5px solid #10b981' : '3.5px solid #ffffff',
                  borderTopRightRadius: '14px',
                  transition: 'border-color 0.2s ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: '-2px',
                  width: '24px',
                  height: '24px',
                  borderBottom: targetLocked ? '3.5px solid #10b981' : '3.5px solid #ffffff',
                  borderLeft: targetLocked ? '3.5px solid #10b981' : '3.5px solid #ffffff',
                  borderBottomLeftRadius: '14px',
                  transition: 'border-color 0.2s ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '24px',
                  height: '24px',
                  borderBottom: targetLocked ? '3.5px solid #10b981' : '3.5px solid #ffffff',
                  borderRight: targetLocked ? '3.5px solid #10b981' : '3.5px solid #ffffff',
                  borderBottomRightRadius: '14px',
                  transition: 'border-color 0.2s ease',
                }}
              />

              {/* Target Lock Icon overlay when detected */}
              {targetLocked && (
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                  <CheckCircle2 size={32} />
                </div>
              )}
            </div>

            {/* Bottom Status Pill (Clean Minimalist Frosted Glass) */}
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-white text-[11px] font-medium max-w-[92%] truncate mb-1 shadow-lg"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${targetLocked ? 'bg-emerald-400' : 'bg-emerald-400'}`} />
              <span className="truncate">
                {targetLocked ? 'បានស្កេនជោគជ័យ!' : 'កាន់ចម្ងាយ ១៥-២០cm ឱ្យច្បាស់ (កុំកាន់ជិតពេក)'}
              </span>
            </div>
          </div>

          {/* Top Left: Close Scanner Button (Frosted Glass Pill) */}
          <div className="absolute top-3 left-3 z-20">
            <button
              type="button"
              onClick={handleCloseScanner}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-full backdrop-blur-md bg-black/50 hover:bg-black/70 active:scale-95 text-white/90 hover:text-white border border-white/20 shadow-lg text-xs font-semibold transition"
              title="បិទម៉ាស៊ីនស្កេន (Close Scanner)"
            >
              <X size={15} />
              <span>បិទស្កេន</span>
            </button>
          </div>

          {/* Top Right: Camera Controls (Zoom, Flashlight, Flip Camera) */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
            {hasZoom && (
              <button
                type="button"
                onClick={toggleZoom}
                className="px-2.5 py-1.5 rounded-full backdrop-blur-md bg-black/50 hover:bg-black/70 active:scale-95 text-white border border-white/20 shadow-lg text-xs font-bold font-mono transition"
                title="ពង្រីក/បង្រួម កាមេរ៉ា (Zoom)"
              >
                {zoomLevel === 1 ? '1x' : `${zoomLevel}x`}
              </button>
            )}

            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-full backdrop-blur-md border border-white/20 shadow-lg transition active:scale-95 ${
                  torchOn ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-black/50 hover:bg-black/70 text-white'
                }`}
                title="បើក/បិទ ភ្លើង Flash (Flashlight)"
              >
                {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
              </button>
            )}

            <button
              type="button"
              onClick={toggleCameraFacing}
              className="p-2 rounded-full backdrop-blur-md bg-black/50 hover:bg-black/70 active:scale-95 text-white border border-white/20 shadow-lg transition"
              title="ប្តូរកាមេរ៉ា មុខ/ក្រោយ (Flip Camera)"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Closed State: Connected, Clean Modern POS Scanner Card */
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-slate-800 animate-in fade-in space-y-3.5">
          {/* Header: Title, Subtitle, and Format Badge - Fully Connected */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                  {modeTitle}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                {subText || 'ដាក់បារកូដក្នុងប្រអប់ដើម្បីចាប់យកទិន្នន័យ'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-mono text-[10px] font-bold border border-slate-200 shrink-0">
              EAN • QR • UPC
            </span>
          </div>

          {/* Primary Action Button: Large, Clear, No Truncation */}
          <button
            type="button"
            onClick={handleOpenScanner}
            className={`w-full py-3.5 px-4 rounded-2xl text-white text-xs font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 ${
              colorAccent === 'emerald'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
            }`}
          >
            <Camera size={18} />
            <span>បើកកាមេរ៉ាស្កេន (Open Camera Scanner)</span>
          </button>

          {/* Secondary Actions: Clean Integrated Divider & Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {/* Native Photo Capture or Upload */}
            <button
              type="button"
              disabled={isDecodingFile}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition shadow-sm disabled:opacity-50"
            >
              <ImageIcon size={15} className={colorAccent === 'emerald' ? 'text-emerald-600' : 'text-blue-600'} />
              <span>{isDecodingFile ? 'កំពុងស្កេន...' : 'Photo / Gallery'}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Manual Barcode Typing */}
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition shadow-sm"
            >
              <Keyboard size={15} className="text-amber-500" />
              <span>Enter Code</span>
            </button>
          </div>
        </div>
      )}

      {/* Button to Close Scan directly below active camera viewport */}
      {isOpen && (
        <button
          type="button"
          onClick={handleCloseScanner}
          className="w-full max-w-md mt-2 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition shadow-sm"
        >
          <CameraOff size={15} />
          <span>បិទកាមេរ៉ាស្កេន (Close Scan)</span>
        </button>
      )}

      {/* Camera Error / Warning Banner */}
      {cameraError && (
        <div className="w-full max-w-md mt-2.5 p-4 bg-amber-50 border border-amber-200 rounded-3xl text-amber-900 text-xs shadow-sm space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-sm">ហេតុអ្វីមិនអាចបើកកាមេរ៉ាលើ iPhone?</p>
              <p className="mt-0.5 text-slate-600 leading-relaxed text-[11px]">
                Apple (iOS Safari/Brave) តម្រូវឱ្យប្រើ <strong>HTTPS</strong> ដើម្បីបើកកាមេរ៉ាផ្សាយផ្ទាល់។
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-amber-200/80 space-y-1.5 text-[11px] shadow-sm">
            <p className="font-bold text-emerald-700">✅ វិធីដោះស្រាយងាយៗ (២ ជម្រើស):</p>
            <p className="text-slate-700">
              <strong>ជម្រើសទី ១:</strong> ចុចប៊ូតុង <strong>"Photo / Gallery"</strong> ខាងលើ ដើម្បីថតរូបបារកូដផ្ទាល់។
            </p>
            <p className="text-slate-700">
              <strong>ជម្រើសទី ២:</strong> បើកតាមតំណភ្ជាប់ HTTPS (ផត 4443):{' '}
              <a
                href={`https://${window.location.hostname}:4443`}
                className="text-blue-600 underline font-mono font-bold"
              >
                https://{window.location.hostname}:4443
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Manual Code Input Modal (Clean Light Mode) */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Keyboard size={18} className="text-amber-500" />
                បញ្ចូលកូដដោយដៃ (Manual Code)
              </h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-full hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              វាយ ឬបិទភ្ជាប់លេខបារកូដ (ឧ. 8847100741219 ឬ 91234567890):
            </p>
            <form onSubmit={submitManualCode} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="វាយលេខកូដបារកូដ..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-mono text-center tracking-wider text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="flex-1 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-md shadow-blue-600/30"
                >
                  យល់ព្រម
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invisible worker container for file uploads without affecting camera DOM */}
      <div id="file-scanner-worker" style={{ display: 'none' }} />
    </div>
  );
}