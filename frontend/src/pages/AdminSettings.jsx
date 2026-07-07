import { useState } from 'react';
import { api, setAdminPw } from '../lib/api.js';
import AdminHeader from '../components/admin/AdminHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Field.jsx';
import { useToast } from '../components/ui/Toast.jsx';

export default function AdminSettings() {
	const [pw1, setPw1] = useState('');
	const [pw2, setPw2] = useState('');
	const [busy, setBusy] = useState(false);
	const toast = useToast();

	async function save() {
		if (pw1.length < 4) return toast('Mindestens 4 Zeichen.', 'error');
		if (pw1 !== pw2) return toast('Passwörter stimmen nicht überein.', 'error');
		setBusy(true);
		try {
			await api.changePassword(pw1);
			setAdminPw(pw1);
			setPw1('');
			setPw2('');
			toast('Passwort geändert.', 'success');
		} catch (e) {
			toast(e.message, 'error');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="page">
			<AdminHeader back="/admin" />
			<div className="container" style={{ maxWidth: 560 }}>
				<h1 style={{ marginBottom: 20 }}>Einstellungen</h1>
				<Card className="stack">
					<div>
						<h3>Admin-Passwort ändern</h3>
					</div>
					<Input label="Neues Passwort" type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
					<Input label="Neues Passwort wiederholen" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
					<div>
						<Button icon="fa-floppy-disk" onClick={save} disabled={busy}>
							Speichern
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
}
