import { useState } from 'react';
import { api } from '../../lib/api.js';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import Modal from '../ui/Modal.jsx';
import CriterionEditor from './CriterionEditor.jsx';
import { useToast } from '../ui/Toast.jsx';
import styles from './ListItem.module.css';

export default function CriteriaTab({ project, reload }) {
	const [editing, setEditing] = useState(null); // criterion | "new" | null
	const [confirmDel, setConfirmDel] = useState(null);
	const toast = useToast();

	async function handleSave(data) {
		if (editing === 'new') {
			await api.createCriterion(project.id, data);
			toast('Kriterium erstellt.', 'success');
		} else {
			await api.updateCriterion(editing.id, data);
			toast('Kriterium gespeichert.', 'success');
		}
		await reload();
	}

	async function duplicate(c) {
		try {
			await api.duplicateCriterion(c.id);
			await reload();
			toast('Dupliziert.', 'success');
		} catch (e) {
			toast(e.message, 'error');
		}
	}

	async function del() {
		try {
			await api.deleteCriterion(confirmDel.id);
			setConfirmDel(null);
			await reload();
			toast('Gelöscht.', 'success');
		} catch (e) {
			toast(e.message, 'error');
		}
	}

	return (
		<div>
			<div className="spread" style={{ marginBottom: 16 }}>
				<p className="muted" style={{ margin: 0, fontSize: 14 }}>
					Lege Bewertungskriterien an.
				</p>
				<Button icon="fa-plus" onClick={() => setEditing('new')}>
					Kriterium
				</Button>
			</div>

			{project.criteria.length === 0 ? (
				<Card>
					<EmptyState icon="fa-list-check" title="Keine Kriterien" text="Erstelle dein erstes Bewertungskriterium." />
				</Card>
			) : (
				<div className="stack" style={{ gap: 10 }}>
					{project.criteria.map((c) => (
						<Card key={c.id} className={styles.item}>
							<div className={styles.main}>
								<div className={styles.head}>
									<span className={`${styles.badge} ${c.type === 'stars' ? styles.badgeStars : styles.badgeText}`}>
										<i className={`fa-solid ${c.type === 'stars' ? 'fa-star' : 'fa-align-left'}`} />
										{c.type === 'stars' ? 'Sterne' : 'Freitext'}
									</span>
									<h4>{c.title}</h4>
								</div>
								{c.description && <p className={styles.desc}>{c.description}</p>}
							</div>
							<div className={styles.actions}>
								<Button variant="ghost" size="sm" icon="fa-pen" onClick={() => setEditing(c)} />
								<Button variant="ghost" size="sm" icon="fa-copy" onClick={() => duplicate(c)} />
								<Button variant="danger" size="sm" icon="fa-trash" onClick={() => setConfirmDel(c)} />
							</div>
						</Card>
					))}
				</div>
			)}

			<CriterionEditor open={editing !== null} initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={handleSave} />

			<Modal
				open={!!confirmDel}
				title="Kriterium löschen?"
				onClose={() => setConfirmDel(null)}
				footer={
					<>
						<Button variant="secondary" onClick={() => setConfirmDel(null)}>
							Abbrechen
						</Button>
						<Button variant="dangerSolid" icon="fa-trash" onClick={del}>
							Löschen
						</Button>
					</>
				}
			>
				<p style={{ margin: 0 }}>„{confirmDel?.title}“ wird gelöscht und aus allen Gruppen entfernt.</p>
			</Modal>
		</div>
	);
}
