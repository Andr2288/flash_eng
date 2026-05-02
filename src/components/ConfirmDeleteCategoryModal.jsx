// frontend/src/components/ConfirmDeleteCategoryModal.jsx

import { useEffect } from "react";
import { AlertTriangle, X, Folder, Trash2 } from "lucide-react";

/**
 * Форми речення для N карток у папці:
 * — остання цифра 1, але не 11: «буде видалена … картка, яка…»
 * — остання 2–4 і не десятки 12–14 (112 → «карток»), окремо 12–14: «… картки, які…»
 * — інакше (11, 5–10, 15–20, 112…): «буде видалено всі … карток, що…»
 */
function FolderDeleteCardsInFolderWarning({ count }) {
    const n = count;
    const mod10 = n % 10;
    const mod100 = n % 100;
    const isOneForm = mod10 === 1 && mod100 !== 11;
    const isFewForm =
        mod10 >= 2 &&
        mod10 <= 4 &&
        (mod100 < 12 || mod100 > 14 || (n >= 12 && n <= 14));

    if (isOneForm) {
        return (
            <p>
                Разом з папкою буде видалена{" "}
                <strong>
                    {n} картка
                </strong>
                , яка знаходиться в ній.
            </p>
        );
    }

    if (isFewForm) {
        return (
            <p>
                Разом з папкою буде видалено{" "}
                <strong>
                    {n} картки
                </strong>
                , які знаходяться в ній.
            </p>
        );
    }

    return (
        <p>
            Разом з папкою буде видалено всі{" "}
            <strong>
                {n} карток
            </strong>
            , що знаходяться в ній.
        </p>
    );
}

const ConfirmDeleteCategoryModal = ({
    isOpen,
    onClose,
    onConfirm,
    category,
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

    if (!isOpen || !category) return null;

    const handleConfirm = () => {
        onConfirm();
    };

    const flashcardsCount = category.flashcardsCount || 0;
    const folderAccentColor = category.color || "#3B82F6";

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
                            Підтвердження видалення папки
                        </h2>
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="text-gray-400 hover:text-gray-600 p-2 disabled:cursor-not-allowed cursor-pointer"
                            title="Скасувати (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col gap-4">
                    <p className="text-gray-700">
                        Ви впевнені, що хочете видалити цю папку?
                    </p>

                    {/* Category Info */}
                    <div
                        className="bg-white rounded-lg p-4 border border-l-4"
                        style={{ borderColor: folderAccentColor }}
                    >
                        <div className="flex items-center space-x-3">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: folderAccentColor }}
                            >
                                <Folder className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">
                                    {category.name}
                                </p>
                                {category.description && (
                                    <p className="text-sm text-gray-600">
                                        {category.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Warning about flashcards */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                            <Trash2 className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="text-red-800 font-semibold">
                                    Увага!
                                </h4>
                                <div className="text-red-700 text-sm mt-1">
                                    {flashcardsCount > 0 ? (
                                        <FolderDeleteCardsInFolderWarning
                                            count={flashcardsCount}
                                        />
                                    ) : (
                                        <p>
                                            Папка порожня, але її видалення{" "}
                                            <strong>неможливо скасувати</strong>
                                            .
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-8 border-t border-gray-200 flex space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="cursor-pointer flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                        title="Скасувати (Esc)"
                    >
                        Скасувати
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="cursor-pointer flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
                        title="Підтвердити видалення (Enter)"
                    >
                        {isDeleting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Видалення...</span>
                            </>
                        ) : (
                            <>
                                <span>Видалити</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteCategoryModal;
