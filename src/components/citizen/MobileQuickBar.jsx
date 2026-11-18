import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, FileText, Plus, User } from "lucide-react";

const tapSpring = {
    whileTap: { scale: 0.9 },
    transition: { type: "spring", stiffness: 450, damping: 25 },
};

const MobileQuickBar = () => {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [isHidden, setIsHidden] = useState(false);

    const TRACK_PATH = "/my-reports";

    const isActive = (path) =>
        path === "/"
            ? pathname === "/"
            : pathname === path || pathname.startsWith(`${path}/`);

    useEffect(() => {
        setIsHidden(false);
    }, [pathname]);

    useEffect(() => {
        const handleScroll = (e) => {
            const target =
                e?.target instanceof Element
                    ? e.target
                    : document.documentElement;

            if (target.closest?.(".mobile-quick-bar")) return;

            const { scrollTop, clientHeight, scrollHeight } = target;
            const isScrollable = scrollHeight > clientHeight + 20;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 60;

            setIsHidden(isScrollable && isAtBottom);
        };

        window.addEventListener("scroll", handleScroll, {
            passive: true,
            capture: true,
        });

        return () => {
            window.removeEventListener("scroll", handleScroll, {
                capture: true,
            });
        };
    }, []);

    return (
        <nav
            aria-label="Mobile quick navigation"
            className={`mobile-quick-bar fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] inset-x-4 z-50 md:hidden max-w-md mx-auto transition-all duration-300 ${
                isHidden
                    ? "translate-y-28 opacity-0 pointer-events-none"
                    : "translate-y-0 opacity-100"
            }`}
        >
            <div className="flex justify-around items-end px-4 py-2.5 rounded-full bg-white/75 dark:bg-gray-900/75 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg">
                <motion.button
                    {...tapSpring}
                    type="button"
                    aria-label="Home"
                    aria-current={isActive("/") ? "page" : undefined}
                    onClick={() => navigate("/")}
                    className={`flex flex-col items-center gap-1 px-2 py-0.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors ${
                        isActive("/")
                            ? "text-gray-900 dark:text-white font-semibold"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
                    }`}
                >
                    <Home className="w-5 h-5" />
                    <span className="text-xs">Home</span>
                </motion.button>

                <motion.button
                    {...tapSpring}
                    type="button"
                    aria-label="Track"
                    aria-current={isActive(TRACK_PATH) ? "page" : undefined}
                    onClick={() => navigate(TRACK_PATH)}
                    className={`flex flex-col items-center gap-1 px-2 py-0.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors ${
                        isActive(TRACK_PATH)
                            ? "text-gray-900 dark:text-white font-semibold"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
                    }`}
                >
                    <FileText className="w-5 h-5" />
                    <span className="text-xs">Track</span>
                </motion.button>

                <motion.button
                    {...tapSpring}
                    type="button"
                    aria-label="Report"
                    aria-current={isActive("/report") ? "page" : undefined}
                    onClick={() => navigate("/report")}
                    className="flex flex-col items-center gap-1 px-2 py-0.5 rounded-lg group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                    <span className="-mt-8 flex items-center justify-center w-12 h-12 rounded-full bg-primary-600 group-hover:bg-primary-500 text-white shadow-lg ring-4 ring-gray-50 dark:ring-gray-950 transition-colors">
                        <Plus className="w-6 h-6" />
                    </span>
                    <span
                        className={`text-xs transition-colors ${
                            isActive("/report")
                                ? "font-semibold text-gray-900 dark:text-white"
                                : "font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                        }`}
                    >
                        Report
                    </span>
                </motion.button>

                <motion.button
                    {...tapSpring}
                    type="button"
                    aria-label="Profile"
                    aria-current={isActive("/profile") ? "page" : undefined}
                    onClick={() => navigate("/profile")}
                    className={`flex flex-col items-center gap-1 px-2 py-0.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors ${
                        isActive("/profile")
                            ? "text-gray-900 dark:text-white font-semibold"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
                    }`}
                >
                    <User className="w-5 h-5" />
                    <span className="text-xs">Profile</span>
                </motion.button>
            </div>
        </nav>
    );
};

export default MobileQuickBar;