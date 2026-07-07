import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import Spinner from "../ui/Spinner.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { useToast } from "../ui/Toast.jsx";
import styles from "./SubmissionsView.module.css";

export default function SubmissionsView({ projectId }) {
  const [data, setData] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api.listSubmissions(projectId).then(setData).catch((e) => toast(e.message, "error"));
  }, [projectId]);

  if (!data) return <Spinner />;
  if (data.count === 0)
    return <EmptyState icon="fa-inbox" title="Keine Bewertungen" text="Es wurde noch nichts abgegeben." />;

  return (
    <div className="stack" style={{ gap: 16 }}>
      {data.submissions.map((sub, idx) => {
        const byGroup = {};
        for (const a of sub.answers) {
          (byGroup[a.group_name] = byGroup[a.group_name] || []).push(a);
        }
        return (
          <div key={sub.id} className={styles.sub}>
            <div className={styles.subHead}>
              <span>Bewertung {data.count - idx}</span>
              <span className="muted">{new Date(sub.created_at).toLocaleString("de-DE")}</span>
            </div>
            {Object.entries(byGroup).map(([groupName, answers]) => (
              <div key={groupName} className={styles.group}>
                <h5>{groupName}</h5>
                {answers.map((a, i) => (
                  <div key={i} className={styles.answer}>
                    <span className={styles.crit}>{a.criterion_title}</span>
                    {a.criterion_type === "stars" ? (
                      a.stars ? (
                        <span className={styles.stars}>
                          {Array.from({ length: 5 }).map((_, n) => (
                            <i key={n} className={`fa-solid fa-star ${n < a.stars ? styles.on : styles.off}`} />
                          ))}
                        </span>
                      ) : (
                        <span className={styles.text}>Keine Angabe</span>
                      )
                    ) : (
                      <span className={styles.text}>{a.text || "Keine Angabe"}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
