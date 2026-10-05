import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Camera,
  Check,
  ChevronDown,
  CalendarDays,
  SlidersHorizontal,
  Plus,
  Minus,
  Flame,
  Ruler,
  LockKeyhole,
  ImagePlus,
} from "lucide-react";
import { useApp } from "../context";
import {
  ActionBar,
  Badge,
  Button,
  DateLabel,
  Empty,
  ErrorMessage,
  Icon,
  PageTitle,
  Progress,
} from "../components";
import {
  latest,
  localDate,
  parseDecimal,
  number,
  goalProgress,
  streak,
} from "../../shared/calculations";
import {
  CONSENT_TEXTS,
  CONSENT_VERSION,
  MAX_PHOTO_BYTES,
} from "../../shared/config";
import type { AccountData, Entry } from "../../shared/types";
import { api } from "../api";
export function MeasureScreen() {
  const {
    data,
    demo,
    editing,
    navigate,
    requireAccount,
    saved,
    setData,
    draft,
    setDraft,
  } = useApp();
  const today = localDate(data.profile.timezone);
  const latestDemo = latest(data.entries, "weight");
  const initial = editing
    ? Object.fromEntries(
        Object.entries(editing.values).map(([id, v]) => [id, number(v)]),
      )
    : (draft?.values ??
      (demo
        ? Object.fromEntries(
            Object.entries(latestDemo?.values ?? {}).map(([id, v]) => [
              id,
              number(v),
            ]),
          )
        : {}));
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [date, setDate] = useState(editing?.date ?? draft?.date ?? today);
  const [note, setNote] = useState(editing?.note ?? draft?.note ?? "");
  const [photos, setPhotos] = useState<Record<string, File>>(
    editing ? {} : (draft?.photos ?? {}),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [accepted, setAccepted] = useState(false);
  useEffect(() => {
    if (!editing) setDraft({ values, date, note, photos });
  }, [values, date, note, photos, editing, setDraft]);
  const [historicalHeight, setHistoricalHeight] = useState(
    editing?.height ? number(editing.height) : "",
  );
  const requestId = useRef(crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const weight = parseDecimal(values.weight || "");
  const previousEntries = data.entries.filter(
    (e) =>
      e.id !== editing?.id &&
      (e.date < date ||
        (e.date === date && (!editing || e.createdAt < editing.createdAt))),
  );
  const previous =
    latest(previousEntries, "weight", date)?.values.weight ?? null;
  const variation =
    weight !== null && Number.isFinite(weight) && previous !== null
      ? weight - previous
      : null;
  const goal = data.goal?.measureId === "weight" ? data.goal : null;
  const progress =
    goal && weight !== null && Number.isFinite(weight)
      ? goalProgress(goal, weight)
      : null;
  const visible = data.measures
    .filter(
      (m) =>
        m.id !== "weight" &&
        (data.profile.visible.includes(m.id) ||
          editing?.values[m.id] !== undefined),
    )
    .sort(
      (a, b) =>
        data.profile.visible.indexOf(a.id) - data.profile.visible.indexOf(b.id),
    );
  function update(id: string, value: string) {
    setValues((v) => ({ ...v, [id]: value }));
    setError("");
  }
  function step(amount: number) {
    const current =
      parseDecimal(values.weight || "") ??
      latest(data.entries, "weight")?.values.weight ??
      0;
    if (!Number.isFinite(current) || current + amount <= 0) return;
    update("weight", number(Math.round((current + amount) * 10) / 10));
  }
  async function grantPhotos() {
    if (!accepted) return;
    if (!requireAccount()) return;
    try {
      setData(
        await api<AccountData>("/consents", {
          method: "POST",
          body: JSON.stringify({
            purpose: "photos",
            granted: true,
            version: CONSENT_VERSION,
          }),
        }),
      );
      setPhotoConsent(false);
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !requireAccount()) return;
    if (!data.consents.body) {
      navigate("privacy");
      return;
    }
    const parsed: Record<string, number> = {};
    for (const [id, value] of Object.entries(values)) {
      if (id !== "weight" && !visible.some((m) => m.id === id)) continue;
      const result = parseDecimal(value);
      if (result !== null) {
        if (!Number.isFinite(result)) {
          setError(
            `${data.measures.find((m) => m.id === id)?.name} : saisissez un nombre strictement positif, avec un point ou une virgule.`,
          );
          formRef.current
            ?.querySelector<HTMLInputElement>(`[name="${id}"]`)
            ?.focus();
          return;
        }
        parsed[id] = result;
      }
    }
    if (
      !Object.keys(parsed).length &&
      !note.trim() &&
      !Object.keys(photos).length &&
      !editing?.photos.length
    ) {
      setError("Ajoutez au moins une mesure, une note ou une photo.");
      return;
    }
    setBusy(true);
    setError("");
    const height = editing
      ? parseDecimal(historicalHeight)
      : data.profile.height;
    if (height !== null && !Number.isFinite(height)) {
      setError(
        "La stature historique doit être strictement positive ou laissée vide.",
      );
      setBusy(false);
      return;
    }
    const payload = {
      date,
      values: parsed,
      note,
      height,
      requestId: requestId.current,
    };
    const body = new FormData();
    body.set("data", JSON.stringify(payload));
    for (const [orientation, file] of Object.entries(photos))
      body.set(orientation, file);
    try {
      const entry = await api<Entry>(
        editing ? `/entries/${editing.id}` : "/entries",
        {
          method: editing ? "PUT" : "POST",
          body: Object.keys(photos).length ? body : JSON.stringify(payload),
        },
      );
      saved(entry, previous);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!demo && !data.consents.body)
    return (
      <>
        <PageTitle
          title="Votre premier repère"
          eyebrow="À votre rythme"
          back={false}
        />
        <Empty title="Votre corps, vos choix" icon={Ruler}>
          Activez le suivi corporel pour commencer. Les photos et les rappels
          restent facultatifs.
        </Empty>
        <ActionBar onClick={() => navigate("privacy")}>
          Choisir mes consentements
        </ActionBar>
      </>
    );
  return (
    <>
      <PageTitle
        title={editing ? "Modifier ma mesure" : "Nouvelle mesure"}
        eyebrow="Votre repère du jour"
        back={false}
      />
      <form id="measurement-form" onSubmit={submit} ref={formRef} noValidate>
        <div className="date-row">
          <label className="date-chip">
            <Icon as={CalendarDays} size={16} />
            <span>
              <DateLabel date={date} full />
            </span>
            <Icon as={ChevronDown} size={14} />
            <input
              type="date"
              aria-label="Date de la mesure"
              value={date}
              max={today}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
          <span className="today-label">
            {date === today ? "Aujourd’hui" : "Autre date"}
          </span>
        </div>
        <section className="weight-card">
          <div className="card-top">
            <label className="eyebrow" htmlFor="weight">
              Poids
            </label>
            <Badge value={variation} unit="kg" inverse />
          </div>
          <div className="hero-input-row">
            <input
              id="weight"
              name="weight"
              aria-describedby="weight-hint"
              className="hero-input"
              style={
                values.weight && values.weight.length > 4
                  ? {
                      fontSize: `${Math.max(52, Math.floor(540 / values.weight.length))}px`,
                    }
                  : undefined
              }
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={values.weight || ""}
              placeholder={
                latest(data.entries, "weight")
                  ? number(latest(data.entries, "weight")!.values.weight)
                  : "—"
              }
              onChange={(e) => update("weight", e.target.value)}
              onBlur={() => {
                if (weight !== null && Number.isFinite(weight))
                  update("weight", number(weight));
              }}
              maxLength={8}
            />
            <span className="hero-unit">kg</span>
          </div>
          <p id="weight-hint" className="weight-hint">
            {demo
              ? "Un exemple pour découvrir votre suivi."
              : values.weight
                ? "Votre mesure, à votre rythme."
                : latest(data.entries, "weight")
                  ? "Dernière valeur en repère. Touchez pour saisir."
                  : "Touchez pour saisir votre premier poids."}
          </p>
          <div className="stepper">
            <button
              type="button"
              onClick={() => step(-0.1)}
              aria-label="Diminuer le poids de 0,1 kilogramme"
            >
              <Icon as={Minus} size={18} />
              0,1
            </button>
            <button
              type="button"
              onClick={() => step(0.1)}
              aria-label="Augmenter le poids de 0,1 kilogramme"
            >
              <Icon as={Plus} size={18} />
              0,1
            </button>
          </div>
          {goal && (
            <div className="weight-goal">
              <div className="goal-label">
                <span>
                  Objectif personnel <strong>{number(goal.target)} kg</strong>
                </span>
                <strong>
                  {progress === null
                    ? goal.start === goal.target
                      ? "Maintien"
                      : "—"
                    : `${Math.round(progress)} %`}
                </strong>
              </div>
              {progress !== null && <Progress value={progress} />}
              <p>Chaque saisie compte. Gardez votre rythme.</p>
            </div>
          )}
        </section>
        <div className="section-heading">
          <h2>Vos mensurations</h2>
          <button
            type="button"
            className="text-button"
            onClick={() => navigate("favorites")}
          >
            <Icon as={SlidersHorizontal} size={16} />
            <span>Personnaliser</span>
          </button>
        </div>
        <div className="measurement-grid">
          {visible.map((m) => {
            const val = parseDecimal(values[m.id] || "");
            const previousEntry = latest(previousEntries, m.id, date);
            const diff =
              val !== null && Number.isFinite(val) && previousEntry
                ? val - previousEntry.values[m.id]
                : null;
            return (
              <div className="measure-tile" key={m.id}>
                <label htmlFor={`input-${m.id}`} className="eyebrow">
                  {m.name}
                </label>
                <div className="tile-input-row">
                  <input
                    id={`input-${m.id}`}
                    name={m.id}
                    type="text"
                    inputMode="decimal"
                    aria-label={`${m.name} en ${m.unit}`}
                    autoComplete="off"
                    maxLength={10}
                    value={values[m.id] || ""}
                    placeholder={
                      latest(data.entries, m.id)
                        ? number(latest(data.entries, m.id)!.values[m.id])
                        : "—"
                    }
                    onChange={(e) => update(m.id, e.target.value)}
                    onBlur={() => {
                      if (val !== null && Number.isFinite(val))
                        update(m.id, number(val));
                    }}
                  />
                  <span>{m.unit}</span>
                </div>
                <Badge value={diff} unit={m.unit} />
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="custom-button"
          onClick={() => navigate("favorites")}
        >
          <Icon as={Plus} size={18} />
          Mesure personnalisée
        </button>
        <div className="section-heading">
          <h2>Un peu de contexte ?</h2>
          <span className="optional">Facultatif</span>
        </div>
        <div className="note-field">
          <label className="eyebrow" htmlFor="note">
            Note de cette entrée
          </label>
          <textarea
            id="note"
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Énergie, séance, ressenti… votre note à vous."
            rows={3}
          />
          <span className="counter">{note.length} / 2 000</span>
        </div>
        <div className="section-heading">
          <h2>Votre repère en images</h2>
          <Icon as={Camera} size={18} />
        </div>
        <p className="muted small">
          Trois angles. Une évolution qui vous appartient.
        </p>
        <div className="photo-upload-grid">
          {(["face", "profil", "dos"] as const).map((orientation) => (
            <label
              key={orientation}
              className={`photo-upload ${photos[orientation] ? "selected" : ""}`}
              onClick={(e) => {
                if (demo || !data.consents.photos) {
                  e.preventDefault();
                  if (requireAccount()) setPhotoConsent(true);
                }
              }}
            >
              <Icon as={photos[orientation] ? Check : ImagePlus} size={24} />
              <strong>
                {orientation === "face"
                  ? "Face"
                  : orientation === "profil"
                    ? "Profil"
                    : "Dos"}
              </strong>
              <small>
                {photos[orientation]
                  ? "Prête à envoyer"
                  : editing?.photos.some((p) => p.orientation === orientation)
                    ? "Remplacer"
                    : "Ajouter"}
              </small>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,.heic,.heif"
                aria-label={`Ajouter une photo de ${orientation}`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > MAX_PHOTO_BYTES) {
                    setError("Photo trop volumineuse. Maximum : 10 Mo.");
                    return;
                  }
                  setPhotos((p) => ({ ...p, [orientation]: file }));
                }}
              />
            </label>
          ))}
        </div>
        {Object.keys(photos).length > 0 && (
          <Button onClick={() => setPhotos({})}>
            Retirer les photos sélectionnées
          </Button>
        )}
        {editing && (
          <section className="plain-card">
            <label className="field-label">
              Stature de cette entrée, en cm
              <input
                inputMode="decimal"
                value={historicalHeight}
                onChange={(e) => setHistoricalHeight(e.target.value)}
              />
              <small>
                Valeur conservée pour les calculs historiques. Corrigez-la ici
                uniquement si elle était erronée.
              </small>
            </label>
          </section>
        )}
        <p className="privacy-caption">
          <Icon as={LockKeyhole} size={14} />
          Vos mesures, notes et photos restent privées.
        </p>
        <ErrorMessage>{error}</ErrorMessage>
        <ActionBar form="measurement-form" busy={busy}>
          {editing ? "Enregistrer les modifications" : "Enregistrer la mesure"}
        </ActionBar>
      </form>
      {photoConsent && (
        <div className="modal-overlay">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photos-title"
          >
            <h2 id="photos-title">Vos photos restent à vous.</h2>
            <p>
              JPEG, PNG ou WebP, 10 Mo maximum. L’orientation est corrigée et
              les métadonnées, dont la localisation, sont supprimées. Les images
              ne sont pas analysées.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>{CONSENT_TEXTS.photos}</span>
            </label>
            <div className="stack">
              <Button disabled={!accepted} onClick={() => void grantPhotos()}>
                Autoriser mes photos
              </Button>
              <Button onClick={() => setPhotoConsent(false)}>Plus tard</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export function SuccessScreen() {
  const { success, data, navigate, edit } = useApp();
  if (!success)
    return (
      <>
        <PageTitle title="Vos repères" back={false} />
        <Empty title="Prêt pour une nouvelle mesure ?" />
        <ActionBar onClick={() => navigate("measure")}>
          Nouvelle mesure
        </ActionBar>
      </>
    );
  const { entry, previous } = success;
  const change =
    entry.values.weight !== undefined && previous !== null
      ? entry.values.weight - previous
      : null;
  const count = Object.keys(entry.values).length;
  return (
    <div className="success-content">
      <div className="saved-label">
        <Icon as={Check} />
        Mesure enregistrée
      </div>
      <PageTitle
        title="Un repère de plus."
        eyebrow="C’est dans la boîte"
        back={false}
      />
      <div className="success-hero">
        {change !== null ? (
          <>
            <span
              style={
                number(Math.abs(change)).length > 4
                  ? {
                      fontSize: `${Math.floor(560 / (number(Math.abs(change)).length + 1))}px`,
                    }
                  : undefined
              }
            >
              {change > 0 ? "+" : change < 0 ? "−" : ""}
              {number(Math.abs(change))}
            </span>
            <small>kg</small>
          </>
        ) : (
          <>
            <span
              style={
                entry.values.weight !== undefined &&
                number(entry.values.weight).length > 4
                  ? {
                      fontSize: `${Math.floor(560 / number(entry.values.weight).length)}px`,
                    }
                  : undefined
              }
            >
              {entry.values.weight !== undefined
                ? number(entry.values.weight)
                : count || "✓"}
            </span>
            <small>
              {entry.values.weight !== undefined
                ? "kg"
                : count
                  ? count > 1
                    ? "mesures"
                    : "mesure"
                  : "enregistré"}
            </small>
          </>
        )}
      </div>
      <p className="success-description">
        {change !== null
          ? "Depuis votre précédente mesure."
          : data.entries.length === 1
            ? "Votre premier repère est posé."
            : "Votre saisie est bien enregistrée."}
        <br />
        L’essentiel, c’est de prendre le temps.
      </p>
      <div className="success-recap">
        <div className="card-top">
          <span className="eyebrow">Votre saisie</span>
          <DateLabel date={entry.date} />
        </div>
        {Object.entries(entry.values).map(([id, value]) => (
          <div className="recap-row" key={id}>
            <span>{data.measures.find((m) => m.id === id)?.name}</span>
            <strong>
              {number(value)} {data.measures.find((m) => m.id === id)?.unit}
            </strong>
          </div>
        ))}
        {entry.note && <p className="saved-note">{entry.note}</p>}
        {entry.photos.length > 0 && (
          <p>
            {entry.photos.length} photo{entry.photos.length > 1 ? "s" : ""}{" "}
            privée{entry.photos.length > 1 ? "s" : ""}
          </p>
        )}
      </div>
      <div className="streak-card">
        <Icon as={Flame} size={32} />
        <span className="streak-value">
          {streak(data.entries, localDate(data.profile.timezone))}
        </span>
        <span>
          <strong>semaines de régularité</strong>
          <small>Un rendez-vous avec vous-même.</small>
        </span>
      </div>
      <button className="text-button success-edit" onClick={() => edit(entry)}>
        Corriger cette entrée
      </button>
      <ActionBar onClick={() => navigate("analysis")}>
        Voir mon analyse
      </ActionBar>
    </div>
  );
}
