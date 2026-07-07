import { Navigate, Route, Routes } from 'react-router-dom';
import AdminGate from './pages/AdminGate.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import AdminProject from './pages/AdminProject.jsx';
import EvaluationForm from './pages/EvaluationForm.jsx';
import Results from './pages/Results.jsx';

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<Navigate to="/admin" replace />} />

			<Route
				path="/admin"
				element={
					<AdminGate>
						<AdminDashboard />
					</AdminGate>
				}
			/>
			<Route
				path="/admin/settings"
				element={
					<AdminGate>
						<AdminSettings />
					</AdminGate>
				}
			/>
			<Route
				path="/admin/projects/:id"
				element={
					<AdminGate>
						<AdminProject />
					</AdminGate>
				}
			/>

			<Route path="/projects/:id" element={<EvaluationForm />} />
			<Route path="/projects/:id/auswertung" element={<Results />} />

			<Route path="*" element={<Navigate to="/admin" replace />} />
		</Routes>
	);
}
