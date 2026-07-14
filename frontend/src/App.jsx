import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import AdminGate from './pages/AdminGate.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import AdminProject from './pages/AdminProject.jsx';
import PublicProject from './pages/PublicProject.jsx';

function RedirectToProject() {
	const { id } = useParams();
	return <Navigate to={`/projects/${id}`} replace />;
}

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

			<Route path="/projects/:id" element={<PublicProject />} />
			<Route path="/projects/:id/auswertung" element={<RedirectToProject />} />

			<Route path="*" element={<Navigate to="/admin" replace />} />
		</Routes>
	);
}
