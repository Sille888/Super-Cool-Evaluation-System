import styles from "./Field.module.css";

export function Input({ label, hint, ...props }) {
  return (
    <label className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      <input className={styles.input} {...props} />
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
}

export function Textarea({ label, hint, rows = 3, ...props }) {
  return (
    <label className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      <textarea className={styles.input} rows={rows} {...props} />
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <label className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      <select className={styles.input} {...props}>
        {children}
      </select>
    </label>
  );
}
