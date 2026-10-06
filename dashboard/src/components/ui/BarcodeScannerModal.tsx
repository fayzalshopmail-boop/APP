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
 if (!isOpen) {
 if (scannerRef.current) {
 scannerRef.current.stop().then(() => {
 scannerRef.current?.clear();
 scannerRef.current = null;
 }).catch(console.error);
 }
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

 html5QrCode.start(
 { facingMode: "environment" }, // This forces the back camera
 { 
 fps: 10, 
 qrbox: { width: 280, height: 150 }, // Bounding box for scanning
 // Not specifying formatsToSupport means ALL formats (QR, Barcodes, etc) are supported automatically
 },
 (decodedText) => {
 onScan(decodedText);
 onClose(); // Auto close on successful scan
 },
 (errorMessage) => {
 // Ignored continuously while scanning
 }
 ).catch((err) => {
 console.error(err);
 setError('Could not access the back camera. Please make sure you have granted camera permissions and are using a secure connection (HTTPS).');
 });
 }, 100);

 return () => {
 clearTimeout(timer);
 if (scannerRef.current) {
 scannerRef.current.stop().then(() => {
 scannerRef.current?.clear();
 scannerRef.current = null;
 }).catch(console.error);
 }
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
 <button onClick={onClose} className="p-1.5 bg-gray-800/50 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors">
 <X className="w-4 h-4" />
 </button>
 </DialogHeader>

 <div className="p-2">
 {error ? (
 <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-start gap-3">
 <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
 <p>{error}</p>
 </div>
 ) : (
 <>
 {/* html5-qrcode will mount inside this div */}
 <div id="reader" className="w-full rounded-lg overflow-hidden [&_video]:rounded-lg min-h-[250px] bg-black" />
 <p className="text-center text-xs text-gray-500 mt-4 leading-relaxed">
 Point your back camera at the Barcode, QR Code, or Serial Number.
 </p>
 </>
 )}
 </div>
 </DialogContent>
 </Dialog>
 );
}
