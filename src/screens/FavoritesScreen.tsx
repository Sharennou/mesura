import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Edit3, Plus, X } from "lucide-react";
import { useApp } from "../context";
import { api } from "../api";
import {
  ActionBar,
  Button,
  Confirm,
  ErrorMessage,
  Icon,
  PageTitle,
} from "../components";
import { number } from "../../shared/calculations";
import type { AccountData, Measure } from "../../shared/types";

export function FavoritesScreen() {
  const { data, setData, requireAccount, back, toast } = useApp();
  const [visible, setVisible] = useState(data.profile.visible);
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("cm");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [archive, setArchive] = useState<Measure | null>(null);
  const [renaming, setRenaming] = useState<Measure | null>(null);
  function reorder(index: number, direction: number) {
    const result = [...visible];
    const next = index + direction;
    if (next < 0 || next >= result.length) return;
    [result[index], result[next]] = [result[next], result[index]];
    setVisible(result);
  }
  async function save() {
    if (!requireAccount() || busy) return;
    setBusy(true);
    try {
      setData(
        await api<AccountData>("/profile", {
          method: "PATCH",
          body: JSON.stringify({ ...data.profile, visible }),
        }),
      );
      toast("Vos repères sont prêts.");
      back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function create(e: FormEvent) {
    e.preventDefault();
    if (!requireAccount()) return;
    setBusy(true);
    try {
      const m = await api<Measure>("/measures", {
        method: "POST",
        body: JSON.stringify({ name, unit }),
      });
      setData((d) => ({ ...d, measures: [...d.measures, m] }));
      setVisible((v) => [...v, m.id]);
      setCustom(false);
      setName("");
      toast("Mesure créée. Enregistrez vos favoris pour l’afficher.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="Mesures favorites" eyebrow="Personnaliser ma saisie" />
      <p className="lead">
        Choisissez vos mesures. Placez les plus utiles en premier.
      </p>
      {visible.length > 0 && (
        <section className="plain-card">
          <h2>Votre ordre de saisie</h2>
          {visible.map((id, i) => {
            const m = data.measures.find((m) => m.id === id);
            return (
              <div className="favorite-row" key={id}>
                <span className="favorite-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <strong>{m?.name}</strong>
                <div className="row-actions">
                  <button
                    className="circle"
                    disabled={i === 0}
                    aria-label={`Monter ${m?.name}`}
                    onClick={() => reorder(i, -1)}
                  >
                    <Icon as={ArrowUp} size={17} />
                  </button>
                  <button
                    className="circle"
                    disabled={i === visible.length - 1}
                    aria-label={`Descendre ${m?.name}`}
                    onClick={() => reorder(i, 1)}
                  >
                    <Icon as={ArrowDown} size={17} />
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}
      <div className="section-heading">
        <h2>Les mesures disponibles</h2>
      </div>
      <div className="measure-options">
        {data.measures
          .filter((m) => m.id !== "weight" && !m.archived)
          .map((m) => (
            <div className="measure-option" key={m.id}>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={visible.includes(m.id)}
                  onChange={(e) =>
                    setVisible((v) =>
                      e.target.checked
                        ? [...v, m.id]
                        : v.filter((id) => id !== m.id),
                    )
                  }
                />
                <span>
                  {m.name}
                  <small>
                    {m.unit}
                    {m.custom ? " · personnalisée" : ""}
                  </small>
                </span>
              </label>
              {m.custom && (
                <div className="row-actions">
                  <button
                    className="circle"
                    aria-label={`Renommer ${m.name}`}
                    onClick={() => {
                      setRenaming(m);
                      setName(m.name);
                      setUnit(m.unit);
                    }}
                  >
                    <Icon as={Edit3} size={16} />
                  </button>
                  <button
                    className="circle"
                    aria-label={`Archiver ${m.name}`}
                    onClick={() => setArchive(m)}
                  >
                    <Icon as={X} size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
      <button
        className="custom-button"
        onClick={() => {
          setName("");
          setUnit("cm");
          setCustom(true);
        }}
      >
        <Icon as={Plus} />
        Mesure personnalisée
      </button>
      {data.measures.some((m) => m.archived) && (
        <details className="data-details">
          <summary>Mesures archivées</summary>
          {data.measures
            .filter((m) => m.archived)
            .map((m) => (
              <p key={m.id}>
                {m.name} · {m.unit} · historique conservé
              </p>
            ))}
        </details>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      <ActionBar onClick={() => void save()} busy={busy}>
        Enregistrer mes favoris
      </ActionBar>
      {(custom || renaming) && (
        <div className="modal-overlay">
          <form
            className="modal stack"
            onSubmit={
              renaming
                ? async (e) => {
                    e.preventDefault();
                    if (!requireAccount()) return;
                    try {
                      await api(`/measures/${renaming.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ name, unit, archived: false }),
                      });
                      setData((d) => ({
                        ...d,
                        measures: d.measures.map((m) =>
                          m.id === renaming.id ? { ...m, name, unit } : m,
                        ),
                      }));
                      setRenaming(null);
                    } catch (e: any) {
                      setError(e.message);
                    }
                  }
                : create
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-title"
          >
            <h2 id="custom-title">
              {renaming ? "Modifier ce repère" : "Un repère sur mesure"}
            </h2>
            <label className="field-label">
              Nom de la mesure
              <input
                autoFocus
                value={name}
                required
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Tour de poignet"
              />
            </label>
            <label className="field-label">
              Unité
              <input
                value={unit}
                required
                maxLength={12}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="cm"
              />
            </label>
            <ErrorMessage>{error}</ErrorMessage>
            <button className="secondary" disabled={busy}>
              {renaming ? "Enregistrer" : "Ajouter ma mesure"}
            </button>
            <Button
              onClick={() => {
                setCustom(false);
                setRenaming(null);
              }}
            >
              Annuler
            </Button>
          </form>
        </div>
      )}
      {archive && (
        <Confirm
          title="Archiver ce repère ?"
          text="La mesure disparaîtra des futures saisies. Son historique restera dans votre analyse et votre export."
          onClose={() => setArchive(null)}
          onConfirm={async () => {
            if (!requireAccount()) return;
            try {
              await api(`/measures/${archive.id}`, {
                method: "PATCH",
                body: JSON.stringify({ ...archive, archived: true }),
              });
              setData((d) => ({
                ...d,
                measures: d.measures.map((m) =>
                  m.id === archive.id ? { ...m, archived: true } : m,
                ),
              }));
              setVisible((v) => v.filter((id) => id !== archive.id));
              setArchive(null);
            } catch (e: any) {
              setError(e.message);
            }
          }}
        />
      )}
    </>
  );
}
