import styles from "./StatCard.module.css";

export default function StatCard({
    title,
    value,
    icon: Icon,
}) {

    return (
        <div className={styles.card}>

            <div className={styles.top}>

                <span>
                    {title}
                </span>

                {Icon && (
                    <div className={styles.icon}>
                        <Icon size={19} />
                    </div>
                )}

            </div>

            <h2>
                {value}
            </h2>

        </div>
    );
}