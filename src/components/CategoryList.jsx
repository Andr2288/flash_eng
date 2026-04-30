import { useState, useEffect, useCallback } from "react";
import {
    Folder,
    Edit,
    Trash2,
    Plus,
    ChevronDown,
    Calendar,
    SortAsc,
    BookOpen,
    Loader,
} from "lucide-react";
import { useCategoryStore } from "../store/useCategoryStore.js";
import { useFlashcardStore } from "../store/useFlashcardStore.js";
import { useUserSettingsStore } from "../store/useUserSettingsStore.js";
import CategoryForm from "./CategoryForm.jsx";
import ConfirmDeleteCategoryModal from "./ConfirmDeleteCategoryModal.jsx";

const CategoryList = ({
    onCategorySelect,
    selectedCategoryId,
    isBootstrapping = false,
}) => {
    const { categories, deleteCategory } = useCategoryStore();
    const { flashcards, getFlashcards } = useFlashcardStore();
    const { updateSetting, getGeneralSettings } = useUserSettingsStore();

    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const generalSettings = getGeneralSettings();
    const [sortBy, setSortBy] = useState(
        generalSettings.categorySortBy || "date"
    );
    const [sortOrder, setSortOrder] = useState(
        generalSettings.categorySortOrder || "desc"
    );

    // Delete confirmation modal states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [categoryProgress, setCategoryProgress] = useState({});

    const calculateFolderProgress = useCallback((categoryCards) => {
        if (!categoryCards || categoryCards.length === 0) {
            return { total: 0, percentage: 0 };
        }

        const totalCards = categoryCards.length;
        const totalPossibleExercises = totalCards * 4;
        let completedExercises = 0;

        categoryCards.forEach((card) => {
            let n = 0;
            if (card.isSentenceCompletionExercise) n++;
            if (card.isMultipleChoiceExercise) n++;
            if (card.isListenAndFillExercise) n++;
            if (card.isListenAndChooseExercise) n++;
            completedExercises += n;
        });

        const percentage =
            totalPossibleExercises > 0
                ? Math.round(
                      (completedExercises / totalPossibleExercises) * 100
                  )
                : 0;

        return { total: totalCards, percentage };
    }, []);

    useEffect(() => {
        const progressMap = {};

        for (const category of categories) {
            const categoryCards = flashcards.filter(
                (card) =>
                    card.categoryId && card.categoryId._id === category._id
            );
            progressMap[category._id] = calculateFolderProgress(categoryCards);
        }

        const uncategorizedCards = flashcards.filter(
            (card) => !card.categoryId
        );
        progressMap.uncategorized = calculateFolderProgress(uncategorizedCards);
        progressMap.all = calculateFolderProgress(flashcards);

        setCategoryProgress(progressMap);
    }, [flashcards, categories, calculateFolderProgress]);

    const getProgressInfo = (categoryId) =>
        categoryProgress[categoryId] || { total: 0, percentage: 0 };

    const handleEdit = (category, e) => {
        e.stopPropagation();
        setEditingCategory(category);
        setShowForm(true);
    };

    const handleDeleteClick = (category, e) => {
        e.stopPropagation();
        setCategoryToDelete(category);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!categoryToDelete) return;

        setIsDeleting(true);
        try {
            await deleteCategory(categoryToDelete._id);
            setShowDeleteModal(false);
            setCategoryToDelete(null);
            await getFlashcards(null, { silent: true });
        } catch (error) {
            // Error handling is done in the store
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        if (!isDeleting) {
            setShowDeleteModal(false);
            setCategoryToDelete(null);
        }
    };

    const handleFormSubmit = async () => {
        setIsSubmitting(true);
        try {
            await getFlashcards(null, { silent: true });
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingCategory(null);
    };

    const handleCategoryClick = (category) => {
        onCategorySelect(category);
    };

    const handleSortChange = (newSortBy) => {
        let newSortOrder = sortOrder;

        if (sortBy === newSortBy) {
            newSortOrder = sortOrder === "asc" ? "desc" : "asc";
        } else {
            setSortBy(newSortBy);
            newSortOrder = newSortBy === "alphabet" ? "asc" : "desc";
        }

        setSortBy(newSortBy);
        setSortOrder(newSortOrder);

        updateSetting("generalSettings.categorySortBy", newSortBy);
        updateSetting("generalSettings.categorySortOrder", newSortOrder);
    };

    const getSortedCategories = () => {
        const sorted = [...categories].sort((a, b) => {
            if (sortBy === "alphabet") {
                const comparison = a.name.localeCompare(b.name, "uk");
                return sortOrder === "asc" ? comparison : -comparison;
            } else {
                // Sort by date
                const aDate = new Date(a.createdAt);
                const bDate = new Date(b.createdAt);
                return sortOrder === "desc" ? bDate - aDate : aDate - bDate;
            }
        });
        return sorted;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("uk-UA", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const pluralizeCards = (n) => {
        if (n % 100 >= 11 && n % 100 <= 14) return "карток";
        if (n % 10 === 1) return "картка";
        if (n % 10 >= 2 && n % 10 <= 4) return "картки";
        return "карток";
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (event) => {
            const isModalOpen = document.querySelector(
                ".fixed.inset-0.bg-gray-600\\/80"
            );
            if (isModalOpen) return;

            const activeElement = document.activeElement;
            const isInputField =
                activeElement &&
                (activeElement.tagName === "INPUT" ||
                    activeElement.tagName === "TEXTAREA" ||
                    activeElement.tagName === "SELECT" ||
                    activeElement.contentEditable === "true");

            if (isInputField) return;

            if (event.ctrlKey && event.code === "Space") {
                event.preventDefault();
                setShowForm(true);
                return;
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, []);

    const CategoryRow = ({
        categoryData,
        isSelected,
        onClick,
        canEdit,
        onEdit,
        onDelete,
    }) => {
        const progress = getProgressInfo(categoryData._id);
        const cardCount = categoryData.flashcardsCount ?? progress.total ?? 0;

        return (
            <div
                onClick={onClick}
                className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 ${
                    isSelected
                        ? "ring-2 ring-opacity-50 shadow-md"
                        : "border-l-transparent hover:border-l-4"
                }`}
                style={{
                    borderLeftColor: isSelected
                        ? categoryData.color
                        : undefined,
                    "--tw-ring-color": categoryData.color + "40",
                }}
                onMouseEnter={(e) => {
                    if (!isSelected) {
                        e.currentTarget.style.borderLeftColor =
                            categoryData.color;
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isSelected) {
                        e.currentTarget.style.borderLeftColor = "transparent";
                    }
                }}
            >
                <div className="px-8 py-5">
                    <div className="flex items-center justify-between">
                        {/* Left side - Main info */}
                        <div className="flex items-center space-x-4 flex-1">
                            {/* Category icon */}
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                                style={{
                                    background: `linear-gradient(135deg, ${categoryData.color}, ${categoryData.color}cc)`,
                                }}
                            >
                                <Folder className="w-6 h-6 text-white" />
                            </div>

                            {/* Category details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-1">
                                    <h3 className="text-lg font-bold text-gray-900 truncate">
                                        {categoryData.name}
                                    </h3>
                                    {categoryData._id !== "all" &&
                                        categoryData._id !==
                                            "uncategorized" && (
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                {formatDate(
                                                    categoryData.createdAt ||
                                                        categoryData.dateText
                                                )}
                                            </span>
                                        )}
                                </div>

                                {categoryData.description && (
                                    <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                                        {categoryData.description}
                                    </p>
                                )}

                                <div className="flex items-center space-x-4 text-sm">
                                    <div className="flex items-center space-x-1 text-gray-700">
                                        <BookOpen className="w-4 h-4" />
                                        <span className="font-medium">
                                            {cardCount}{" "}
                                            {pluralizeCards(cardCount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-6">
                            {progress.total > 0 && (
                                <div className="flex items-center space-x-3">
                                    <div className="relative w-16 h-16">
                                        <svg
                                            className="w-16 h-16 transform -rotate-90"
                                            viewBox="0 0 36 36"
                                        >
                                            <path
                                                className="text-gray-200"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            />
                                            <path
                                                className="text-current"
                                                fill="none"
                                                stroke={categoryData.color}
                                                strokeWidth="2"
                                                strokeDasharray={`${progress.percentage}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-sm font-bold text-gray-700">
                                                {progress.percentage}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {canEdit && (
                                <div className="flex space-x-1">
                                    <button
                                        onClick={(e) => onEdit(categoryData, e)}
                                        className="p-2 bg-white hover:bg-blue-50 text-blue-600 rounded-lg shadow-sm border border-gray-200 transition-colors"
                                        title="Редагувати"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) =>
                                            onDelete(categoryData, e)
                                        }
                                        className="p-2 bg-white hover:bg-red-50 text-red-600 rounded-lg shadow-sm border border-gray-200 transition-colors"
                                        title="Видалити"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const allCategoriesData = {
        _id: "all",
        name: "Всі картки",
        description: "Показати всі флешкартки разом",
        color: "#3B82F6",
        flashcardsCount: flashcards.length,
        createdAt: new Date().toISOString(),
    };

    const uncategorizedData = {
        _id: "uncategorized",
        name: "Без папки",
        description: "Картки які не належать до жодної папки",
        color: "#059669",
        flashcardsCount: flashcards.filter((card) => !card.categoryId).length,
        createdAt: new Date().toISOString(),
    };

    const sortedCategories = getSortedCategories();

    return (
        <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="z-20 min-w-0 shrink-0 bg-white border-b border-gray-200">
                <div className="p-8">
                    <div className="mx-auto flex justify-between items-center">
                        <div className="flex flex-row items-center">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 w-10 h-10 text-white rounded-lg flex items-center justify-center mr-3 shadow-md">
                                <Folder className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Папки
                                </h2>
                                <p className="text-gray-600">
                                    Організуйте свої флешкартки по папках
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Sort controls */}
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-600">
                                    Сортувати:
                                </span>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => handleSortChange("date")}
                                        className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors ${
                                            sortBy === "date"
                                                ? "bg-white text-blue-600 shadow-sm"
                                                : "text-gray-600 hover:text-gray-900"
                                        }`}
                                    >
                                        <Calendar className="w-4 h-4" />
                                        <span>Дата</span>
                                        {sortBy === "date" && (
                                            <ChevronDown
                                                className={`w-3 h-3 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`}
                                            />
                                        )}
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleSortChange("alphabet")
                                        }
                                        className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors ${
                                            sortBy === "alphabet"
                                                ? "bg-white text-blue-600 shadow-sm"
                                                : "text-gray-600 hover:text-gray-900"
                                        }`}
                                    >
                                        <SortAsc className="w-4 h-4" />
                                        <span>А-Я</span>
                                        {sortBy === "alphabet" && (
                                            <ChevronDown
                                                className={`w-3 h-3 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`}
                                            />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                title="Створити нову папку (Ctrl + Space)"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Нова папка</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isBootstrapping ? (
                <div className="flex flex-1 flex-col items-center justify-center min-h-[45vh] gap-4 px-8">
                    <Loader className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="text-sm text-gray-600">
                        Зачекайте, будь ласка
                    </p>
                </div>
            ) : (
                <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8 sm:px-12 lg:px-16 space-y-4 [scrollbar-gutter:stable]">
                    <div className="space-y-4">
                        <CategoryRow
                            categoryData={allCategoriesData}
                            isSelected={!selectedCategoryId}
                            onClick={() => onCategorySelect(null)}
                            canEdit={false}
                        />

                        <CategoryRow
                            categoryData={uncategorizedData}
                            isSelected={selectedCategoryId === "uncategorized"}
                            onClick={() =>
                                onCategorySelect({
                                    _id: "uncategorized",
                                    name: "Без папки",
                                })
                            }
                            canEdit={false}
                        />
                    </div>

                    {sortedCategories.length > 0 && (
                        <div className="pt-8">
                            <h3 className="text-sm font-medium text-gray-500 mb-3">
                                Мої папки ({sortedCategories.length})
                            </h3>
                        </div>
                    )}

                    <div className="space-y-3">
                        {sortedCategories.map((category) => {
                            const categoryData = {
                                ...category,
                                flashcardsCount:
                                    category.flashcardsCount ??
                                    flashcards.filter(
                                        (card) =>
                                            card.categoryId?._id ===
                                            category._id
                                    ).length,
                            };

                            return (
                                <CategoryRow
                                    key={category._id}
                                    categoryData={categoryData}
                                    isSelected={
                                        selectedCategoryId === category._id
                                    }
                                    onClick={() =>
                                        handleCategoryClick(category)
                                    }
                                    canEdit={true}
                                    onEdit={handleEdit}
                                    onDelete={handleDeleteClick}
                                />
                            );
                        })}
                    </div>

                    {sortedCategories.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                            <div className="text-blue-400 mb-4">
                                <Folder className="w-16 h-16 mx-auto" />
                            </div>
                            <h3 className="text-xl font-medium text-gray-900 mb-2">
                                Немає папок
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Створіть свою першу папку для організації карток
                            </p>

                            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mb-6">
                                <span>Швидке створення:</span>
                                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                                    Ctrl
                                </kbd>
                                <span>+</span>
                                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                                    Space
                                </kbd>
                            </div>

                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl inline-flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Створити папку</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Category Form Modal */}
            <CategoryForm
                isOpen={showForm}
                onClose={closeForm}
                editingCategory={editingCategory}
                isLoading={isSubmitting}
                onSubmit={handleFormSubmit}
            />

            {/* Delete Confirmation Modal for Categories */}
            <ConfirmDeleteCategoryModal
                isOpen={showDeleteModal}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                category={categoryToDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default CategoryList;
