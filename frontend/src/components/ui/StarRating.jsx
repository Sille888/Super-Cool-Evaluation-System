import { useState } from "react";
import styles from "./StarRating.module.css";

export default function StarRating({ value = 0, onChange, labels = [], readOnly = false, size = "md" }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  const labelText = active > 0 && labels[active - 1] ? labels[active - 1] : "";

  return (
    <div className={styles.wrap}>
      <div className={`${styles.stars} ${styles[size]}`} role="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            className={`${styles.star} ${n <= active ? styles.on : ""}`}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(0)}
            onClick={() => !readOnly && onChange && onChange(n)}
            aria-label={`${n} Sterne`}
            aria-checked={value === n}
            role="radio"
          >
            <i className="fa-solid fa-star" />
          </button>
        ))}
      </div>
      {labelText && <span className={styles.label}>{labelText}</span>}
    </div>
  );
}
