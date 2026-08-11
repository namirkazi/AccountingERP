import styles from "./Button.module.css";

export default function Button({
    children,
    type = "button",
    variant = "primary",
    onClick,
    disabled = false,
    fullWidth = false
}) {
    const className = `
        ${styles.button}
        ${styles[variant]}
        ${fullWidth ? styles.fullWidth : ""}
    `;

    return (
        <button
            type={type}
            className={className}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
}