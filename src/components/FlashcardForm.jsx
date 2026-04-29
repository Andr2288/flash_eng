import { useState, useEffect, useCallback, useRef } from "react";
import {
    Save,
    X,
    Folder,
    BookOpen,
} from "lucide-react";
import { useCategoryStore } from "../store/useCategoryStore.js";
import { useUserSettingsStore } from "../store/useUserSettingsStore.js";
import { generateCompleteFlashcard } from "../store/features/vocabularyWords/vocabularyWordsApi.js";
import toast from "react-hot-toast";

const FlashcardForm = ({
    isOpen,
    onClose,
    onSubmit,
    editingCard,
    isLoading,
    preselectedCategoryId,
    initialText,
}) => {
    const { categories, getCategories, getCategoryById } = useCategoryStore();
    const {
        loadSettings,
        getDefaultEnglishLevel,
        getChatGPTModel,
    } = useUserSettingsStore();

    // State for form data
    const [formData, setFormData] = useState({
        text: "",
        transcription: "",
        translation: "",
        shortDescription: "",
        explanation: "",
        examples: ["", "", ""],
        notes: "",
        isAIGenerated: false,
        categoryId: "",
    });

    const [settingsLoaded, setSettingsLoaded] = useState(false);

    const [englishLevel, setEnglishLevel] = useState(null);

    // Auto-save state for quick creation
    const [isQuickCreating, setIsQuickCreating] = useState(false);

    // Ref for auto-focus
    const textInputRef = useRef(null);

    // Load categories and settings when form opens
    useEffect(() => {
        if (isOpen) {
            getCategories();
            initializeSettings();

            // Auto-focus on text field after a small delay
            setTimeout(() => {
                if (textInputRef.current) {
                    textInputRef.current.focus();
                }
            }, 100);
        }
    }, [isOpen, getCategories]);

    const initializeSettings = async () => {
        try {
            await loadSettings();
            setSettingsLoaded(true);
            setEnglishLevel(getDefaultEnglishLevel());
        } catch (error) {
            console.error("Failed to load settings:", error);
            setSettingsLoaded(true);
            setEnglishLevel("B1");
        }
    };

    useEffect(() => {
        if (editingCard) {
            let examples = ["", "", ""];
            if (editingCard.examples && Array.isArray(editingCard.examples)) {
                examples = [...editingCard.examples];
                while (examples.length < 3) {
                    examples.push("");
                }
                examples = examples.slice(0, 3);
            } else if (editingCard.example) {
                examples[0] = editingCard.example;
            }

            setFormData({
                text: editingCard.text || "",
                transcription: editingCard.transcription || "",
                translation: editingCard.translation || "",
                shortDescription: editingCard.shortDescription || "",
                explanation: editingCard.explanation || "",
                examples: examples,
                notes: editingCard.notes || "",
                isAIGenerated: editingCard.isAIGenerated || false,
                categoryId: editingCard.categoryId?._id || "",
            });
        } else {
            setFormData({
                text: initialText || "",
                transcription: "",
                translation: "",
                shortDescription: "",
                explanation: "",
                examples: ["", "", ""],
                notes: "",
                isAIGenerated: false,
                categoryId: preselectedCategoryId || "",
            });
        }
    }, [editingCard, isOpen, preselectedCategoryId, initialText]);

    const saveEditedCard = async () => {
        if (!formData.text.trim()) {
            return;
        }

        try {
            const submitData = {
                ...formData,
                categoryId: formData.categoryId || null,
                examples: formData.examples.filter((ex) => ex.trim()),
            };

            await onSubmit(submitData);
            onClose();
        } catch (error) {
            console.error("Error submitting form:", error);
        }
    };

    const handleInputChange = (field, value) => {
        // Капіталізація першої букви для перекладу
        if (field === "translation" && value) {
            value = value.charAt(0).toUpperCase() + value.slice(1);
        }

        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleClose = () => {
        onClose();
    };

    const getCategoryContextInfo = () => {
        const currentCategoryId = formData.categoryId;
        if (!currentCategoryId || currentCategoryId === "uncategorized") {
            return null;
        }

        const category = getCategoryById(currentCategoryId);
        if (!category) {
            return null;
        }

        return {
            categoryId: category._id,
            categoryName: category.name,
            categoryDescription: category.description || "",
        };
    };

    const buildCategoryPromptContext = () => {
        const categoryContext = getCategoryContextInfo();
        if (!categoryContext) return "";

        let context = `\n\nCategory context:\n- Name: ${categoryContext.categoryName}`;
        if (categoryContext.categoryDescription) {
            context += `\n- Description: ${categoryContext.categoryDescription}`;
        }
        return context;
    };

    // Validate text field
    const validateTextField = () => {
        const text = formData.text.trim();

        if (!text) {
            toast.error("Введіть слово або фразу для створення картки");
            return false;
        }

        if (text.length < 1) {
            toast.error("Слово або фраза занадто коротка");
            return false;
        }

        if (text.length > 200) {
            toast.error(
                "Слово або фраза занадто довга (максимум 200 символів)"
            );
            return false;
        }

        return true;
    };

    function capitalizeFirstLetter(str) {
        if (!str) return "";
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    const quickCreateFlashcard = async () => {
        if (!validateTextField()) {
            return;
        }

        if (!englishLevel) {
            setEnglishLevel("B1");
        }

        setIsQuickCreating(true);

        try {
            const categoryContext = getCategoryContextInfo();
            const aiContent = await generateCompleteFlashcard({
                text: formData.text.trim(),
                englishLevel: englishLevel || "B1",
                categoryContext: buildCategoryPromptContext(),
                model: getChatGPTModel() || "gpt-4o-mini",
            });

            let examples = [];
            if (aiContent.examples && Array.isArray(aiContent.examples)) {
                examples = aiContent.examples.filter((ex) => ex && ex.trim());
            } else if (aiContent.example) {
                examples = [aiContent.example];
            }

            aiContent.translation = capitalizeFirstLetter(
                aiContent.translation
            );
            aiContent.shortDescription = capitalizeFirstLetter(
                aiContent.shortDescription
            );
            aiContent.explanation = capitalizeFirstLetter(
                aiContent.explanation
            );
            const aiNotes =
                capitalizeFirstLetter(aiContent.notes || "") || "";
            const userNotesTrim = (formData.notes || "").trim();
            const notesForSubmit = userNotesTrim
                ? formData.notes
                : aiNotes;

            const submitData = {
                text: formData.text.trim(),
                transcription: aiContent.transcription || "",
                translation: aiContent.translation || "",
                shortDescription: aiContent.shortDescription || "",
                explanation: aiContent.explanation || "",
                examples: examples,
                notes: notesForSubmit,
                isAIGenerated: true,
                categoryId: formData.categoryId || null,
            };

            await onSubmit(submitData);

            onClose();
        } catch (error) {
            console.error("Error in quick create:", error);

            let errorMessage = "Помилка швидкого створення картки";

            if (error.response?.status === 401) {
                errorMessage = "API ключ недійсний. Перевірте налаштування";
            } else if (error.response?.status === 402) {
                errorMessage = "Недостатньо кредитів OpenAI";
            } else if (error.response?.status === 429) {
                errorMessage = "Перевищено ліміт запитів OpenAI";
            } else if (error.response?.status === 500) {
                errorMessage = "OpenAI API не налаштований";
            } else if (
                String(error?.message || "").includes("VITE_OPENAI_API_KEY")
            ) {
                errorMessage = "Додай VITE_OPENAI_API_KEY у .env";
            }

            toast.error(errorMessage);
        } finally {
            setIsQuickCreating(false);
        }
    };

    const handlePrimaryAction = async (e) => {
        e?.preventDefault();
        if (editingCard) {
            await saveEditedCard();
        } else {
            await quickCreateFlashcard();
        }
    };

    // Обробка клавіш
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyPress = (event) => {
            // ESC для закриття форми
            if (event.key === "Escape") {
                event.preventDefault();
                if (!isQuickCreating) {
                    handleClose();
                }
                return;
            }

            // Ctrl + Space для швидкого створення картки
            if (event.ctrlKey && event.code === "Space") {
                event.preventDefault();
                if (!isQuickCreating) {
                    quickCreateFlashcard();
                }
                return;
            }

            const activeElement = document.activeElement;
            const isInputField =
                activeElement &&
                (activeElement.tagName === "INPUT" ||
                    activeElement.tagName === "TEXTAREA" ||
                    activeElement.tagName === "SELECT" ||
                    activeElement.contentEditable === "true");

            if (isInputField) return;
        };

        window.addEventListener("keydown", handleKeyPress, { passive: false });

        return () => {
            window.removeEventListener("keydown", handleKeyPress);
        };
    }, [isOpen, formData, isQuickCreating]);

    if (!isOpen) return null;

    const categoryContextInfo = getCategoryContextInfo();

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900/60 via-blue-900/40 to-indigo-900/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-100">
                {/* Fixed Header */}
                <div className="sticky top-0 bg-white p-8 border-b border-blue-100 rounded-t-2xl z-10 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                    {editingCard
                                        ? "Редагувати картку"
                                        : "Створити нову картку"}
                                </h2>
                                <div className="flex items-center space-x-4 mt-1">
                                    {settingsLoaded && (
                                        <p className="text-sm text-gray-600">
                                            Рівень англійської:{" "}
                                            <span className="font-semibold text-blue-600">
                                                {englishLevel}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 hover:bg-white/80 p-2 rounded-xl transition-all duration-200 hover:scale-110 cursor-pointer"
                            title="Закрити (Esc)"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-white">
                    <form
                        id="flashcard-form"
                        onSubmit={handlePrimaryAction}
                        className="p-8 space-y-6"
                    >
                        {/* Word/Text */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                Слово/Фраза{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                ref={textInputRef}
                                type="text"
                                value={formData.text}
                                onChange={(e) => {
                                    const value = e.target.value.replace(
                                        /[\r\n]+/g,
                                        " "
                                    );
                                    const capitalized =
                                        value.length > 0
                                            ? value.charAt(0).toUpperCase() +
                                              value.slice(1)
                                            : "";
                                    handleInputChange("text", capitalized);
                                }}
                                placeholder="Введіть слово або фразу..."
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300 text-gray-900 placeholder-gray-500"
                                maxLength={200}
                                required
                                disabled={isQuickCreating}
                                autoComplete="off"
                            />
                        </div>

                        {/* Category Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                Папка
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Folder className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) =>
                                        handleInputChange(
                                            "categoryId",
                                            e.target.value
                                        )
                                    }
                                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white transition-all duration-200 hover:border-gray-300 text-gray-900"
                                >
                                    <option value="">Без папки</option>
                                    {categories.map((category) => (
                                        <option
                                            key={category._id}
                                            value={category._id}
                                        >
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {/* Додаткова інформація про категорію */}
                            {categoryContextInfo &&
                                categoryContextInfo.categoryDescription && (
                                    <p className="text-xs text-gray-600 mt-2 italic">
                                        Опис теми:{" "}
                                        {
                                            categoryContextInfo.categoryDescription
                                        }
                                    </p>
                                )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                Особисті нотатки
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) =>
                                    handleInputChange("notes", e.target.value)
                                }
                                placeholder="Ваші особисті нотатки, підказки для запам'ятовування..."
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100 transition-all duration-200 bg-white hover:border-gray-300 text-gray-900 placeholder-gray-500"
                                rows="3"
                                disabled={isQuickCreating}
                            />
                        </div>
                    </form>
                </div>

                {/* Fixed Footer */}
                <div className="sticky bottom-0 bg-white p-8 border-t border-gray-200 rounded-b-2xl flex-shrink-0">
                    <div className="flex space-x-4">
                        <button
                            type="submit"
                            form="flashcard-form"
                            disabled={
                                isLoading ||
                                !formData.text.trim() ||
                                isQuickCreating
                            }
                            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-blue-400 disabled:to-blue-500 disabled:cursor-default text-white px-6 py-3 rounded-md font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 cursor-pointer"
                        >
                            {isLoading || isQuickCreating ? (
                                <>
                                    <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    <span>
                                        {isQuickCreating
                                            ? "Створення картки…"
                                            : "Збереження…"}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    <span>
                                        {editingCard
                                            ? "Зберегти зміни"
                                            : "Створити картку"}
                                    </span>
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isQuickCreating}
                            className="px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 disabled:from-gray-100 disabled:to-gray-100 text-gray-700 rounded-md font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none border border-gray-200"
                        >
                            Скасувати
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlashcardForm;
