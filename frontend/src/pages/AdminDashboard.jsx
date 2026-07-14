import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import AdminHeader from '../components/admin/AdminHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Input } from '../components/ui/Field.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
	const [projects, setProjects] = useState(null);
	const [creating, setCreating] = useState(false);
	const [name, setName] = useState('');
	const [busy, setBusy] = useState(false);
	const [duplicatingId, setDuplicatingId] = useState(null);
	const navigate = useNavigate();
	const toast = useToast();

	async function load() {
		try {
			setProjects(await api.listProjects());
		} catch (e) {
			toast(e.message, 'error');
		}
	}
	useEffect(() => {
		load();
	}, []);

	async function duplicate(p) {
		setDuplicatingId(p.id);
		try {
			await api.duplicateProject(p.id);
			await load();
			toast('Projekt dupliziert.', 'success');
		} catch (e) {
			toast(e.message, 'error');
		} finally {
			setDuplicatingId(null);
		}
	}

	async function create() {
		if (!name.trim()) return;
		setBusy(true);
		try {
			const p = await api.createProject(name.trim());
			navigate(`/admin/projects/${p.id}`);
		} catch (e) {
			toast(e.message, 'error');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="page">
			<AdminHeader />
			<div className="container">
				<div className="spread" style={{ marginBottom: 20 }}>
					<div>
						<h1>Projekte</h1>
					</div>
					<Button icon="fa-plus" onClick={() => setCreating(true)}>
						Projekt
					</Button>
				</div>

				{projects === null ? (
					<Spinner />
				) : projects.length === 0 ? (
					<Card>
						<EmptyState icon="fa-folder-open" title="Noch keine Projekte" text="Lege dein erstes Projekt an, z. B. Präsentationen 2026."></EmptyState>
					</Card>
				) : (
					<div className={styles.grid}>
						{projects.map((p) => (
							<Card key={p.id} className={styles.item} role="button" onClick={() => navigate(`/admin/projects/${p.id}`)}>
								<div className="spread">
									<h3>{p.name}</h3>
									<div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
										<Button
											variant="ghost"
											size="sm"
											icon={duplicatingId === p.id ? 'fa-circle-notch fa-spin' : 'fa-copy'}
											title="Duplizieren"
											disabled={duplicatingId === p.id}
											onClick={() => duplicate(p)}
										/>
									</div>
								</div>
								<div className={styles.meta}>
									<span>
										<i className="fa-solid fa-users" /> {p.groups_count} Gruppen
									</span>
									<span>
										<i className="fa-solid fa-pen-to-square" /> {p.submissions_count} Bewertungen
									</span>
									{p.display_mode === 'results' ? (
										<span className={styles.unlocked}>
											<i className="fa-solid fa-chart-simple" /> Auswertung
										</span>
									) : p.display_mode === 'form' ? (
										<span>
											<i className="fa-solid fa-pen-to-square" /> Bewertungsformular
										</span>
									) : (
										<span>
											<i className="fa-solid fa-circle-pause" /> Pausiert
										</span>
									)}
								</div>
							</Card>
						))}
					</div>
				)}
			</div>

			<Modal
				open={creating}
				title="Neues Projekt"
				onClose={() => setCreating(false)}
				footer={
					<>
						<Button variant="secondary" onClick={() => setCreating(false)}>
							Abbrechen
						</Button>
						<Button onClick={create} disabled={busy || !name.trim()}>
							Erstellen
						</Button>
					</>
				}
			>
				<Input label="Projektname" placeholder="z. B. Präsentationen 2026" value={name} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
			</Modal>
		</div>
	);
}
