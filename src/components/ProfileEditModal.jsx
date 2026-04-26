import { useState, useEffect, useRef } from "react";
import { Save, X, Camera, User } from "lucide-react";

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
        <div className="fixed inset-0 bg-gray-600/80 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col">
                <div className="p-8 border-b border-gray-200 bg-linear-to-r from-slate-50 to-gray-50 rounded-t-2xl shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Редагувати профіль
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Ім’я в metadata; фото — у Storage (публічне
                                посилання)
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="text-gray-400 hover:text-gray-600 p-2 transition-colors disabled:cursor-not-allowed hover:bg-gray-100 rounded-full cursor-pointer"
                            title="Закрити (Esc)"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <form
                    className="flex flex-col flex-1 min-h-0"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!isLoading) {
                            handleSave();
                        }
                    }}
                >
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-8 space-y-6">
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
                                    <div className="w-24 h-24 rounded-full bg-linear-to-r from-orange-100 to-red-100 overflow-hidden mx-auto shadow-md">
                                        {formData.profilePic ? (
                                            <img
                                                src={formData.profilePic}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User className="w-12 h-12 text-orange-400" />
                                            </div>
                                        )}
                                    </div>

                                    <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-lg">
                                        <Camera className="w-4 h-4 text-white" />
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            disabled={isLoading}
                                        />
                                    </label>
                                </div>

                                <div className="mt-3 space-y-2">
                                    <p className="text-xs text-gray-500">
                                        Натисніть на камеру, щоб змінити фото
                                    </p>
                                    {imageError ? (
                                        <p className="text-xs text-red-600">
                                            {imageError}
                                        </p>
                                    ) : null}
                                    {formData.profilePic ? (
                                        <button
                                            type="button"
                                            onClick={removeProfilePic}
                                            disabled={isLoading}
                                            className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                                        >
                                            Видалити фото
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="profile-full-name"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Повне ім&apos;я{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="profile-full-name"
                                    ref={nameInputRef}
                                    type="text"
                                    value={formData.fullName}
                                    onChange={handleNameChange}
                                    placeholder={`Введіть ваше повне ім'я`}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
                                    maxLength={MAX_NAME_LEN}
                                    required
                                    disabled={isLoading}
                                />
                                <div className="flex justify-between items-center mt-1 gap-2">
                                    <p className="text-xs text-gray-500">
                                        {formData.fullName.length}/
                                        {MAX_NAME_LEN} символів
                                    </p>
                                    {nameError ? (
                                        <p className="text-xs text-red-600 text-right">
                                            {nameError}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="text-xs text-blue-800">
                                    <p className="font-medium mb-1">
                                        Вимоги до зображення:
                                    </p>
                                    <ul className="space-y-1">
                                        <li>• Формат: JPEG, PNG, WebP</li>
                                        <li>
                                            • До 5MB; перед відправкою фото
                                            стискається
                                        </li>
                                        <li>
                                            • Зберігається в Supabase Storage —
                                            у профілі лише посилання, не base64
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-t border-gray-200 bg-linear-to-r from-slate-50 to-gray-50 rounded-b-2xl shrink-0">
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={!canSave}
                                className="flex-1 bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-70 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-md hover:shadow-lg cursor-pointer"
                            >
                                {isLoading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        <span>Зберегти</span>
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isLoading}
                                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Скасувати
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export { ProfileEditModal };
