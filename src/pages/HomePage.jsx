import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useFlashcardStore } from "../store/useFlashcardStore.js";
import { useCategoryStore } from "../store/useCategoryStore.js";
import { useUserSettingsStore } from "../store/useUserSettingsStore.js";
import {
    Plus,
    Edit,
    Trash2,
    BookOpen,
    Grid3X3,
    Eye,
    Folder,
    ArrowLeft,
    Search,
    X,
    Loader,
} from "lucide-react";
import DetailedFlashcardView from "../components/DetailedFlashcardView.jsx";
import FlashcardForm from "../components/FlashcardForm.jsx";
import CategoryList from "../components/CategoryList.jsx";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal.jsx";
import { useNavReselectStore } from "../store/useNavReselectStore.js";

const HomePage = () => {
    const {
        flashcards,
        allFlashcards: storeAllFlashcards,
        isLoading: isLoadingFlashcards,
        getFlashcards,
        createFlashcard,
        updateFlashcard,
        deleteFlashcard,
        setCategoryFilter,
    } = useFlashcardStore();

    const existingFlashcardsForForm = useMemo(() => {
        const byId = new Map();
        for (const c of [
            ...(storeAllFlashcards || []),
            ...(flashcards || []),
        ]) {
            if (c?._id) {
                byId.set(c._id, c);
            }
        }
        return Array.from(byId.values());
    }, [storeAllFlashcards, flashcards]);

    const { getCategories } = useCategoryStore();

    const { loadSettings, areSettingsLoaded } = useUserSettingsStore();

    const [currentView, setCurrentView] = useState("categories");
    const [flashcardViewMode, setFlashcardViewMode] = useState("grid");
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [editingCard, setEditingCard] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCategoryData, setSelectedCategoryData] = useState(null);

    const [searchQuery, setSearchQuery] = useState("");

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [cardToDelete, setCardToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [allFlashcards, setAllFlashcards] = useState([]);

    const [isAppInitialized, setIsAppInitialized] = useState(false);
    const [initializationStarted, setInitializationStarted] = useState(false);
    const [isNavRefreshLoading, setIsNavRefreshLoading] = useState(false);

    const homeNavReselect = useNavReselectStore((s) => s.bumps["/"] ?? 0);
    const lastHomeNavReselectRef = useRef(null);

    const refreshCategoriesScreenData = useCallback(async () => {
        setIsNavRefreshLoading(true);
        try {
            await getCategories();
            await getFlashcards();
        } catch (error) {
            console.error(
                "❌ HomePage: categories screen refresh failed:",
                error
            );
        } finally {
            setIsNavRefreshLoading(false);
        }
    }, [getCategories, getFlashcards]);

    const filteredFlashcards = useMemo(() => {
        if (!searchQuery.trim()) {
            return flashcards;
        }

        const query = searchQuery.toLowerCase().trim();
        return flashcards.filter((card) => {
            return (
                card.text.toLowerCase().includes(query) ||
                card.translation?.toLowerCase().includes(query) ||
                card.shortDescription?.toLowerCase().includes(query) ||
                card.explanation?.toLowerCase().includes(query) ||
                card.notes?.toLowerCase().includes(query) ||
                (card.examples &&
                    card.examples.some((ex) =>
                        ex.toLowerCase().includes(query)
                    ))
            );
        });
    }, [flashcards, searchQuery]);

    useEffect(() => {
        const initializeApp = async () => {
            if (initializationStarted) {
                return;
            }

            setInitializationStarted(true);

            try {
                if (!areSettingsLoaded()) {
                    try {
                        await loadSettings();
                    } catch (settingsError) {
                        console.warn(
                            "⚠️ HomePage: Settings loading failed, will use defaults:",
                            settingsError
                        );
                    }
                }

                await getCategories();

                if (currentView === "categories") {
                    await getFlashcards();
                }

                setIsAppInitialized(true);
            } catch (error) {
                console.error("❌ HomePage: App initialization failed:", error);
                setIsAppInitialized(true);
            }
        };

        initializeApp();
    }, []);

    useEffect(() => {
        if (lastHomeNavReselectRef.current === null) {
            lastHomeNavReselectRef.current = homeNavReselect;
            return;
        }
        if (homeNavReselect === lastHomeNavReselectRef.current) {
            return;
        }
        lastHomeNavReselectRef.current = homeNavReselect;
        if (homeNavReselect === 0) {
            return;
        }
        setCurrentView("categories");
        setSelectedCategoryData(null);
        setCategoryFilter(null);
        setCurrentCardIndex(0);
        setSearchQuery("");
        void refreshCategoriesScreenData();
    }, [homeNavReselect, refreshCategoriesScreenData, setCategoryFilter]);

    useEffect(() => {
        return () => {
            setInitializationStarted(false);
            setIsAppInitialized(false);
        };
    }, []);

    useEffect(() => {
        if (currentView === "categories") {
            setAllFlashcards(flashcards);
        }
    }, [flashcards, currentView]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (!isAppInitialized) {
                console.warn(
                    "⏰ HomePage: Initialization timeout - forcing app to load with defaults"
                );
                setIsAppInitialized(true);
            }
        }, 10000);

        return () => clearTimeout(timeoutId);
    }, [isAppInitialized]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();

        if (!searchQuery.trim()) {
            return;
        }

        const found = filteredFlashcards;

        if (found.length === 0) {
            setEditingCard(null);
            setShowForm(true);
        } else if (found.length === 1) {
            const cardIndex = flashcards.findIndex(
                (card) => card._id === found[0]._id
            );
            if (cardIndex >= 0) {
                setCurrentCardIndex(cardIndex);
                setFlashcardViewMode("detailed");
                setSearchQuery("");
            }
        }
    };

    const clearSearch = () => {
        setSearchQuery("");
    };

    const handleBackToCategories = useCallback(() => {
        setCurrentView("categories");
        setSelectedCategoryData(null);
        setCategoryFilter(null);
        setCurrentCardIndex(0);
        setSearchQuery("");
        void refreshCategoriesScreenData();
    }, [setCategoryFilter, refreshCategoriesScreenData]);

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
                    activeElement.contentEditable === "true");

            if (isInputField) return;

            if (event.key === "Escape") {
                event.preventDefault();
                if (searchQuery) {
                    clearSearch();
                } else if (currentView === "flashcards") {
                    handleBackToCategories();
                }
                return;
            }

            if (event.ctrlKey && event.code === "Space") {
                event.preventDefault();
                if (currentView === "flashcards") {
                    setShowForm(true);
                }
                return;
            }

            if (event.ctrlKey && event.code === "KeyF") {
                if (
                    currentView === "flashcards" &&
                    flashcardViewMode === "grid"
                ) {
                    const searchInput = document.getElementById("search-input");
                    if (searchInput) {
                        event.preventDefault();
                        searchInput.focus();
                        return;
                    }
                }
                return;
            }

            if (
                event.key === "s" ||
                event.key === "S" ||
                event.key === "ы" ||
                event.key === "Ы" ||
                event.key === "і" ||
                event.key === "І"
            ) {
                if (currentView === "flashcards" && flashcards.length > 0) {
                    toggleViewMode();
                }
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [
        currentView,
        flashcards,
        flashcardViewMode,
        searchQuery,
        handleBackToCategories,
    ]);

    const handleCategorySelect = (category) => {
        setSelectedCategoryData(category);
        setCurrentView("flashcards");
        setCurrentCardIndex(0);
        setSearchQuery("");

        if (category) {
            if (category._id === "uncategorized") {
                getFlashcards("uncategorized");
                setCategoryFilter("uncategorized");
            } else {
                getFlashcards(category._id);
                setCategoryFilter(category._id);
            }
        } else {
            getFlashcards();
            setCategoryFilter(null);
        }
    };

    const handleCreateSubmit = async (formData) => {
        setIsSubmitting(true);
        try {
            const result = await createFlashcard(formData);

            if (result && result.newIndex >= 0) {
                setCurrentCardIndex(result.newIndex);
                setFlashcardViewMode("detailed");
            }
        } catch (error) {
            console.error("Error creating flashcard:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditSubmit = async (formData) => {
        if (!editingCard) return;

        setIsSubmitting(true);
        try {
            await updateFlashcard(editingCard._id, formData);
            setEditingCard(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (card) => {
        setEditingCard(card);
        setShowForm(true);
    };

    const handleDeleteClick = (card) => {
        setCardToDelete(card);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!cardToDelete) return;

        setIsDeleting(true);
        try {
            await deleteFlashcard(cardToDelete._id);

            const deletedIndex = flashcards.findIndex(
                (card) => card._id === cardToDelete._id
            );
            if (deletedIndex >= 0 && currentCardIndex >= deletedIndex) {
                const newIndex = Math.max(0, currentCardIndex - 1);
                setCurrentCardIndex(newIndex);
            }

            setShowDeleteModal(false);
            setCardToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        if (!isDeleting) {
            setShowDeleteModal(false);
            setCardToDelete(null);
        }
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingCard(null);
    };

    const toggleViewMode = () => {
        setFlashcardViewMode(
            flashcardViewMode === "grid" ? "detailed" : "grid"
        );
    };

    const handleCardClick = (cardIndex) => {
        let actualIndex = cardIndex;

        if (searchQuery.trim()) {
            const selectedCard = filteredFlashcards[cardIndex];
            actualIndex = flashcards.findIndex(
                (card) => card._id === selectedCard._id
            );
        }

        setCurrentCardIndex(actualIndex);
        setFlashcardViewMode("detailed");
        setSearchQuery("");
    };

    const getCategoryTitle = () => {
        if (!selectedCategoryData) return "Всі флешкартки";
        if (selectedCategoryData._id === "uncategorized") return "Без папки";
        return selectedCategoryData.name;
    };

    const getCategoryColor = () => {
        if (
            !selectedCategoryData ||
            selectedCategoryData._id === "uncategorized"
        )
            return "#6B7280";
        return selectedCategoryData.color || "#3B82F6";
    };

    const getPreselectedCategoryId = () => {
        if (
            !selectedCategoryData ||
            selectedCategoryData._id === "uncategorized"
        )
            return null;
        return selectedCategoryData._id;
    };

    const cardsToDisplay = searchQuery.trim() ? filteredFlashcards : flashcards;

    return (
        <div className="ml-68 min-h-screen min-w-0 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
            {currentView === "categories" ? (
                <div className="min-w-0">
                    <CategoryList
                        onCategorySelect={handleCategorySelect}
                        selectedCategoryId={selectedCategoryData?._id}
                        isBootstrapping={
                            !isAppInitialized || isNavRefreshLoading
                        }
                    />
                </div>
            ) : (
                <div className="flex h-[100dvh] min-h-0 w-full min-w-0 max-h-[100dvh] flex-col overflow-hidden">
                    <div className="z-30 min-w-0 shrink-0 border-b border-l border-gray-200 bg-white">
                        <div className="p-8">
                            <div className="max-w-7xl mx-auto flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={handleBackToCategories}
                                        className="cursor-pointer hover:bg-blue-50 p-2 rounded-xl transition-colors"
                                        title="Повернутися до папок (Esc)"
                                    >
                                        <ArrowLeft className="w-6 h-6 text-blue-600" />
                                    </button>

                                    <div className="flex items-center space-x-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md"
                                            style={{
                                                background: `linear-gradient(to right, ${getCategoryColor()}, ${getCategoryColor()}dd)`,
                                            }}
                                        >
                                            <Folder className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h1 className="text-xl font-bold text-gray-900">
                                                {getCategoryTitle()}
                                            </h1>
                                            <p className="text-gray-600">
                                                {searchQuery.trim()
                                                    ? `${cardsToDisplay.length} з ${flashcards.length} карток (пошук)`
                                                    : `${flashcards.length} ${
                                                          flashcards.length %
                                                              100 >=
                                                              11 &&
                                                          flashcards.length %
                                                              100 <=
                                                              14
                                                              ? "карток"
                                                              : flashcards.length %
                                                                      10 ===
                                                                  1
                                                                ? "картка"
                                                                : flashcards.length %
                                                                        10 >=
                                                                        2 &&
                                                                    flashcards.length %
                                                                        10 <=
                                                                        4
                                                                  ? "картки"
                                                                  : "карток"
                                                      } в цій папці`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-4">
                                    {flashcardViewMode === "grid" &&
                                        flashcards.length > 0 && (
                                            <form
                                                onSubmit={handleSearchSubmit}
                                                className="relative"
                                            >
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        id="search-input"
                                                        type="text"
                                                        value={searchQuery}
                                                        onChange={(e) =>
                                                            setSearchQuery(
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Пошук карток... (Ctrl+F)"
                                                        className="pl-10 pr-10 py-2 w-68 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                    />
                                                    {searchQuery && (
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                clearSearch
                                                            }
                                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </form>
                                        )}

                                    {flashcards.length > 0 && (
                                        <div className="flex items-center">
                                            <div className="flex bg-blue-50 rounded-xl p-1">
                                                <button
                                                    onClick={() =>
                                                        setFlashcardViewMode(
                                                            "grid"
                                                        )
                                                    }
                                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                                                        flashcardViewMode ===
                                                        "grid"
                                                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
                                                            : "text-gray-600 hover:text-gray-900"
                                                    }`}
                                                >
                                                    <Grid3X3 className="w-5 h-5" />
                                                    <span>Сітка</span>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setFlashcardViewMode(
                                                            "detailed"
                                                        )
                                                    }
                                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                                                        flashcardViewMode ===
                                                        "detailed"
                                                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
                                                            : "text-gray-600 hover:text-gray-900"
                                                    }`}
                                                >
                                                    <Eye className="w-5 h-5" />
                                                    <span>Детально</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center">
                                        <button
                                            onClick={() => setShowForm(true)}
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg transform hover:scale-105"
                                            title="Створити нову картку (Ctrl + Space)"
                                        >
                                            <Plus className="w-5 h-5" />
                                            <span>Нова картка</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {searchQuery.trim() && (
                                <div className="max-w-7xl mx-auto mt-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Search className="w-5 h-5 text-blue-600" />
                                            <span className="text-blue-800">
                                                {cardsToDisplay.length === 0 ? (
                                                    <>
                                                        Не знайдено карток за
                                                        запитом "
                                                        <strong>
                                                            {searchQuery}
                                                        </strong>
                                                        ".
                                                        <span className="ml-2 text-sm">
                                                            Натисніть Enter, щоб
                                                            створити нову
                                                            картку.
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        Знайдено{" "}
                                                        {cardsToDisplay.length}{" "}
                                                        {cardsToDisplay.length %
                                                            100 >=
                                                            11 &&
                                                        cardsToDisplay.length %
                                                            100 <=
                                                            14
                                                            ? "карток"
                                                            : cardsToDisplay.length %
                                                                    10 ===
                                                                1
                                                              ? "картку"
                                                              : cardsToDisplay.length %
                                                                      10 >=
                                                                      2 &&
                                                                  cardsToDisplay.length %
                                                                      10 <=
                                                                      4
                                                                ? "картки"
                                                                : "карток"}{" "}
                                                        за запитом "
                                                        <strong>
                                                            {searchQuery}
                                                        </strong>
                                                        "
                                                        {cardsToDisplay.length ===
                                                            1 && (
                                                            <span className="ml-2 text-sm">
                                                                Натисніть Enter
                                                                для перегляду.
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                        <button
                                            onClick={clearSearch}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                        >
                                            Очистити
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-8 [scrollbar-gutter:stable]">
                        {isLoadingFlashcards ? (
                            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
                                <Loader className="w-10 h-10 animate-spin text-blue-600" />
                                <p className="text-sm text-gray-600">
                                    Зачекайте, будь ласка
                                </p>
                            </div>
                        ) : cardsToDisplay.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl shadow-md p-8 max-w-2xl mx-auto">
                                <div className="text-blue-400 mb-4">
                                    <BookOpen className="w-16 h-16 mx-auto" />
                                </div>
                                <h3 className="text-xl font-medium text-gray-900 mb-2">
                                    {searchQuery.trim()
                                        ? `Не знайдено карток за запитом "${searchQuery}"`
                                        : "Немає карток в цій папці"}
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    {searchQuery.trim()
                                        ? "Спробуйте інший запит або створіть нову картку"
                                        : "Створіть свою першу флеш картку в цій папці"}
                                </p>

                                <button
                                    onClick={() => setShowForm(true)}
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>
                                        {searchQuery.trim()
                                            ? `Створити картку "${searchQuery}"`
                                            : "Створити картку"}
                                    </span>
                                </button>
                            </div>
                        ) : (
                            <>
                                {flashcardViewMode === "detailed" ? (
                                    <DetailedFlashcardView
                                        flashcards={flashcards}
                                        onEdit={handleEdit}
                                        onDelete={handleDeleteClick}
                                        initialCardIndex={currentCardIndex}
                                        onCardIndexChange={setCurrentCardIndex}
                                    />
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {cardsToDisplay.map((card, index) => (
                                            <div
                                                key={card._id}
                                                className="bg-white rounded-xl shadow-md border-1 border-gray-200 hover:shadow-lg transition-all duration-200 transform hover:scale-102 cursor-pointer"
                                                onClick={() =>
                                                    handleCardClick(index)
                                                }
                                            >
                                                <div className="flex flex-col justify-between p-6 h-full">
                                                    <div className="mb-4">
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            <div
                                                                className="w-3 h-3 rounded-full"
                                                                style={{
                                                                    backgroundColor:
                                                                        card
                                                                            .categoryId
                                                                            ?.color ||
                                                                        "#6B7280",
                                                                }}
                                                            ></div>
                                                            <h3 className="text-lg font-bold text-gray-900 break-words">
                                                                {searchQuery.trim() ? (
                                                                    <span
                                                                        dangerouslySetInnerHTML={{
                                                                            __html: card.text.replace(
                                                                                new RegExp(
                                                                                    `(${searchQuery.trim()})`,
                                                                                    "gi"
                                                                                ),
                                                                                '<mark class="bg-yellow-200">$1</mark>'
                                                                            ),
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    card.text
                                                                )}
                                                            </h3>
                                                        </div>

                                                        {card.transcription && (
                                                            <p className="text-sm text-gray-600 font-mono mb-4">
                                                                {
                                                                    card.transcription
                                                                }
                                                            </p>
                                                        )}

                                                        {card.translation && (
                                                            <p className="text-blue-600 font-medium mb-2">
                                                                {searchQuery.trim() ? (
                                                                    <span
                                                                        dangerouslySetInnerHTML={{
                                                                            __html: card.translation.replace(
                                                                                new RegExp(
                                                                                    `(${searchQuery.trim()})`,
                                                                                    "gi"
                                                                                ),
                                                                                '<mark class="bg-yellow-200">$1</mark>'
                                                                            ),
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    card.translation
                                                                )}
                                                            </p>
                                                        )}

                                                        {card.shortDescription ? (
                                                            <p className="text-gray-700 text-sm line-clamp-2">
                                                                {searchQuery.trim() ? (
                                                                    <span
                                                                        dangerouslySetInnerHTML={{
                                                                            __html: card.shortDescription.replace(
                                                                                new RegExp(
                                                                                    `(${searchQuery.trim()})`,
                                                                                    "gi"
                                                                                ),
                                                                                '<mark class="bg-yellow-200">$1</mark>'
                                                                            ),
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    card.shortDescription
                                                                )}
                                                            </p>
                                                        ) : (
                                                            card.explanation && (
                                                                <p className="text-gray-700 text-sm line-clamp-2 opacity-75">
                                                                    {
                                                                        card.explanation
                                                                    }
                                                                </p>
                                                            )
                                                        )}
                                                    </div>

                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(
                                                                card.createdAt
                                                            ).toLocaleDateString(
                                                                "uk-UA"
                                                            )}
                                                        </span>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleEdit(
                                                                        card
                                                                    );
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800 p-1 transition-colors rounded-full hover:bg-blue-50"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteClick(
                                                                        card
                                                                    );
                                                                }}
                                                                className="text-red-600 hover:text-red-800 p-1 transition-colors rounded-full hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            <FlashcardForm
                isOpen={showForm}
                onClose={closeForm}
                onSubmit={editingCard ? handleEditSubmit : handleCreateSubmit}
                editingCard={editingCard}
                isLoading={isSubmitting}
                preselectedCategoryId={getPreselectedCategoryId()}
                initialText={
                    !editingCard && searchQuery.trim()
                        ? searchQuery.trim()
                        : undefined
                }
                existingFlashcards={existingFlashcardsForForm}
            />

            <ConfirmDeleteModal
                isOpen={showDeleteModal}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                cardText={cardToDelete?.text}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export { HomePage };
export default HomePage;
