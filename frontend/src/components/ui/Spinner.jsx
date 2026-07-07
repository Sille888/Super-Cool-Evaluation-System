import styles from "./Spinner.module.css";

export default function Spinner({ label = "Lädt …" }) {
  return (
    <div className={styles.wrap}>
      <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
