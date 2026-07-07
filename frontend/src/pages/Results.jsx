import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import Spinner from '../components/ui/Spinner.jsx';
import styles from './Results.module.css';

export default function Results() {
	const { id } = useParams();
	const [data, setData] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		api
			.getResults(id)
			.then(setData)
			.catch((e) => setError(e));
	}, [id]);

	if (error)
		return (
			<div className={styles.statePage}>
				<i className={`fa-solid ${error.status === 403 ? 'fa-lock' : 'fa-circle-exclamation'}`} />
				<p>{error.status === 403 ? 'Die Auswertung ist noch nicht freigeschaltet.' : error.message}</p>
			</div>
		);
	if (!data)
		return (
			<div className="page">
				<Spinner />
			</div>
		);

	const maxPct = Math.max(1, ...data.totals.map((t) => t.percentage ?? 0));
	const medals = ['fa-trophy', 'fa-medal', 'fa-award'];

	return (
		<div className={styles.page}>
			<div className={styles.container}>
				<header className={styles.head}>
					<span className={styles.kicker}>Auswertung</span>
					<h1>{data.name}</h1>
					<p className="muted">
						{data.submissions_count} abgegebene Bewertung{data.submissions_count === 1 ? '' : 'en'}
					</p>
				</header>

				{data.submissions_count === 0 ? (
					<div className={styles.statePage}>
						<i className="fa-solid fa-inbox" />
						<p>Es wurden noch keine Bewertungen abgegeben.</p>
					</div>
				) : (
					<>
						{/* Gesamtwertung */}
						<section className={styles.card}>
							<h2 className={styles.sectionTitle}>
								<i className="fa-solid fa-ranking-star" /> Gesamtwertung
							</h2>
							<div className="stack" style={{ gap: 10 }}>
								{data.totals.map((t, i) => (
									<div key={t.group_id} className={`${styles.rankRow} ${t.group_id === data.winner_group_id ? styles.winner : ''}`}>
										<span className={styles.rank}>{i < 3 ? <i className={`fa-solid ${medals[i]}`} /> : i + 1}</span>
										<div className={styles.rankMain}>
											<div className="spread">
												<span className={styles.rankName}>{t.group_name}</span>
												<span className={styles.rankScore}>
													{t.total_points} / {t.max_points} Pkt.
													<span className={styles.rankPct}>{t.percentage != null ? `${t.percentage.toFixed(1)} %` : '–'}</span>
												</span>
											</div>
											<div className={styles.bar}>
												<div className={styles.barFill} style={{ width: `${((t.percentage ?? 0) / maxPct) * 100}%` }} />
											</div>
										</div>
									</div>
								))}
							</div>
						</section>

						{/* Pro Kriterium */}
						{data.criteria.length > 0 && (
							<section className={styles.card}>
								<h2 className={styles.sectionTitle}>
									<i className="fa-solid fa-medal" /> Ergebnis je Kriterium
								</h2>
								<div className="stack" style={{ gap: 22 }}>
									{data.criteria.map((crit) => (
										<div key={crit.criterion_id}>
											<h3 className={styles.critTitle}>{crit.title}</h3>
											<div className="stack" style={{ gap: 7 }}>
												{crit.scores.map((s) => (
													<div key={s.group_id} className={`${styles.scoreRow} ${s.group_id === crit.best_group_id ? styles.best : ''}`}>
														<span className={styles.scoreName}>
															{s.group_id === crit.best_group_id && <i className="fa-solid fa-crown" />}
															{s.group_name}
														</span>
														<span className={styles.scoreStars}>
															{Array.from({ length: 5 }).map((_, n) => (
																<i key={n} className={`fa-solid fa-star ${s.average != null && n < Math.round(s.average) ? styles.on : styles.off}`} />
															))}
															<b>{s.average != null ? s.average.toFixed(2) : '–'}</b>
														</span>
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							</section>
						)}
					</>
				)}
			</div>
		</div>
	);
}
