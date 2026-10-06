'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Settings2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface InventoryManageModalProps {
 isOpen: boolean;
 onClose: () => void;
 title: string;
 options: string[];
 onAdd: (option: string) => Promise<void>;
 onRemove: (option: string) => Promise<void>;
}

export function InventoryManageModal({ isOpen, onClose, title, options, onAdd, onRemove }: InventoryManageModalProps) {
 const [newValue, setNewValue] = useState('');
 
 // Confirm Modal State
 const [confirmModal, setConfirmModal] = useState<{
 isOpen: boolean;
 optionToDelete: string | null;
 }>({ isOpen: false, optionToDelete: null });

 const handleAdd = async (e: React.FormEvent) => {
 e.preventDefault();
 if (newValue.trim()) {
 await onAdd(newValue.trim());
 setNewValue('');
 }
 };

 const handleDeleteRequest = (opt: string) => {
 setConfirmModal({ isOpen: true, optionToDelete: opt });
 };

 const handleConfirmDelete = async () => {
 if (confirmModal.optionToDelete) {
 await onRemove(confirmModal.optionToDelete);
 }
 setConfirmModal({ isOpen: false, optionToDelete: null });
 };

 return (
 <>
 <Dialog open={isOpen && !confirmModal.isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="sm:max-w-[400px] bg-popover text-white border-gray-800 shadow-2xl p-0 overflow-hidden ">
 <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
 
 <div className="p-5">
 <DialogHeader className="mb-4 flex flex-row items-center gap-2">
 <Settings2 className="w-5 h-5 text-blue-400" />
 <DialogTitle className="text-lg font-semibold m-0">Manage {title}</DialogTitle>
 </DialogHeader>

 <form onSubmit={handleAdd} className="flex gap-2 mb-4">
 <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Add new option..." className="flex-1"
 />
 <Button 
 type="submit"
 disabled={!newValue.trim()}
 className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
 >
 <Plus className="w-4 h-4" /> Add
 </Button>
 </form>

 <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
 {options.map((opt) => (
 <div key={opt} className="flex items-center justify-between bg-secondary border border-gray-800 rounded-lg p-3">
 <span className="text-sm text-gray-200">{opt}</span>
 <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-red-400" onClick={() => handleDeleteRequest(opt)}>
 <Trash2 className="w-4 h-4" />
 </Button>
 </div>
 ))}
 {options.length === 0 && (
 <div className="text-center text-sm text-gray-500 py-4">No options added yet.</div>
 )}
 </div>
 
 <div className="mt-5 text-right">
 <Button type="button" variant="secondary" onClick={onClose}>
 Done
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>

 <ConfirmModal 
 isOpen={confirmModal.isOpen}
 onClose={() => setConfirmModal({ isOpen: false, optionToDelete: null })}
 onConfirm={handleConfirmDelete}
 title="Delete Option?"
 message={`Are you sure you want to delete "${confirmModal.optionToDelete}"?`}
 confirmText="Delete"
 />
 </>
 );
}
