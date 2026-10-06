import { useState } from "react";
import { Edit3, History, Plus, Trash2 } from "lucide-react";
import { useApp } from "../context";
import { useViewState } from "../useViewState";
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
    back,
    viewEntry,
    screen,
    entryId,
    historyMonth,
    setHistoryMonth,
  } = useApp();
  const [date, setDate] = useViewState("history.date", "");
  const [remove, setRemove] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const entries = data.entries
    .filter(
      (e) =>
        (!historyMonth || e.date.startsWith(historyMonth)) &&
        (!date || e.date === date),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
  const entry =
    screen === "entry" ? data.entries.find((e) => e.id === entryId) : null;
  return (
    <>
      <PageTitle
        title={
          screen === "entry" ? "Détail de la mesure" : "Historique des mesures"
        }
      />
      {screen === "entry" ? (
        entry ? (
          <>
            <section className="plain-card">
              <h2>
                <DateLabel date={entry.date} full /> {entry.date.slice(0, 4)}
              </h2>
              {Object.entries(entry.values).map(([id, value]) => (
                <div className="recap-row" key={id}>
                  <span>
                    {data.measures.find((m) => m.id === id)?.name ?? id}
                  </span>
                  <strong>
                    {number(value)}{" "}
                    {data.measures.find((m) => m.id === id)?.unit}
                  </strong>
                </div>
              ))}
              {!Object.keys(entry.values).length && (
                <p className="small muted">
                  Cette entrée ne contient pas de valeur chiffrée.
                </p>
              )}
              {entry.note && (
                <>
                  <h3>Note</h3>
                  <p className="saved-note">{entry.note}</p>
                </>
              )}
            </section>
            <Button
              onClick={() => {
                if (requireAccount()) edit(entry);
              }}
            >
              Modifier la mesure <Icon as={Edit3} />
            </Button>
            <div className="destructive-actions">
              <button
                className="text-button"
                onClick={() => {
                  if (requireAccount()) setRemove(entry.id);
                }}
              >
                <Icon as={Trash2} size={18} />
                Supprimer cette mesure
              </button>
            </div>
          </>
        ) : (
          <Empty title="Cette mesure n’est plus disponible">
            Revenez à l’historique pour consulter vos autres entrées.
          </Empty>
        )
      ) : (
        <>
          <div className="two-fields history-filters">
            <label className="field-label">
              Mois
              <input
                type="month"
                value={historyMonth ?? ""}
                onChange={(e) => {
                  setHistoryMonth(e.target.value || null);
                  setDate("");
                }}
              />
            </label>
            <label className="field-label">
              Date précise
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setHistoryMonth(null);
                }}
              />
            </label>
          </div>
          {(historyMonth || date) && (
            <button
              className="text-button"
              onClick={() => {
                setHistoryMonth(null);
                setDate("");
              }}
            >
              Effacer les filtres
            </button>
          )}
          <p className="small muted history-count">
            {entries.length} entrée{entries.length > 1 ? "s" : ""} · choisissez
            une date pour consulter.
          </p>
          {entries.length ? (
            <div className="stack">
              {entries.map((e) => (
                <button
                  className="history-card history-entry"
                  key={e.id}
                  onClick={() => viewEntry(e.id)}
                  aria-label={`Consulter la mesure du ${e.date}`}
                >
                  <h2>
                    <DateLabel date={e.date} full /> {e.date.slice(0, 4)}
                  </h2>
                  <div className="history-values">
                    {Object.entries(e.values)
                      .slice(0, 4)
                      .map(([id, value]) => (
                        <span key={id}>
                          <small>
                            {data.measures.find((m) => m.id === id)?.name}
                          </small>
                          <strong>
                            {number(value)}{" "}
                            {data.measures.find((m) => m.id === id)?.unit}
                          </strong>
                        </span>
                      ))}
                  </div>
                  <p className="small muted">
                    {[
                      Object.keys(e.values).length > 4
                        ? `${Object.keys(e.values).length} valeurs`
                        : "",
                      e.note ? "Note ajoutée" : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <span className="text-button">Consulter la mesure →</span>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title={
                data.entries.length
                  ? "Aucune entrée pour ces dates"
                  : "Votre histoire commence ici"
              }
              icon={History}
            >
              {data.entries.length
                ? "Choisissez une autre date ou effacez les filtres."
                : "Enregistrez votre première mesure pour la retrouver ici."}
            </Empty>
          )}
          <Button onClick={() => navigate("measure")}>
            Ajouter une mesure <Icon as={Plus} />
          </Button>
        </>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      {remove && (
        <Confirm
          title="Supprimer cette mesure ?"
          text="Les mesures et la note seront supprimées. Votre analyse sera recalculée."
          busy={busy}
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            if (busy) return;
            setBusy(true);
            try {
              await api(`/entries/${remove}`, { method: "DELETE" });
              setData((d) => ({
                ...d,
                entries: d.entries.filter((e) => e.id !== remove),
              }));
              setRemove(null);
              if (screen === "entry") back();
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
