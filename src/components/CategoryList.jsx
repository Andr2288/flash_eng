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
import { useCategorySortStore } from "../store/useCategorySortStore.js";
import CategoryForm from "./CategoryForm.jsx";
import ConfirmDeleteCategoryModal from "./ConfirmDeleteCategoryModal.jsx";
import { LoadErrorNotice } from "./LoadErrorNotice.jsx";

const CategoryList = ({
    onCategorySelect,
    selectedCategoryId,
    isBootstrapping = false,
    loadError = false,
}) => {
    const { categories, deleteCategory } = useCategoryStore();
    const { flashcards, getFlashcards } = useFlashcardStore();
    const sortBy = useCategorySortStore((s) => s.sortBy);
    const sortOrder = useCategorySortStore((s) => s.sortOrder);
    const setSort = useCategorySortStore((s) => s.setSort);

    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            newSortOrder = newSortBy === "alphabet" ? "asc" : "desc";
        }

        setSort(newSortBy, newSortOrder);
    };

    const getSortedCategories = () => {
        const sorted = [...categories].sort((a, b) => {
            if (sortBy === "alphabet") {
                const comparison = a.name.localeCompare(b.name, "uk");
                return sortOrder === "asc" ? comparison : -comparison;
            } else {
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
                <div className="px-4 py-4 sm:px-6 sm:py-5 md:px-8">
                    <div className="flex items-start justify-between gap-3 sm:items-center">
                        
                        <div className="flex min-w-0 flex-1 items-center space-x-3 sm:space-x-4">
                            
                            <div
                                className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center shadow-sm sm:h-12 sm:w-12"
                                style={{
                                    background: `linear-gradient(135deg, ${categoryData.color}, ${categoryData.color}cc)`,
                                }}
                            >
                                <Folder className="w-6 h-6 text-white" />
                            </div>

                            
                            <div className="flex-1 min-w-0">
                                <div className="mb-1 flex items-center space-x-2 sm:space-x-3">
                                    <h3 className="truncate text-base font-bold text-gray-900 sm:text-lg">
                                        {categoryData.name}
                                    </h3>
                                    {categoryData._id !== "all" &&
                                        categoryData._id !==
                                            "uncategorized" && (
                                            <span className="hidden shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 sm:inline">
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

                        <div className="flex shrink-0 items-center sm:space-x-6">
                            {canEdit && (
                                <div className="flex space-x-1">
                                    <button
                                        onClick={(e) => onEdit(categoryData, e)}
                                        className="cursor-pointer p-2 bg-white hover:bg-blue-50 text-blue-600 rounded-lg shadow-sm border border-gray-200 transition-colors"
                                        title="Редагувати"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) =>
                                            onDelete(categoryData, e)
                                        }
                                        className="cursor-pointer p-2 bg-white hover:bg-red-50 text-red-600 rounded-lg shadow-sm border border-gray-200 transition-colors"
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
        name: "Без категорії",
        description: "Картки які не належать до жодної категорії",
        color: "#059669",
        flashcardsCount: flashcards.filter((card) => !card.categoryId).length,
        createdAt: new Date().toISOString(),
    };

    const sortedCategories = getSortedCategories();

    return (
        <div className="flex h-app-mobile min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="z-20 min-w-0 shrink-0 bg-white border-b border-gray-200">
                <div className="p-4 sm:p-6 md:p-8">
                    <div className="mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 flex-row items-center">
                            <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
                                <Folder className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                                    Категорії
                                </h2>
                                <p className="text-sm text-gray-600 sm:text-base">
                                    Організуйте свої флешкартки по категоріях
                                </p>
                            </div>
                        </div>

                        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end md:w-auto">
                            
                            <div className="flex items-center justify-between gap-2 sm:justify-start sm:space-x-2">
                                <span className="shrink-0 text-sm text-gray-600">
                                    Сортувати:
                                </span>
                                <div className="flex flex-1 items-center justify-end gap-0.5 rounded-lg bg-gray-100 py-0 sm:flex-none">
                                    <button
                                        onClick={() => handleSortChange("date")}
                                        className={`cursor-pointer flex flex-1 items-center justify-center space-x-1 rounded-md px-2 py-2.5 text-sm transition-colors sm:flex-none sm:px-3 sm:py-3 ${
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
                                        className={`cursor-pointer flex flex-1 items-center justify-center space-x-1 rounded-md px-2 py-2.5 text-sm transition-colors sm:flex-none sm:px-3 sm:py-3 ${
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
                                className="cursor-pointer flex w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white shadow-md transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg sm:w-auto sm:px-6"
                                title="Створити нову категорію (Ctrl + Space)"
                            >
                                <Plus className="w-5 h-5 shrink-0" />
                                <span>Нова категорія</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isBootstrapping ? (
                <div className="flex min-h-[45vh] flex-1 flex-col items-center justify-center gap-4 px-4 sm:px-8">
                    <Loader className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="text-sm text-gray-600">
                        Зачекайте, будь ласка
                    </p>
                </div>
            ) : loadError ? (
                <LoadErrorNotice className="px-8" />
            ) : (
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pt-4 pb-scroll-end [scrollbar-gutter:stable] sm:px-8 sm:pt-8 md:px-12 md:pb-12 md:pt-12 lg:px-16 lg:pb-16 lg:pt-16">
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
                                    name: "Без категорії",
                                })
                            }
                            canEdit={false}
                        />
                    </div>

                    {sortedCategories.length > 0 && (
                        <div className="pt-8">
                            <h3 className="text-sm font-medium text-gray-500 mb-3">
                                Мої категорії ({sortedCategories.length})
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
                                Немає категорій
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Створіть свою першу категорію для організації карток
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
                                <span>Створити категорію</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            
            <CategoryForm
                isOpen={showForm}
                onClose={closeForm}
                editingCategory={editingCategory}
                isLoading={isSubmitting}
                onSubmit={handleFormSubmit}
            />

            
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
