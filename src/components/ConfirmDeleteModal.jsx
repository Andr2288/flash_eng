// frontend/src/components/ConfirmDeleteModal.jsx

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

const ConfirmDeleteModal = ({
    isOpen,
    onClose,
    onConfirm,
    cardText,
    isDeleting,
}) => {
    // Обробка хоткізів для модального вікна
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyPress = (event) => {
            // Перевіряємо, чи не заблоковано дії через isDeleting
            if (isDeleting) return;

            // ESC для скасування
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                onClose();
                return;
            }

            // Enter для підтвердження
            if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                onConfirm();
                return;
            }
        };

        // Додаємо обробник подій
        window.addEventListener("keydown", handleKeyPress, { passive: false });

        return () => {
            window.removeEventListener("keydown", handleKeyPress);
        };
    }, [isOpen, isDeleting, onClose, onConfirm]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900/60 via-blue-900/40 to-indigo-900/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="p-8 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Підтвердження видалення
                        </h2>
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="cursor-pointer p-2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                            title="Скасувати (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col gap-4">
                    <p className="text-gray-700">
                        Ви впевнені, що хочете видалити цю флеш картку?
                    </p>

                    {cardText && (
                        <div className="bg-white rounded-lg p-4 border border-l-4 border-red-500">
                            <p className="font-medium text-gray-900 break-words">
                                "{cardText}"
                            </p>
                        </div>
                    )}

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-800 text-sm">
                            <strong>Увага:</strong> Цю дію не можна скасувати.
                            Картка буде видалена назавжди.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-8 border-t border-gray-200 flex space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="min-w-0 flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Скасувати (Esc)"
                    >
                        Скасувати
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="flex flex-1 cursor-pointer items-center justify-center space-x-2 rounded-lg bg-red-600 px-4 py-3 font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
                        title="Підтвердити видалення (Enter)"
                    >
                        {isDeleting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Видалення...</span>
                            </>
                        ) : (
                            <span>Видалити</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
