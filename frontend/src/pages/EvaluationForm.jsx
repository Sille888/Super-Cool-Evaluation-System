import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import Button from '../components/ui/Button.jsx';
import StarRating from '../components/ui/StarRating.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import styles from './EvaluationForm.module.css';

export default function EvaluationForm() {
	const { id } = useParams();
	const [project, setProject] = useState(null);
	const [error, setError] = useState('');
	const [active, setActive] = useState(0);
	const [answers, setAnswers] = useState({}); // key -> {stars} | {text}
	const [highlight, setHighlight] = useState(null); // key with missing answer
	const [submitting, setSubmitting] = useState(false);
	const [done, setDone] = useState(false);
	const refs = useRef({});
	const toast = useToast();

	useEffect(() => {
		api
			.getProject(id)
			.then(setProject)
			.catch((e) => setError(e.message));
	}, [id]);

	const key = (g, c) => `${g}::${c}`;
	const setStars = (g, c, v) => {
		setAnswers((a) => ({ ...a, [key(g, c)]: { stars: v } }));
		setHighlight(null);
	};
	const setText = (g, c, v) => {
		setAnswers((a) => ({ ...a, [key(g, c)]: { text: v } }));
	};
	const toggleSkip = (g, c) => {
		setAnswers((a) => {
			const k = key(g, c);
			if (a[k]?.skipped) {
				const next = { ...a };
				delete next[k];
				return next;
			}
			return { ...a, [k]: { skipped: true } };
		});
		setHighlight(null);
	};

	const isFilled = (g, c, type) => {
		const v = answers[key(g, c)];
		if (!v) return false;
		if (v.skipped) return true;
		return type === 'stars' ? v.stars >= 1 : !!(v.text && v.text.trim());
	};

	const groupComplete = useMemo(() => (g) => g.criteria.every((c) => isFilled(g.id, c.id, c.type)), [answers]);

	function findFirstMissing() {
		if (!project) return null;
		for (let gi = 0; gi < project.groups.length; gi++) {
			const g = project.groups[gi];
			for (const c of g.criteria) {
				if (!isFilled(g.id, c.id, c.type)) return { gi, g, c };
			}
		}
		return null;
	}

	async function submit() {
		const missing = findFirstMissing();
		if (missing) {
			setActive(missing.gi);
			const k = key(missing.g.id, missing.c.id);
			setHighlight(k);
			toast('Bitte alle Felder ausfüllen.', 'error');
			setTimeout(() => {
				refs.current[k]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}, 60);
			return;
		}
		setSubmitting(true);
		try {
			const payload = [];
			for (const g of project.groups) {
				for (const c of g.criteria) {
					const v = answers[key(g.id, c.id)];
					payload.push({
						group_id: g.id,
						criterion_id: c.id,
						skipped: !!v.skipped,
						stars: !v.skipped && c.type === 'stars' ? v.stars : null,
						text: !v.skipped && c.type === 'text' ? v.text.trim() : null,
					});
				}
			}
			await api.submit(id, payload);
			setDone(true);
			window.scrollTo(0, 0);
		} catch (e) {
			toast(e.message, 'error');
		} finally {
			setSubmitting(false);
		}
	}

	if (error)
		return (
			<div className={styles.statePage}>
				<i className="fa-solid fa-circle-exclamation" />
				<p>{error}</p>
			</div>
		);
	if (!project)
		return (
			<div className="page">
				<Spinner />
			</div>
		);

	if (done)
		return (
			<div className={styles.statePage}>
				<div className={styles.doneIcon}>
					<i className="fa-solid fa-check" />
				</div>
				<h1>Vielen Dank!</h1>
				<p className="muted">Deine Bewertung wurde gespeichert.</p>
			</div>
		);

	if (project.groups.length === 0)
		return (
			<div className={styles.statePage}>
				<i className="fa-solid fa-clipboard" />
				<p>Für dieses Projekt sind noch keine Gruppen angelegt.</p>
			</div>
		);

	const group = project.groups[active];
	const totalFilled = project.groups.reduce((n, g) => n + g.criteria.filter((c) => isFilled(g.id, c.id, c.type)).length, 0);
	const totalCount = project.groups.reduce((n, g) => n + g.criteria.length, 0);

	return (
		<div className={styles.page}>
			<header className={styles.top}>
				<div className={styles.topInner}>
					<h1>{project.name}</h1>
					<span className={styles.progress}>
						{totalFilled}/{totalCount} ausgefüllt
					</span>
				</div>
				<div className={styles.pills}>
					{project.groups.map((g, i) => (
						<button key={g.id} className={`${styles.pill} ${i === active ? styles.pillActive : ''}`} onClick={() => setActive(i)}>
							{groupComplete(g) && <i className="fa-solid fa-circle-check" />}
							{g.name}
						</button>
					))}
				</div>
			</header>

			<main className={styles.main}>
				<div className={styles.groupHead}>
					<h2>{group.name}</h2>
					{group.participants.length > 0 && <p className={styles.participants}>{group.participants.join(', ')}</p>}
				</div>

				{group.criteria.length === 0 ? (
					<p className="muted">Dieser Gruppe sind keine Kriterien zugeordnet.</p>
				) : (
					<div className="stack">
						{group.criteria.map((c) => {
							const k = key(group.id, c.id);
							const v = answers[k] || {};
							const isMissing = highlight === k;
							return (
								<div key={c.id} ref={(el) => (refs.current[k] = el)} className={`${styles.criterion} ${isMissing ? styles.missing : ''}`}>
									<div className={styles.critHead}>
										<h3>{c.title}</h3>
										<button
											type="button"
											className={`${styles.skipBtn} ${v.skipped ? styles.skipBtnActive : ''}`}
											onClick={() => toggleSkip(group.id, c.id)}
										>
											<i className="fa-solid fa-ban" />
											{v.skipped ? 'Angabe machen' : 'Keine Angabe'}
										</button>
									</div>
									{c.description && <p className={styles.critDesc}>{c.description}</p>}

									{v.skipped ? (
										<p className={styles.skippedNote}>
											<i className="fa-solid fa-circle-info" /> Dieses Kriterium wird nicht bewertet.
										</p>
									) : c.type === 'stars' ? (
										<StarRating value={v.stars || 0} labels={c.star_labels} onChange={(n) => setStars(group.id, c.id, n)} />
									) : (
										<textarea className={styles.textarea} rows={4} placeholder="Deine Antwort …" value={v.text || ''} onChange={(e) => setText(group.id, c.id, e.target.value)} />
									)}
								</div>
							);
						})}
					</div>
				)}

				<div className={styles.nav}>
					<Button
						variant="secondary"
						icon="fa-chevron-left"
						size="lg"
						disabled={active === 0}
						onClick={() => {
							setActive((a) => a - 1);
							window.scrollTo(0, 0);
						}}
					>
						Zurück
					</Button>
					{active < project.groups.length - 1 ? (
						<Button
							icon="fa-chevron-right"
							size="lg"
							onClick={() => {
								setActive((a) => a + 1);
								window.scrollTo(0, 0);
							}}
						>
							Weiter
						</Button>
					) : (
						<Button icon="fa-paper-plane" onClick={submit} disabled={submitting}>
							{submitting ? 'Senden …' : 'Bewertung abgeben'}
						</Button>
					)}
				</div>
			</main>
		</div>
	);
}
