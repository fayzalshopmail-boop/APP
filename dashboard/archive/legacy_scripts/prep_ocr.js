const fs = require('fs');
let content = fs.readFileSync('src/components/ui/BarcodeScannerModal.tsx', 'utf8');

const importRegex = /import \{ Camera, X, AlertCircle \} from 'lucide-react';/;
const newImports = `import { Camera, X, AlertCircle, ScanText, Loader2, Check } from 'lucide-react';
import Tesseract from 'tesseract.js';`;
content = content.replace(importRegex, newImports);

const stateRegex = /const \[error, setError\] = useState<string>\(''\);/;
const newState = `const [error, setError] = useState<string>('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrCandidates, setOcrCandidates] = useState<string[]>([]);
  const [ocrProgress, setOcrProgress] = useState<string>('');`;
content = content.replace(stateRegex, newState);

const effectDepRegex = /\}, \[isOpen, onScan, onClose\]\);/;
const effectDepNew = `}, [isOpen, onScan, onClose]);

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
            setOcrProgress(\`Reading... \${Math.round(m.progress * 100)}%\`);
          }
        }
      });

      const text = result.data.text;
      
      // Extract alphanumeric words that look like serial numbers (length >= 5)
      const words = text.split(/[\\s\\n]+/).map(w => w.replace(/[^A-Za-z0-9\\-]/g, ''));
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
  };`;
content = content.replace(effectDepRegex, effectDepNew);


const uiRegex = /\{!error && \([\s\S]*?<p className="text-gray-400 text-sm mt-6 text-center">[\s\S]*?Position the barcode or QR code inside the frame to scan\.[\s\S]*?<\/p>[\s\S]*?\)\}/;
const newUi = `{!error && ocrCandidates.length === 0 && !isOcrProcessing && (
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
          )}`;
content = content.replace(uiRegex, newUi);

fs.writeFileSync('src/components/ui/BarcodeScannerModal.tsx', content);
console.log('Updated scanner with OCR');
