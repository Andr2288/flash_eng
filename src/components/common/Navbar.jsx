import { Link, useLocation, useNavigate } from "react-router-dom";
import {
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
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const bumpPath = useNavReselectStore((s) => s.bumpPath);

    const isActive = (path) => {
        if (path === "/practice") {
            return (
                location.pathname === "/practice" ||
                location.pathname.startsWith("/practice/")
            );
        }
        return location.pathname === path;
    };

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
    ];

    const renderNavLink = (item, compact = false) => {
        const Icon = item.icon;
        const active = isActive(item.path);

        const linkClass = compact
            ? `flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 min-w-0 flex-1 ${
                  active
                      ? "text-blue-600"
                      : "text-gray-500 hover:text-gray-900"
              }`
            : `group relative flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                      ? `bg-linear-to-r ${item.gradient} text-white shadow-lg transform scale-105`
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`;

        return (
            <Link
                key={item.path}
                to={item.path}
                onClick={(e) => {
                    if (item.path === "/practice") {
                        if (location.pathname === "/practice") {
                            e.preventDefault();
                            bumpPath("/practice");
                            return;
                        }
                        if (location.pathname.startsWith("/practice/")) {
                            e.preventDefault();
                            navigate("/practice");
                            bumpPath("/practice");
                            return;
                        }
                        return;
                    }
                    if (location.pathname === item.path) {
                        e.preventDefault();
                        bumpPath(item.path);
                    }
                }}
                className={linkClass}
                aria-current={active ? "page" : undefined}
            >
                <div
                    className={`transition-transform duration-200 ${
                        compact
                            ? `flex h-9 w-9 items-center justify-center rounded-xl ${
                                  active
                                      ? `bg-linear-to-r ${item.gradient} text-white shadow-md`
                                      : "bg-gray-50"
                              }`
                            : `w-5 h-5 ${active ? "" : "group-hover:scale-110"}`
                    }`}
                >
                    <Icon className={compact ? "w-5 h-5" : "w-5 h-5"} />
                </div>
                <span
                    className={
                        compact
                            ? "text-[0.65rem] font-medium leading-tight text-center truncate max-w-full"
                            : "font-medium"
                    }
                >
                    {item.label}
                </span>
            </Link>
        );
    };

    return (
        <>
        <div className="bg-white h-screen w-68 hidden md:fixed left-0 top-0 border-r border-gray-200 md:flex md:flex-col">
            
            <div className="p-8 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-linear-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-gray-900 text-xl font-bold">
                            FlashEng
                        </h1>
                        <p className="text-gray-500 text-md">
                            Вивчай ефективно
                        </p>
                    </div>
                </div>
            </div>

            
            <nav className="flex-1 py-6">
                <ul className="space-y-2 px-4">
                    {menuItems.map((item) => (
                        <li key={item.path}>{renderNavLink(item)}</li>
                    ))}
                </ul>
            </nav>

            <div className="mt-auto border-t border-gray-200 py-8">
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

        <nav
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom,0px)]"
            aria-label="Головна навігація"
        >
            <div className="mx-auto flex max-w-lg items-stretch justify-around gap-1 px-2 py-2">
                {menuItems.map((item) => renderNavLink(item, true))}
            </div>
        </nav>
        </>
    );
};

export default Navbar;
