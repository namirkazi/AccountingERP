import { useState } from "react";

import FundSidebar from "./FundSidebar";
import FundTopbar from "./FundTopbar";

import styles from "./FundLayout.module.css";

export default function FundLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.layout}>
      <FundSidebar collapsed={collapsed} />

      <div className={styles.right}>
        <FundTopbar collapsed={collapsed} setCollapsed={setCollapsed} />

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
