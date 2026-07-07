import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import CriteriaTab from "../components/admin/CriteriaTab.jsx";
import GroupsTab from "../components/admin/GroupsTab.jsx";
import ProjectSettingsTab from "../components/admin/ProjectSettingsTab.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import styles from "./AdminProject.module.css";

const TABS = [
  { key: "kriterien", label: "Bewertungskriterien", icon: "fa-list-check" },
  { key: "gruppen", label: "Projektgruppen", icon: "fa-users" },
  { key: "einstellungen", label: "Einstellungen", icon: "fa-sliders" },
];

export default function AdminProject() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState("kriterien");
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      setProject(await api.getProjectAdmin(id));
    } catch (e) {
      toast(e.message, "error");
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!project)
    return (
      <div className="page">
        <AdminHeader back="/admin" />
        <Spinner />
      </div>
    );

  return (
    <div className="page">
      <AdminHeader back="/admin" />
      <div className="container">
        <h1 className={styles.title}>{project.name}</h1>

        <div className={styles.tabs} role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              className={`${styles.tab} ${tab === t.key ? styles.active : ""}`}
              onClick={() => setTab(t.key)}
            >
              <i className={`fa-solid ${t.icon}`} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.panel}>
          {tab === "kriterien" && <CriteriaTab project={project} reload={load} />}
          {tab === "gruppen" && <GroupsTab project={project} reload={load} />}
          {tab === "einstellungen" && <ProjectSettingsTab project={project} reload={load} />}
        </div>
      </div>
    </div>
  );
}
