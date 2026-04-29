import { Link, useLocation } from "react-router-dom";
import {
    Settings,
    User,
    BookOpen,
    Target,
    Sparkles,
    LogOut,
} from "lucide-react";

import { useAuth } from "../../context/useAuth.js";
import { useNavReselectStore } from "../../store/useNavReselectStore.js";

const Navbar = () => {
    const location = useLocation();
    const { signOut } = useAuth();
    const bumpPath = useNavReselectStore((s) => s.bumpPath);

    const isActive = (path) => location.pathname === path;

    const menuItems = [
        {
            path: "/",
            icon: BookOpen,
            label: "Флеш картки",
            gradient: "from-blue-500 to-blue-600",
        },
        {
            path: "/practice",
            icon: Target,
            label: "Практика",
            gradient: "from-blue-600 to-purple-600",
        },
        {
            path: "/profile",
            icon: User,
            label: "Профіль",
            gradient: "from-orange-500 to-red-500",
        },
        {
            path: "/settings",
            icon: Settings,
            label: "Налаштування",
            gradient: "from-gray-500 to-slate-500",
        },
    ];

    return (
        <div className="bg-white h-screen w-68 hidden md:fixed left-0 top-0 border-r border-gray-200 md:flex md:flex-col">
            {/* Header */}
            <div className="p-8 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-linear-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-gray-900 text-xl font-bold">
                            FlashCard
                        </h1>
                        <p className="text-gray-500 text-md">
                            Вивчай ефективно
                        </p>
                    </div>
                </div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 py-6">
                <ul className="space-y-2 px-4">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    onClick={(e) => {
                                        if (location.pathname === item.path) {
                                            e.preventDefault();
                                            bumpPath(item.path);
                                        }
                                    }}
                                    className={`group relative flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                        active
                                            ? `bg-linear-to-r ${item.gradient} text-white shadow-lg transform scale-105`
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                                >
                                    <div
                                        className={`w-5 h-5 transition-transform duration-200 ${
                                            active
                                                ? ""
                                                : "group-hover:scale-110"
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium">
                                        {item.label}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="mt-auto border-t border-gray-200 py-6">
                <ul className="space-y-2 px-4">
                    <li>
                        <button
                            type="button"
                            onClick={() => signOut()}
                            className="group relative w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        >
                            <div className="w-5 h-5 transition-transform duration-200 group-hover:scale-110">
                                <LogOut className="w-5 h-5" />
                            </div>
                            <span className="font-medium">Вийти</span>
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default Navbar;
