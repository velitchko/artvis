import React, { useEffect } from 'react';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    maxWidth = 'md' 
}) => {
    // Handle ESC key to close modal
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl'
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />
            
            {/* Modal Container */}
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 lg:p-8">
                <div 
                    className={`relative bg-white border-2 border-black w-full ${maxWidthClasses[maxWidth]} transform transition-all mx-auto max-h-[90vh] flex flex-col`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-black bg-white">
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-black">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-black hover:text-gray-600 font-bold text-xl sm:text-2xl w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border-2 border-black bg-white hover:bg-gray-50 transition-colors"
                            title="Close modal"
                        >
                            ×
                        </button>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
