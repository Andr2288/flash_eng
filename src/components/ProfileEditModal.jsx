import { useState, useEffect, useRef } from "react";
import { Save, X, Camera, User, Loader } from "lucide-react";

const MAX_NAME_LEN = 50;
const AVATAR_MAX_EDGE = 512;
const AVATAR_JPEG_QUALITY = 0.82;

function compressImageToDataUrl(file, maxEdge, quality) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            let { width, height } = img;
            const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
            const w = Math.max(1, Math.round(width * scale));
            const h = Math.max(1, Math.round(height * scale));
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Canvas недоступний"));
                return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            try {
                resolve(canvas.toDataURL("image/jpeg", quality));
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Не вдалося прочитати зображення"));
        };
        img.src = objectUrl;
    });
}

function validateFullName(name) {
    const t = (name || "").trim();
    if (!t) {
        return "Ім'я не може бути порожнім";
    }
    if (t.length < 2) {
        return "Ім'я повинно містити принаймні 2 символи";
    }
    if (t.length > MAX_NAME_LEN) {
        return `Ім'я не може містити більше ${MAX_NAME_LEN} символів`;
    }
    return "";
}

function ProfileEditModal({ onClose, onSave, initialData, isLoading }) {
    const [formData, setFormData] = useState(() => ({
        fullName: initialData?.fullName || "",
        profilePic: initialData?.profilePic || "",
    }));
    const [nameError, setNameError] = useState("");
    const [imageError, setImageError] = useState("");
    const [saveError, setSaveError] = useState("");

    const nameInputRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const t = setTimeout(() => {
            nameInputRef.current?.focus();
            nameInputRef.current?.select();
        }, 100);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !isLoading) {
                event.preventDefault();
                onCloseRef.current();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isLoading]);

    useEffect(() => {
        const html = document.documentElement;
        const previousBody = document.body.style.overflow;
        const previousHtml = html.style.overflow;
        document.body.style.overflow = "hidden";
        html.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousBody;
            html.style.overflow = previousHtml;
        };
    }, []);

    const handleSave = async () => {
        setSaveError("");
        const err = validateFullName(formData.fullName);
        if (err) {
            setNameError(err);
            nameInputRef.current?.focus();
            return;
        }
        setNameError("");
        try {
            await onSave(formData);
        } catch (err) {
            setSaveError(
                err?.message ||
                    "Не вдалося зберегти зміни. Спробуйте ще раз."
            );
        }
    };

    const handleCancel = () => {
        if (initialData) {
            setFormData({
                fullName: initialData.fullName || "",
                profilePic: initialData.profilePic || "",
            });
        }
        setNameError("");
        setImageError("");
        setSaveError("");
        onClose();
    };

    const handleNameChange = (e) => {
        const value = e.target.value;
        setFormData((prev) => ({ ...prev, fullName: value }));
        if (nameError) {
            setNameError("");
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) {
            return;
        }
        setImageError("");
        if (!file.type.startsWith("image/")) {
            setImageError("Оберіть файл зображення (JPEG, PNG, WebP)");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setImageError("Розмір файлу не повинен перевищувати 5MB");
            return;
        }
        try {
            const dataUrl = await compressImageToDataUrl(
                file,
                AVATAR_MAX_EDGE,
                AVATAR_JPEG_QUALITY
            );
            setFormData((prev) => ({ ...prev, profilePic: dataUrl }));
        } catch {
            setImageError("Не вдалося обробити зображення");
        }
    };

    const removeProfilePic = () => {
        setFormData((prev) => ({ ...prev, profilePic: "" }));
        setImageError("");
    };

    const nameTrim = formData.fullName.trim();
    const canSave =
        !isLoading && nameTrim.length >= 2 && nameTrim.length <= MAX_NAME_LEN;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600/80 p-4"
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) {
                    handleCancel();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-edit-title"
                className="flex max-h-[min(92vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-gray-900/10"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="shrink-0 border-b border-gray-100 bg-linear-to-br from-slate-50 to-white px-6 py-5 sm:px-8 sm:py-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h2
                                id="profile-edit-title"
                                className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl"
                            >
                                Редагувати профіль
                            </h2>
                            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                                Оновіть ім&apos;я та фото. Після збереження
                                зміни з&apos;являться на сторінці профілю.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="shrink-0 rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Закрити"
                            aria-label="Закрити вікно"
                        >
                            <X className="h-5 w-5" strokeWidth={2} />
                        </button>
                    </div>
                </header>

                <form
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!isLoading) {
                            handleSave();
                        }
                    }}
                >
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
                            {saveError ? (
                                <div
                                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                                    role="alert"
                                >
                                    {saveError}
                                </div>
                            ) : null}

                            <div className="text-center">
                                <div className="relative inline-block">
                                    <div className="mx-auto h-28 w-28 overflow-hidden rounded-full bg-linear-to-br from-orange-100 to-red-100 shadow-md ring-4 ring-white">
                                        {formData.profilePic ? (
                                            <img
                                                src={formData.profilePic}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <User
                                                    className="h-14 w-14 text-orange-400"
                                                    strokeWidth={1.5}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <label
                                        className={`absolute -bottom-0.5 -right-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-r from-orange-500 to-red-500 shadow-lg transition-all hover:from-orange-600 hover:to-red-600 hover:shadow-md ${isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                                        aria-label="Завантажити фото профілю"
                                    >
                                        <Camera
                                            className="h-4 w-4 text-white"
                                            strokeWidth={2}
                                        />
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            onChange={handleImageUpload}
                                            className="sr-only"
                                            disabled={isLoading}
                                        />
                                    </label>
                                </div>

                                <div className="mt-4 space-y-2">
                                    <p className="text-xs text-gray-500">
                                        Оберіть нове фото кнопкою з іконкою камери
                                    </p>
                                    {imageError ? (
                                        <p
                                            className="text-xs font-medium text-red-600"
                                            role="status"
                                        >
                                            {imageError}
                                        </p>
                                    ) : null}
                                    {formData.profilePic ? (
                                        <button
                                            type="button"
                                            onClick={removeProfilePic}
                                            disabled={isLoading}
                                            className="text-xs font-medium text-red-600 underline-offset-2 hover:text-red-800 hover:underline disabled:opacity-50"
                                        >
                                            Прибрати фото
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="profile-full-name"
                                    className="mb-2 block text-sm font-medium text-gray-800"
                                >
                                    Повне ім&apos;я{" "}
                                    <span className="text-red-500" aria-hidden>
                                        *
                                    </span>
                                </label>
                                <input
                                    id="profile-full-name"
                                    ref={nameInputRef}
                                    type="text"
                                    value={formData.fullName}
                                    onChange={handleNameChange}
                                    placeholder="Наприклад, Олена Коваленко"
                                    autoComplete="name"
                                    aria-invalid={nameError ? true : undefined}
                                    aria-describedby={
                                        nameError
                                            ? "profile-name-error"
                                            : undefined
                                    }
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25 disabled:cursor-not-allowed disabled:bg-gray-50"
                                    maxLength={MAX_NAME_LEN}
                                    required
                                    disabled={isLoading}
                                />
                                <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
                                    <p className="text-xs text-gray-500">
                                        {formData.fullName.length} /{" "}
                                        {MAX_NAME_LEN}
                                    </p>
                                    {nameError ? (
                                        <p
                                            className="text-xs font-medium text-red-600"
                                            id="profile-name-error"
                                        >
                                            {nameError}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="shrink-0 border-t border-gray-100 bg-gray-50/50 px-6 py-4 sm:px-8">
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isLoading}
                                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Скасувати
                            </button>
                            <button
                                type="submit"
                                disabled={!canSave}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-red-500 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-orange-600 hover:to-red-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                            >
                                {isLoading ? (
                                    <Loader
                                        className="h-5 w-5 animate-spin"
                                        aria-hidden
                                    />
                                ) : (
                                    <Save className="h-5 w-5" strokeWidth={2} />
                                )}
                                {isLoading ? "Збереження…" : "Зберегти"}
                            </button>
                        </div>
                    </footer>
                </form>
            </div>
        </div>
    );
}

export { ProfileEditModal };
