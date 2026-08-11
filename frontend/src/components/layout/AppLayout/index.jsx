import { useState } from "react";

import Sidebar from "../Sidebar";
import Topbar from "../Topbar";

import styles from "./AppLayout.module.css";

export default function AppLayout({ children }) {

    const [collapsed,setCollapsed]=useState(false);

    return(

        <div className={styles.layout}>

            <Sidebar
                collapsed={collapsed}
            />

            <div className={styles.content}>

                <Topbar

                    collapsed={collapsed}

                    setCollapsed={setCollapsed}

                />

                <main className={styles.main}>

                    {children}

                </main>

            </div>

        </div>

    )

}