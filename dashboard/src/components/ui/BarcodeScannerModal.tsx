'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onScan }: BarcodeScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');

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
          
          {!error && (
            <p className="text-gray-400 text-sm mt-6 text-center">
              Position the barcode or QR code inside the frame to scan.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
