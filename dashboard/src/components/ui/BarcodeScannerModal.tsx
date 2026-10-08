'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, AlertCircle, ScanText, Loader2, Check } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onScan }: BarcodeScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrCandidates, setOcrCandidates] = useState<string[]>([]);
  const [ocrProgress, setOcrProgress] = useState<string>('');

  useEffect(() => {
    const stopScanner = () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.getState() === 2) {
            scannerRef.current.stop().then(() => {
              scannerRef.current?.clear();
              scannerRef.current = null;
            }).catch(() => {
              scannerRef.current?.clear();
              scannerRef.current = null;
            });
          } else {
            scannerRef.current.clear();
            scannerRef.current = null;
          }
        } catch (err) {
          try { scannerRef.current?.clear(); } catch(e){}
          scannerRef.current = null;
        }
      }
    };

    if (!isOpen) {
      stopScanner();
      setError('');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera API is not supported. Please use a secure connection (HTTPS) or deploy to Firebase.');
      return;
    }

    const timer = setTimeout(() => {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      const startCamera = (facingMode: "environment" | "user") => {
        html5QrCode.start(
          { facingMode },
          { fps: 10, qrbox: { width: 280, height: 150 } },
          (decodedText) => {
            onScan(decodedText);
            onClose();
          },
          (errorMessage) => {
            // Ignored
          }
        ).catch((err) => {
          if (facingMode === "environment") {
            console.warn("Back camera not found, trying front/default camera...", err.name || err.message);
            startCamera("user");
          } else {
            console.warn("Camera fallback failed", err.name || err.message);
            setError('Could not access any camera. Please make sure you have granted camera permissions and have a camera connected.');
          }
        });
      };

      startCamera("environment");
    }, 100);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, onScan, onClose]);

  const handleCaptureText = async () => {
    const video = document.querySelector('#reader video') as HTMLVideoElement;
    if (!video) {
      setError("Camera not ready.");
      return;
    }

    try {
      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');

      // Stop scanner
      if (scannerRef.current) {
        try { if (scannerRef.current.getState() === 2) await scannerRef.current.stop(); } catch(e){}
        try { scannerRef.current.clear(); } catch(e){}
        scannerRef.current = null;
      }

      setIsOcrProcessing(true);
      setOcrProgress('Reading text...');

      const result = await Tesseract.recognize(dataUrl, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(`Reading... ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const text = result.data.text;
      
      // Extract alphanumeric words that look like serial numbers (length >= 5)
      const words = text.split(/[\s\n]+/).map(w => w.replace(/[^A-Za-z0-9\-]/g, ''));
      const candidates = Array.from(new Set(words.filter(w => w.length >= 5 && /[0-9]/.test(w) && /[A-Za-z]/.test(w) || w.length >= 8)));
      
      if (candidates.length > 0) {
        setOcrCandidates(candidates);
      } else {
        setError("No valid serial numbers found in the image. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to read text. Please try again.");
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const retryScanner = () => {
    setError('');
    setOcrCandidates([]);
    // The easiest way to restart is to toggle isOpen by closing and reopening, or just let them close and open again.
    // We can just tell them to close and reopen, or we can restart programmatically.
    onClose(); 
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-popover border-gray-800 text-gray-100 max-w-sm [&>button]:hidden overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-500" />
            <DialogTitle>Scan Barcode / QR</DialogTitle>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-800/50 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-6 flex flex-col items-center">
          {error ? (
            <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">{error}</p>
            </div>
          ) : (
            <div className="w-full aspect-square max-w-[280px] bg-gray-900 rounded-2xl overflow-hidden border-2 border-gray-800 relative">
              <div id="reader" className="w-full h-full" />
              <div className="absolute inset-0 border-2 border-blue-500/30 rounded-2xl pointer-events-none" />
              
              {/* Scanning Animation */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
            </div>
          )}
          
          {!error && ocrCandidates.length === 0 && !isOcrProcessing && (
            <div className="mt-6 flex flex-col items-center w-full">
              <p className="text-gray-400 text-sm text-center mb-4">
                Position barcode/QR code in frame to scan automatically, or capture text:
              </p>
              <button
                onClick={handleCaptureText}
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20"
              >
                <ScanText className="w-4 h-4" />
                Capture Text (S/N)
              </button>
            </div>
          )}

          {isOcrProcessing && (
            <div className="mt-6 flex flex-col items-center w-full p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-white font-medium">{ocrProgress}</p>
              <p className="text-xs text-gray-400 mt-1">Please wait, analyzing image...</p>
            </div>
          )}

          {ocrCandidates.length > 0 && (
            <div className="mt-6 w-full space-y-3">
              <h4 className="text-sm font-semibold text-gray-300">Found possible numbers:</h4>
              <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                {ocrCandidates.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => { onScan(c); onClose(); }}
                    className="w-full text-left bg-popover border border-gray-700 hover:border-blue-500 text-white p-3 rounded-lg flex items-center justify-between transition-colors group"
                  >
                    <span className="font-mono">{c}</span>
                    <Check className="w-4 h-4 text-gray-600 group-hover:text-blue-500" />
                  </button>
                ))}
              </div>
              <button onClick={retryScanner} className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancel & Try Again
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
