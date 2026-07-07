import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { Input } from '../ui/Field.jsx';
import styles from './GroupEditor.module.css';

export default function GroupEditor({ open, initial, allCriteria, onClose, onSave }) {
	const [name, setName] = useState('');
	const [participants, setParticipants] = useState([]);
	const [assigned, setAssigned] = useState([]); // criterion ids in order
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (open) {
			setName(initial?.name || '');
			setParticipants(initial?.participants?.length ? [...initial.participants] : []);
			setAssigned(initial?.criteria ? [...initial.criteria] : []);
		}
	}, [open, initial]);

	const byId = Object.fromEntries(allCriteria.map((c) => [c.id, c]));
	const available = allCriteria.filter((c) => !assigned.includes(c.id));

	const move = (i, dir) => {
		setAssigned((arr) => {
			const a = [...arr];
			const j = i + dir;
			if (j < 0 || j >= a.length) return a;
			[a[i], a[j]] = [a[j], a[i]];
			return a;
		});
	};

	async function save() {
		if (!name.trim()) return;
		setBusy(true);
		try {
			await onSave({
				name: name.trim(),
				participants: participants.map((p) => p.trim()).filter(Boolean),
				criteria: assigned,
			});
			onClose();
		} finally {
			setBusy(false);
		}
	}

	return (
		<Modal
			open={open}
			wide
			title={initial ? 'Gruppe bearbeiten' : 'Neue Gruppe'}
			onClose={onClose}
			footer={
				<>
					<Button variant="secondary" onClick={onClose}>
						Abbrechen
					</Button>
					<Button onClick={save} disabled={busy || !name.trim()}>
						Speichern
					</Button>
				</>
			}
		>
			<div className="stack">
				<Input label="Gruppenname" placeholder="z. B. Gruppe 1" value={name} autoFocus onChange={(e) => setName(e.target.value)} />

				{/* Teilnehmer */}
				<div>
					<span className={styles.sectionLabel}>Teilnehmer (optional)</span>
					<div className="stack" style={{ gap: 8, marginTop: 8 }}>
						{participants.map((p, i) => (
							<div key={i} className={styles.partRow}>
								<input className={styles.partInput} placeholder="Name" value={p} onChange={(e) => setParticipants((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} />
								<Button variant="danger" size="sm" icon="fa-xmark" onClick={() => setParticipants((arr) => arr.filter((_, j) => j !== i))} />
							</div>
						))}
						<Button variant="ghost" size="md" icon="fa-plus" onClick={() => setParticipants((a) => [...a, ''])}>
							Teilnehmer hinzufügen
						</Button>
					</div>
				</div>

				{/* Zugeordnete Kriterien (mit Reihenfolge) */}
				<div>
					<span className={styles.sectionLabel}>Zugeordnete Kriterien</span>
					{assigned.length === 0 ? (
						<p className={styles.hintEmpty}>Noch keine Kriterien zugeordnet.</p>
					) : (
						<ol className={styles.assignedList}>
							{assigned.map((cid, i) => (
								<li key={cid} className={styles.assignedItem}>
									<span className={styles.pos}>{i + 1}</span>
									<span className={styles.cname}>{byId[cid]?.title || '—'}</span>
									<span className={styles.moveBtns}>
										<button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach oben">
											<i className="fa-solid fa-chevron-up" />
										</button>
										<button onClick={() => move(i, 1)} disabled={i === assigned.length - 1} aria-label="Nach unten">
											<i className="fa-solid fa-chevron-down" />
										</button>
										<button className={styles.removeBtn} onClick={() => setAssigned((a) => a.filter((x) => x !== cid))} aria-label="Entfernen">
											<i className="fa-solid fa-xmark" />
										</button>
									</span>
								</li>
							))}
						</ol>
					)}

					{available.length > 0 && (
						<div className={styles.available}>
							<span className="muted" style={{ fontSize: 13 }}>
								Hinzufügen:
							</span>
							{available.map((c) => (
								<button key={c.id} className={styles.chip} onClick={() => setAssigned((a) => [...a, c.id])}>
									<i className="fa-solid fa-plus" /> {c.title}
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</Modal>
	);
}
