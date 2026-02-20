import { MedicationsManager } from './MedicationsManager';
import { createPortal } from 'react-dom';

interface MedicationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    child: any;
}

export function MedicationsModal({ isOpen, onClose, child }: MedicationsModalProps) {
    if (!isOpen || !child) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl border border-border-light dark:border-gray-800 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-8 py-5 border-b border-border-light dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                        <h3 className="text-2xl font-black text-text-main dark:text-white font-display tracking-tight">Gerenciar Medicações</h3>
                        <p className="text-sm text-text-secondary dark:text-gray-400 font-display">Acompanhamento medicamentoso de {child.full_name}.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <MedicationsManager childId={child.id} />
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-border-light dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="px-8 py-3 border border-border-light dark:border-gray-700 rounded-2xl font-black text-text-secondary uppercase text-xs tracking-widest hover:bg-white transition-all">Fechar</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
