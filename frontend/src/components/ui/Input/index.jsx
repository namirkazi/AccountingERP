import styles from "./Input.module.css";

export default function Input({
    label,
    type = "text",
    placeholder,
    value,
    onChange,
    name,
    required = false
}) {
    return (
        <div className={styles.group}>
            {label && (
                <label className={styles.label}>
                    {label}
                </label>
            )}

            <input
                className={styles.input}
                type={type}
                placeholder={placeholder}
                value={value}
                name={name}
                required={required}
                onChange={onChange}
            />
        </div>
    );
}