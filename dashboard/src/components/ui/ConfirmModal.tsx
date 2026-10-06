'use client';
import { Input } from '@/components/ui/input';

import {
 Dialog,
 DialogContent,
 DialogTitle,
 DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ConfirmModalProps {
 isOpen: boolean;
 onClose: () => void;
 onConfirm: () => Promise<void> | void;
 title?: string;
 message?: string;
 confirmText?: string;
 cancelText?: string;
 variant?: 'danger' | 'warning';
}

export function ConfirmModal({ 
 isOpen, 
 onClose, 
 onConfirm, 
 title = "Are you sure?", 
 message = "This action cannot be undone. Do you want to proceed?", 
 confirmText = "Confirm", 
 cancelText = "Cancel",
 variant = 'danger'
}: ConfirmModalProps) {
 const [isLoading, setIsLoading] = useState(false);

 const handleConfirm = async () => {
 setIsLoading(true);
 try {
 await onConfirm();
 onClose();
 } catch (error) {
 console.error(error);
 } finally {
 setIsLoading(false);
 }
 };

 const isDanger = variant === 'danger';

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="sm:max-w-[400px] bg-popover text-white border-gray-800 shadow-2xl p-0 overflow-hidden ">
 <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isDanger ? 'from-red-500 to-orange-500' : 'from-orange-500 to-yellow-500'}`} />
 
 <div className="p-6">
 <div className="flex flex-col items-center text-center space-y-4">
 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDanger ? 'bg-red-500/10' : 'bg-orange-500/10'}`}>
 <AlertTriangle className={`w-6 h-6 ${isDanger ? 'text-red-500' : 'text-orange-500'}`} />
 </div>
 
 <div className="space-y-2">
 <DialogTitle className="text-xl font-bold tracking-tight m-0">{title}</DialogTitle>
 <DialogDescription className="text-gray-400 text-sm leading-relaxed">
 {message}
 </DialogDescription>
 </div>
 </div>

 <div className="flex items-center gap-3 mt-8">
 <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1">
 {cancelText}
 </Button>
 <Button 
 onClick={handleConfirm}
 disabled={isLoading}
 className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 
 ${isDanger 
 ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/20' 
 : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-orange-500/20'
 }`}
 >
 {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
 {isLoading ? 'Processing...' : confirmText}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}
