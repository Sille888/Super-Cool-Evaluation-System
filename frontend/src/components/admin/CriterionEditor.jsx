import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { Input, Textarea, Select } from '../ui/Field.jsx';
import styles from './CriterionEditor.module.css';

const empty = { title: '', description: '', type: 'stars', star_labels: ['', '', '', '', ''] };

export default function CriterionEditor({ open, initial, onClose, onSave }) {
	const [data, setData] = useState(empty);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (open) {
			setData(
				initial
					? {
							title: initial.title || '',
							description: initial.description || '',
							type: initial.type || 'stars',
							star_labels: (initial.star_labels || ['', '', '', '', '']).slice(0, 5),
						}
					: empty,
			);
		}
	}, [open, initial]);

	const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
	const setLabel = (i, v) =>
		setData((d) => {
			const l = [...d.star_labels];
			l[i] = v;
			return { ...d, star_labels: l };
		});

	const autoSize = (el) => {
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight}px`;
	};

	async function save() {
		if (!data.title.trim()) return;
		setBusy(true);
		try {
			await onSave(data);
			onClose();
		} finally {
			setBusy(false);
		}
	}

	return (
		<Modal
			open={open}
			title={initial ? 'Kriterium bearbeiten' : 'Neues Kriterium'}
			onClose={onClose}
			footer={
				<>
					<Button variant="secondary" onClick={onClose}>
						Abbrechen
					</Button>
					<Button onClick={save} disabled={busy || !data.title.trim()}>
						Speichern
					</Button>
				</>
			}
		>
			<div className="stack">
				<Input label="Titel" placeholder="z. B. Vortragsweise" value={data.title} autoFocus onChange={(e) => set('title', e.target.value)} />
				<Textarea label="Beschreibung (optional)" placeholder="Worauf soll geachtet werden?" value={data.description} onChange={(e) => set('description', e.target.value)} />
				<Select label="Antwortart" value={data.type} onChange={(e) => set('type', e.target.value)}>
					<option value="stars">Sterne</option>
					<option value="text">Freitext</option>
				</Select>

				{data.type === 'stars' && (
					<div className={styles.labels}>
						<span className={styles.labelsTitle}>
							Bedeutung je Sternzahl <span className="muted">(optional)</span>
						</span>
						{[1, 2, 3, 4, 5].map((n) => (
							<div key={n} className={styles.labelRow}>
								<span className={styles.stars}>
									{Array.from({ length: n }).map((_, i) => (
										<i key={i} className="fa-solid fa-star" />
									))}
								</span>
								<textarea
									ref={autoSize}
									rows={1}
									className={styles.labelInput}
									placeholder={`Bedeutung für ${n} ${n === 1 ? 'Stern' : 'Sterne'}`}
									value={data.star_labels[n - 1] || ''}
									onChange={(e) => {
										setLabel(n - 1, e.target.value);
										autoSize(e.target);
									}}
								/>
							</div>
						))}
					</div>
				)}
			</div>
		</Modal>
	);
}
