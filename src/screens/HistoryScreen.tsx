import { useState } from "react";
import { Camera, Edit3, History, Plus, Trash2 } from "lucide-react";
import { useApp } from "../context";
import { api } from "../api";
import {
  Button,
  Confirm,
  DateLabel,
  Empty,
  ErrorMessage,
  Icon,
  PageTitle,
} from "../components";
import { number } from "../../shared/calculations";

export function HistoryScreen() {
  const {
    data,
    setData,
    edit,
    requireAccount,
    navigate,
    historyMonth,
    setHistoryMonth,
  } = useApp();
  const [remove, setRemove] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const entries = data.entries
    .filter((e) => !historyMonth || e.date.startsWith(historyMonth))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
  return (
    <>
      <PageTitle
        title="Tous vos repères"
        eyebrow={historyMonth ? `Historique · ${historyMonth}` : "Historique"}
      />
      {historyMonth && (
        <Button onClick={() => setHistoryMonth(null)}>
          Voir toutes mes entrées
        </Button>
      )}
      {entries.length ? (
        <>
          <p className="lead">
            {entries.length} entrée{entries.length > 1 ? "s" : ""}. Un parcours
            qui vous ressemble.
          </p>
          <div className="stack">
            {entries.map((e) => (
              <article className="history-card" key={e.id}>
                <div className="card-top">
                  <h2>
                    <DateLabel date={e.date} full />
                  </h2>
                  <div className="row-actions">
                    <button
                      className="circle"
                      aria-label={`Modifier l’entrée du ${e.date}`}
                      onClick={() => {
                        if (requireAccount()) edit(e);
                      }}
                    >
                      <Icon as={Edit3} size={18} />
                    </button>
                    <button
                      className="circle"
                      aria-label={`Supprimer l’entrée du ${e.date}`}
                      onClick={() => {
                        if (requireAccount()) setRemove(e.id);
                      }}
                    >
                      <Icon as={Trash2} size={18} />
                    </button>
                  </div>
                </div>
                <div className="history-values">
                  {Object.entries(e.values).map(([id, v]) => (
                    <span key={id}>
                      <small>
                        {data.measures.find((m) => m.id === id)?.name}
                      </small>
                      <strong>
                        {number(v)} 
                        {data.measures.find((m) => m.id === id)?.unit}
                      </strong>
                    </span>
                  ))}
                </div>
                {e.note && <p className="saved-note">{e.note}</p>}
                {e.photos.length > 0 && (
                  <button
                    className="text-button"
                    onClick={() => navigate("photos")}
                  >
                    <Icon as={Camera} size={16} />
                    {e.photos.length} photo{e.photos.length > 1 ? "s" : ""}
                  </button>
                )}
              </article>
            ))}
          </div>
        </>
      ) : (
        <Empty title="Votre histoire commence ici." icon={History}>
          Enregistrez votre première entrée pour la retrouver ici.
        </Empty>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      <Button onClick={() => navigate("measure")}>
        Nouvelle mesure
        <Icon as={Plus} />
      </Button>
      {remove && (
        <Confirm
          title="Supprimer cette entrée ?"
          text="Les mesures, la note et les photos associées seront supprimées. Votre analyse sera recalculée."
          busy={busy}
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            setBusy(true);
            try {
              await api(`/entries/${remove}`, { method: "DELETE" });
              setData((d) => ({
                ...d,
                entries: d.entries.filter((e) => e.id !== remove),
              }));
              setRemove(null);
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </>
  );
}
