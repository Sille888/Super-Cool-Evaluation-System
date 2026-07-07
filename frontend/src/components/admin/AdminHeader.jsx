import { useNavigate } from 'react-router-dom';
import { clearAdminPw } from '../../lib/api.js';
import styles from './AdminHeader.module.css';

export default function AdminHeader({ back }) {
	const navigate = useNavigate();
	function logout() {
		clearAdminPw();
		navigate('/admin');
		window.location.reload();
	}
	return (
		<header className={styles.bar}>
			<div className={styles.inner}>
				<div className={styles.left}>
					{back ? (
						<button className={styles.back} onClick={() => navigate(back)}>
							<i className="fa-solid fa-arrow-left" />
						</button>
					) : (
						<span className={styles.logo}>
							<i className="fa-solid fa-clipboard-check" />
						</span>
					)}
					<span className={styles.brand}>Projektbewertung</span>
				</div>
				<nav className={styles.nav}>
					<button className={styles.iconLink} onClick={() => navigate('/admin/settings')} title="Einstellungen">
						<i className="fa-solid fa-gear" />
					</button>
					<button className={styles.iconLink} onClick={logout} title="Abmelden">
						<i className="fa-solid fa-right-from-bracket" />
					</button>
				</nav>
			</div>
		</header>
	);
}
