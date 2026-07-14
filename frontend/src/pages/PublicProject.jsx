import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import Spinner from '../components/ui/Spinner.jsx';
import EvaluationForm from './EvaluationForm.jsx';
import Results from './Results.jsx';
import styles from './EvaluationForm.module.css';

export default function PublicProject() {
	const { id } = useParams();
	const [project, setProject] = useState(null);
	const [results, setResults] = useState(null);
	const [error, setError] = useState('');

	useEffect(() => {
		setProject(null);
		setResults(null);
		setError('');
		api
			.getProject(id)
			.then(setProject)
			.catch((e) => setError(e.message));
	}, [id]);

	useEffect(() => {
		if (project?.display_mode !== 'results') return;
		api
			.getResults(id)
			.then(setResults)
			.catch((e) => setError(e.message));
	}, [project, id]);

	if (error)
		return (
			<div className={styles.statePage}>
				<i className="fa-solid fa-circle-exclamation" />
				<p>{error}</p>
			</div>
		);

	if (!project || (project.display_mode === 'results' && !results))
		return (
			<div className="page">
				<Spinner />
			</div>
		);

	if (project.display_mode === 'paused')
		return (
			<div className={styles.statePage}>
				<i className="fa-solid fa-circle-pause" />
				<h1>Bewertung pausiert</h1>
				<p className="muted">Für dieses Projekt ist aktuell weder das Bewertungsformular noch die Auswertung freigegeben.</p>
			</div>
		);

	if (project.display_mode === 'results') return <Results data={results} />;

	return <EvaluationForm id={id} project={project} />;
}
