import styles from "./EmptyState.module.css";

export default function EmptyState({ icon = "fa-inbox", title, text, children }) {
  return (
    <div className={styles.wrap}>
      <i className={`fa-solid ${icon}`} aria-hidden="true" />
      <p className={styles.title}>{title}</p>
      {text && <p className={styles.text}>{text}</p>}
      {children}
    </div>
  );
}
