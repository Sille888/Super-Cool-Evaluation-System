import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import Modal from '../ui/Modal.jsx';
import GroupEditor from './GroupEditor.jsx';
import { useToast } from '../ui/Toast.jsx';
import styles from './ListItem.module.css';

export default function GroupsTab({ project, reload }) {
	const [groups, setGroups] = useState(project.groups);
	const [editing, setEditing] = useState(null);
	const [confirmDel, setConfirmDel] = useState(null);
	const toast = useToast();

	useEffect(() => {
		setGroups(project.groups);
	}, [project.groups]);

	const critTitle = (id) => project.criteria.find((c) => c.id === id)?.title;

	async function move(i, dir) {
		const j = i + dir;
		if (j < 0 || j >= groups.length) return;
		const next = [...groups];
		[next[i], next[j]] = [next[j], next[i]];
		setGroups(next);
		try {
			await api.reorderGroups(project.id, next.map((g) => g.id));
		} catch (e) {
			setGroups(groups);
			toast(e.message, 'error');
		}
	}

	async function handleSave(data) {
		if (editing === 'new') {
			const g = await api.createGroup(project.id, data.name);
			await api.updateGroup(g.id, { participants: data.participants, criteria: data.criteria });
			toast('Gruppe erstellt.', 'success');
		} else {
			await api.updateGroup(editing.id, data);
			toast('Gruppe gespeichert.', 'success');
		}
		await reload();
	}

	async function duplicate(g) {
		try {
			await api.duplicateGroup(g.id);
			await reload();
			toast('Dupliziert.', 'success');
		} catch (e) {
			toast(e.message, 'error');
		}
	}

	async function del() {
		try {
			await api.deleteGroup(confirmDel.id);
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
					{project.criteria.length === 0 ? 'Lege zuerst Bewertungskriterien an, um sie Projektgruppen zuzuordnen.' : 'Lege Projektgruppen an und ordne diesen Bewertungskriterien zu.'}
				</p>
				<Button icon="fa-plus" onClick={() => setEditing('new')}>
					Gruppe
				</Button>
			</div>

			{project.groups.length === 0 ? (
				<Card>
					<EmptyState icon="fa-users" title="Keine Gruppen" text="Erstelle deine erste Projektgruppe." />
				</Card>
			) : (
				<div className="stack" style={{ gap: 10 }}>
					{groups.map((g, i) => (
						<Card key={g.id} className={styles.item}>
							<div className={styles.main}>
								<h4>{g.name}</h4>
								<div className={styles.sub}>
									<span>
										<i className="fa-regular fa-flag" />
										{g.criteria.length} Kriterien
									</span>
									{g.participants.length > 0 && (
										<span>
											<i className="fa-solid fa-user" />
											{g.participants.join(', ')}
										</span>
									)}
								</div>
								{g.criteria.length > 0 && (
									<p className={styles.desc}>
										{g.criteria.map((id, ci) => (
											<span key={id}>
												{ci + 1}. {critTitle(id) || '—'}
												{ci < g.criteria.length - 1 ? '  ·  ' : ''}
											</span>
										))}
									</p>
								)}
							</div>
							<div className={styles.actions}>
								<Button variant="ghost" size="sm" icon="fa-chevron-up" onClick={() => move(i, -1)} disabled={i === 0} />
								<Button variant="ghost" size="sm" icon="fa-chevron-down" onClick={() => move(i, 1)} disabled={i === groups.length - 1} />
								<Button variant="ghost" size="sm" icon="fa-pen" onClick={() => setEditing(g)} />
								<Button variant="ghost" size="sm" icon="fa-copy" onClick={() => duplicate(g)} />
								<Button variant="danger" size="sm" icon="fa-trash" onClick={() => setConfirmDel(g)} />
							</div>
						</Card>
					))}
				</div>
			)}

			<GroupEditor open={editing !== null} initial={editing === 'new' ? null : editing} allCriteria={project.criteria} onClose={() => setEditing(null)} onSave={handleSave} />

			<Modal
				open={!!confirmDel}
				title="Gruppe löschen?"
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
				<p style={{ margin: 0 }}>„{confirmDel?.name}“ wird unwiderruflich gelöscht.</p>
			</Modal>
		</div>
	);
}
