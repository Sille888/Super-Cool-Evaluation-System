import { useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';
import QrCode from '../ui/QrCode.jsx';
import { Input } from '../ui/Field.jsx';
import SubmissionsView from './SubmissionsView.jsx';
import { useToast } from '../ui/Toast.jsx';
import styles from './ProjectSettings.module.css';

const MODES = [
	{ key: 'paused', label: 'Bewertung pausiert', icon: 'fa-circle-pause' },
	{ key: 'form', label: 'Bewertungsformular', icon: 'fa-pen-to-square' },
	{ key: 'results', label: 'Auswertung', icon: 'fa-chart-simple' },
];

export default function ProjectSettingsTab({ project, reload }) {
	const [name, setName] = useState(project.name);
	const [showSubs, setShowSubs] = useState(false);
	const [confirmReset, setConfirmReset] = useState(false);
	const [confirmDelProject, setConfirmDelProject] = useState(false);
	const [showQr, setShowQr] = useState(false);
	const qrCanvasRef = useRef(null);
	const toast = useToast();

	const origin = window.location.origin;
	const publicUrl = `${origin}/projects/${project.id}`;

	function copy(text) {
		navigator.clipboard.writeText(text).then(
			() => toast('Link kopiert.', 'success'),
			() => toast('Kopieren fehlgeschlagen.', 'error'),
		);
	}

	function downloadQr() {
		const canvas = qrCanvasRef.current;
		if (!canvas) return;
		const a = document.createElement('a');
		a.download = `qr-projekt-${project.id}.png`;
		a.href = canvas.toDataURL('image/png');
		a.click();
	}

	async function saveName() {
		if (!name.trim() || name.trim() === project.name) return;
		try {
			await api.updateProject(project.id, { name: name.trim() });
			await reload();
			toast('Name gespeichert.', 'success');
		} catch (e) {
			toast(e.message, 'error');
		}
	}

	async function setMode(mode) {
		if (mode === project.display_mode) return;
		try {
			await api.updateProject(project.id, { display_mode: mode });
			await reload();
			toast('Anzeige aktualisiert.', 'success');
		} catch (e) {
			toast(e.message, 'error');
		}
	}

	async function reset() {
		try {
			await api.resetSubmissions(project.id);
			setConfirmReset(false);
			await reload();
			toast('Bewertungen zurückgesetzt.', 'success');
		} catch (e) {
			toast(e.message, 'error');
		}
	}

	async function deleteProject() {
		try {
			await api.deleteProject(project.id);
			window.location.href = '/admin';
		} catch (e) {
			toast(e.message, 'error');
		}
	}

	return (
		<div className="stack" style={{ gap: 16 }}>
			<Card className="stack">
				<h3>Projektname</h3>
				<div className={styles.inline}>
					<Input value={name} onChange={(e) => setName(e.target.value)} />
					<Button icon="fa-floppy-disk" onClick={saveName} disabled={!name.trim() || name.trim() === project.name}>
						Speichern
					</Button>
				</div>
			</Card>

			<Card className="stack">
				<h3>Link</h3>
				<LinkRow icon="fa-link" label="Projektlink" url={publicUrl} onCopy={() => copy(publicUrl)} onQr={() => setShowQr(true)} />
			</Card>

			<Card className="stack">
				<h3>Anzeige über den Link</h3>
				<p className="muted" style={{ margin: '-6px 0 4px', fontSize: 14 }}>
					Legt fest, was Teilnehmer:innen unter diesem Link sehen.
				</p>
				<div className={styles.modeRow}>
					{MODES.map((m) => (
						<button
							key={m.key}
							type="button"
							className={`${styles.modeBtn} ${project.display_mode === m.key ? styles.modeBtnActive : ''}`}
							onClick={() => setMode(m.key)}
						>
							<i className={`fa-solid ${m.icon}`} />
							{m.label}
						</button>
					))}
				</div>
			</Card>

			<Card>
				<div className="spread">
					<div>
						<h3>Abgegebene Bewertungen</h3>
						<p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
							{project.submissions_count} Bewertung(en) eingegangen.
						</p>
					</div>
					<div className="row" style={{ gap: 8 }}>
						<Button variant="secondary" icon="fa-eye" onClick={() => setShowSubs(true)} disabled={!project.submissions_count}>
							Einsehen
						</Button>
						<Button variant="danger" icon="fa-rotate-left" onClick={() => setConfirmReset(true)} disabled={!project.submissions_count}>
							Zurücksetzen
						</Button>
					</div>
				</div>
			</Card>

			<Card className={styles.danger}>
				<div className="spread">
					<div>
						<h3>Projekt löschen</h3>
						<p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
							Entfernt das Projekt mit allen Gruppen, Kriterien und Bewertungen.
						</p>
					</div>
					<Button variant="dangerSolid" icon="fa-trash" onClick={() => setConfirmDelProject(true)}>
						Löschen
					</Button>
				</div>
			</Card>

			<Modal open={showSubs} wide title="Abgegebene Bewertungen" onClose={() => setShowSubs(false)}>
				<SubmissionsView projectId={project.id} />
			</Modal>

			<Modal
				open={showQr}
				title="QR-Code – Projektlink"
				onClose={() => setShowQr(false)}
				footer={
					<>
						<Button variant="secondary" onClick={() => setShowQr(false)}>
							Schließen
						</Button>
						<Button icon="fa-download" onClick={downloadQr}>
							Als PNG speichern
						</Button>
					</>
				}
			>
				<div className={styles.qrWrap}>
					<QrCode ref={qrCanvasRef} value={publicUrl} size={240} />
					<p className={styles.qrUrl}>{publicUrl}</p>
				</div>
			</Modal>

			<Modal
				open={confirmReset}
				title="Bewertungen zurücksetzen?"
				onClose={() => setConfirmReset(false)}
				footer={
					<>
						<Button variant="secondary" onClick={() => setConfirmReset(false)}>
							Abbrechen
						</Button>
						<Button variant="dangerSolid" icon="fa-rotate-left" onClick={reset}>
							Zurücksetzen
						</Button>
					</>
				}
			>
				<p style={{ margin: 0 }}>Alle {project.submissions_count} abgegebenen Bewertungen werden unwiderruflich gelöscht.</p>
			</Modal>

			<Modal
				open={confirmDelProject}
				title="Projekt löschen?"
				onClose={() => setConfirmDelProject(false)}
				footer={
					<>
						<Button variant="secondary" onClick={() => setConfirmDelProject(false)}>
							Abbrechen
						</Button>
						<Button variant="dangerSolid" icon="fa-trash" onClick={deleteProject}>
							Endgültig löschen
						</Button>
					</>
				}
			>
				<p style={{ margin: 0 }}>„{project.name}“ und alle zugehörigen Daten werden gelöscht.</p>
			</Modal>
		</div>
	);
}

function LinkRow({ icon, label, url, onCopy, onQr }) {
	return (
		<div className={styles.linkRow}>
			<i className={`fa-solid ${icon}`} />
			<div className={styles.linkText}>
				<span className={styles.linkLabel}>{label}</span>
				<a href={url} target="_blank" rel="noreferrer" className={styles.linkUrl}>
					{url}
				</a>
			</div>
			<div className="row" style={{ gap: 8 }}>
				{onQr && (
					<Button variant="secondary" size="sm" icon="fa-qrcode" onClick={onQr}>
						QR-Code
					</Button>
				)}
				<Button variant="secondary" size="sm" icon="fa-copy" onClick={onCopy}>
					Kopieren
				</Button>
			</div>
		</div>
	);
}
