import styles from './Button.module.css';

export default function Button({ children, variant = 'primary', size = 'md', icon, type = 'button', full = false, ...props }) {
	const cls = [styles.btn, styles[variant], styles[size], full ? styles.full : ''].filter(Boolean).join(' ');
	return (
		<button type={type} className={cls} {...props}>
			{icon && <i className={`fa-solid ${icon}`} aria-hidden="true" />}
			{children && <span>{children}</span>}
		</button>
	);
}
