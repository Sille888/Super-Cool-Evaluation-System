import { useEffect, useState } from "react";
import { api, getAdminPw, setAdminPw, clearAdminPw } from "../lib/api.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Field.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import styles from "./AdminGate.module.css";

export default function AdminGate({ children }) {
  const [status, setStatus] = useState("checking"); // checking | locked | open
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = getAdminPw();
    if (!saved) {
      setStatus("locked");
      return;
    }
    api
      .login(saved)
      .then(() => setStatus("open"))
      .catch(() => {
        clearAdminPw();
        setStatus("locked");
      });
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.login(pw);
      setAdminPw(pw);
      setStatus("open");
    } catch {
      setError("Falsches Passwort.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking")
    return (
      <div className="page">
        <Spinner />
      </div>
    );

  if (status === "open") return children;

  return (
    <div className={styles.wrap}>
      <Card className={styles.card}>
        <div className={styles.logo}>
          <i className="fa-solid fa-clipboard-check" />
        </div>
        <h1>Admin-Bereich</h1>
        <p className="muted">Bitte Passwort eingeben, um fortzufahren.</p>
        <form onSubmit={submit} className={styles.form}>
          <Input
            type="password"
            placeholder="Passwort"
            value={pw}
            autoFocus
            onChange={(e) => setPw(e.target.value)}
          />
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" full size="lg" disabled={busy} icon="fa-unlock">
            {busy ? "Prüfe …" : "Anmelden"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
