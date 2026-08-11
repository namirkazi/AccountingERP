import {
    Menu,
    Search,
    Bell,
    ChevronDown,
    LogOut,
    User
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";

import styles from "./Topbar.module.css";

export default function Topbar({
    collapsed,
    setCollapsed
}) {

    const { user, logout } = useAuth();

    const navigate = useNavigate();

    const [profileOpen, setProfileOpen] = useState(false);

    async function handleLogout() {

        try {

            await logout();

            navigate("/", {
                replace: true
            });

        } catch (error) {

            console.error(
                "Logout failed:",
                error
            );

        }
    }

    const initials =
        user?.full_name
            ?.split(" ")
            .map(word => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        || "US";

    return (

        <header className={styles.topbar}>

            {/* Left */}

            <div className={styles.left}>

                <button
                    className={styles.menuButton}
                    onClick={() =>
                        setCollapsed(!collapsed)
                    }
                >

                    <Menu size={22} />

                </button>

                <div>

                    <h2 >
                        Dashboard
                    </h2>

                    <p>
                        {user?.company_name ||
                            "Accounting ERP"}
                    </p>

                </div>

            </div>


            {/* Right */}

            <div className={styles.right}>

                {/* Search */}

                <div className={styles.search}>

                    <Search size={18} />

                    <input
                        placeholder="Search..."
                    />

                </div>


                {/* Notifications */}

                <button
                    className={styles.notification}
                >

                    <Bell size={20} />

                </button>


                {/* Profile */}

                <div className={styles.profileWrapper}>

                    <button
                        className={styles.profile}
                        onClick={() =>
                            setProfileOpen(
                                !profileOpen
                            )
                        }
                    >

                        <div className={styles.avatar}>

                            {initials}

                        </div>

                        <div className={styles.userInfo}>

                            <span>
                                {user?.full_name ||
                                    "User"}
                            </span>

                            <small>
                                {user?.role === "admin"
                                    ? "Administrator"
                                    : "User"}
                            </small>

                        </div>

                        <ChevronDown
                            size={18}
                            className={
                                profileOpen
                                    ? styles.rotate
                                    : ""
                            }
                        />

                    </button>


                    {/* Dropdown */}

                    {profileOpen && (

                        <div
                            className={
                                styles.profileMenu
                            }
                        >

                            <div
                                className={
                                    styles.profileHeader
                                }
                            >

                                <div
                                    className={
                                        styles.largeAvatar
                                    }
                                >
                                    {initials}
                                </div>

                                <div>

                                    <strong>
                                        {user?.full_name}
                                    </strong>

                                    <span>
                                        {user?.company_name}
                                    </span>

                                </div>

                            </div>


                            <div
                                className={
                                    styles.menuDivider
                                }
                            />


                            <button
                                className={
                                    styles.profileItem
                                }
                            >

                                <User size={18} />

                                Profile

                            </button>


                            <button
                                className={`${styles.profileItem} ${styles.logoutItem}`}
                                onClick={handleLogout}
                            >

                                <LogOut size={18} />

                                Logout

                            </button>

                        </div>

                    )}

                </div>

            </div>

        </header>

    );
}