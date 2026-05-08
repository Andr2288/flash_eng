function LoadErrorNotice({ className = "" }) {
    return (
        <div
            className={`mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col items-center justify-center gap-0 px-4 py-8 sm:px-8 min-h-[45vh] ${className}`.trim()}
        >
            <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <p className="font-medium text-red-800">
                    Ой. Щось пішло не так :(
                </p>
                <p className="mt-2 text-sm text-red-600/90">
                    Спробуйте оновити сторінку або перевірте з’єднання.
                </p>
            </div>
        </div>
    );
}

export { LoadErrorNotice };
