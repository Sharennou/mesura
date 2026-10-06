import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { GripVertical, Edit3, Plus, X } from "lucide-react";
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
  const listRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: string;
    original: string[];
    pointerId?: number;
    y: number;
    offset: number;
    left: number;
    width: number;
  } | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  function reorder(id: string, next: number) {
    setVisible((current) => {
      const index = current.indexOf(id);
      if (index < 0 || next < 0 || next >= current.length || next === index)
        return current;
      const result = [...current];
      result.splice(index, 1);
      result.splice(next, 0, id);
      return result;
    });
  }
  function movePointer() {
    const current = drag.current;
    if (!current || current.pointerId === undefined) return;
    const rows = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>(".favorite-row") ?? [],
    );
    const next = rows.reduce(
      (closest, row, index) => {
        const rect = row.getBoundingClientRect();
        const distance = Math.abs(current.y - (rect.top + rect.height / 2));
        return distance < closest.distance ? { index, distance } : closest;
      },
      { index: 0, distance: Infinity },
    ).index;
    reorder(current.id, next);
    setPreview({
      top: current.y - current.offset,
      left: current.left,
      width: current.width,
    });
  }
  function finishMove(cancel = false) {
    const current = drag.current;
    if (!current) return;
    if (cancel) setVisible(current.original);
    const name = data.measures.find((m) => m.id === current.id)?.name;
    setAnnouncement(
      cancel
        ? "Déplacement annulé."
        : `${name} en position ${visible.indexOf(current.id) + 1} sur ${visible.length}.`,
    );
    drag.current = null;
    setMovingId(null);
    setPreview(null);
  }
  function startPointer(e: PointerEvent<HTMLButtonElement>, id: string) {
    if (busy || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    listRef.current!.setPointerCapture(e.pointerId);
    const rect = e.currentTarget
      .closest(".favorite-row")!
      .getBoundingClientRect();
    drag.current = {
      id,
      original: [...visible],
      pointerId: e.pointerId,
      y: e.clientY,
      offset: e.clientY - rect.top,
      left: rect.left,
      width: rect.width,
    };
    setMovingId(id);
    setPreview({ top: rect.top, left: rect.left, width: rect.width });
    setAnnouncement(
      `${data.measures.find((m) => m.id === id)?.name} sélectionnée.`,
    );
  }
  function moveKeyboard(e: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (busy) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (drag.current) finishMove();
      else {
        drag.current = {
          id,
          original: [...visible],
          y: 0,
          offset: 0,
          left: 0,
          width: 0,
        };
        setMovingId(id);
        setAnnouncement(
          "Mesure sélectionnée. Utilisez les flèches haut et bas, puis Entrée pour déposer.",
        );
      }
    } else if (
      drag.current?.id === id &&
      (e.key === "ArrowUp" || e.key === "ArrowDown")
    ) {
      e.preventDefault();
      const next = visible.indexOf(id) + (e.key === "ArrowUp" ? -1 : 1);
      reorder(id, next);
      if (next >= 0 && next < visible.length)
        setAnnouncement(`Position ${next + 1} sur ${visible.length}.`);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finishMove(true);
    }
  }
  useEffect(() => {
    if (!movingId || drag.current?.pointerId === undefined) return;
    let frame: number;
    const scroll = () => {
      const current = drag.current;
      if (!current) return;
      const bottom = window.innerHeight - 160;
      const step = current.y < 100 ? -8 : current.y > bottom ? 8 : 0;
      if (step) {
        window.scrollBy(0, step);
        movePointer();
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [movingId]);
  async function save() {
    if (!requireAccount() || busy || movingId) return;
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
          <p id="favorites-drag-help" className="small muted">
            Glissez la poignée pour changer l’ordre.
          </p>
          <span id="favorites-keyboard-help" className="sr-only">
            Au clavier : Espace pour saisir, flèches haut et bas pour déplacer,
            Entrée pour déposer, Échap pour annuler.
          </span>
          <div
            ref={listRef}
            className="favorite-list"
            role="list"
            aria-label="Ordre des mesures favorites"
            onPointerMove={(e) => {
              if (drag.current?.pointerId !== e.pointerId) return;
              drag.current.y = e.clientY;
              movePointer();
            }}
            onPointerUp={() => finishMove()}
            onPointerCancel={() => finishMove(true)}
            onLostPointerCapture={() => finishMove(true)}
          >
            {visible.map((id, i) => {
              const m = data.measures.find((m) => m.id === id);
              return (
                <div
                  className={`favorite-row ${movingId === id ? "is-moving" : ""}`}
                  key={id}
                  role="listitem"
                >
                  <span className="favorite-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <strong>{m?.name}</strong>
                  <button
                    type="button"
                    className="circle favorite-grip"
                    disabled={busy || visible.length < 2}
                    aria-label={`Déplacer ${m?.name}`}
                    aria-describedby="favorites-drag-help favorites-keyboard-help"
                    aria-pressed={movingId === id}
                    onPointerDown={(e) => startPointer(e, id)}
                    onKeyDown={(e) => moveKeyboard(e, id)}
                    onBlur={() => {
                      if (drag.current?.pointerId === undefined) finishMove();
                    }}
                  >
                    <Icon as={GripVertical} size={20} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      {preview && movingId && (
        <div
          className="favorite-row favorite-drag-preview"
          style={preview}
          aria-hidden="true"
        >
          <Icon as={GripVertical} size={20} />
          <strong>{data.measures.find((m) => m.id === movingId)?.name}</strong>
        </div>
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
                  disabled={busy || Boolean(movingId)}
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
      <ActionBar
        onClick={() => void save()}
        busy={busy}
        disabled={Boolean(movingId)}
      >
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
