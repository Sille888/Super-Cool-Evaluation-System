import styles from "./Card.module.css";

export default function Card({ children, className = "", as: Tag = "div", ...props }) {
  return (
    <Tag className={`${styles.card} ${className}`} {...props}>
      {children}
    </Tag>
  );
}
