import { useState, type FormEvent } from "react";
import { Target, Trash2 } from "lucide-react";
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
import {
  latest,
  localDate,
  number,
  parseDecimal,
} from "../../shared/calculations";
import type { Goal } from "../../shared/types";

export function GoalScreen() {
  const { data, setData, requireAccount, navigate, toast } = useApp();
  const initial = data.goal;
  const [measureId, setMeasureId] = useState(initial?.measureId ?? "weight");
  const [start, setStart] = useState(
    initial
      ? number(initial.start)
      : latest(data.entries, "weight")
        ? number(latest(data.entries, "weight")!.values.weight)
        : "",
  );
  const [target, setTarget] = useState(initial ? number(initial.target) : "");
  const [startDate, setStartDate] = useState(
    initial?.startDate ?? localDate(data.profile.timezone),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remove, setRemove] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!requireAccount() || busy) return;
    const a = parseDecimal(start),
      b = parseDecimal(target);
    if (
      a === null ||
      b === null ||
      !Number.isFinite(a) ||
      !Number.isFinite(b)
    ) {
      setError("Saisissez un départ et une cible strictement positifs.");
      return;
    }
    setBusy(true);
    try {
      const goal = await api<Goal>("/goal", {
        method: "PUT",
        body: JSON.stringify({ measureId, start: a, target: b, startDate }),
      });
      setData((d) => ({ ...d, goal }));
      toast("Votre objectif est enregistré.");
      navigate("analysis");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const unit = data.measures.find((m) => m.id === measureId)?.unit;
  return (
    <>
      <PageTitle title="Votre cap, à vous." eyebrow="Objectif personnel" />
      <section className="goal-intro">
        <Icon as={Target} size={40} />
        <p>
          Augmenter, diminuer ou maintenir.
          <br />
          Vous choisissez ce qui compte.
        </p>
      </section>
      <form id="goal-form" onSubmit={submit} className="stack">
        <label className="field-label">
          Mesure suivie
          <select
            value={measureId}
            onChange={(e) => {
              setMeasureId(e.target.value);
              const l = latest(data.entries, e.target.value);
              setStart(l ? number(l.values[e.target.value]) : "");
            }}
          >
            {data.measures
              .filter((m) => !m.archived)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
          </select>
        </label>
        <div className="two-fields">
          <label className="field-label">
            Valeur de départ ({unit})
            <input
              required
              inputMode="decimal"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="field-label">
            Votre cible ({unit})
            <input
              required
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
        </div>
        <label className="field-label">
          Date de départ
          <input
            type="date"
            required
            max={localDate(data.profile.timezone)}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <p className="small muted">
          Une cible égale au départ crée un objectif de maintien. Vous pouvez
          changer ou retirer votre objectif à tout moment.
        </p>
        <ErrorMessage>{error}</ErrorMessage>
        {initial && (
          <Button onClick={() => setRemove(true)}>
            Retirer mon objectif
            <Icon as={Trash2} />
          </Button>
        )}
        <ActionBar form="goal-form" busy={busy}>
          Enregistrer mon objectif
        </ActionBar>
      </form>
      {remove && (
        <Confirm
          title="Retirer votre objectif ?"
          text="Toutes vos mesures restent disponibles. Vous pourrez définir un nouveau cap quand vous le souhaitez."
          onClose={() => setRemove(false)}
          onConfirm={async () => {
            if (!requireAccount()) return;
            try {
              await api("/goal", { method: "DELETE" });
              setData((d) => ({ ...d, goal: null }));
              navigate("analysis");
            } catch (e: any) {
              setError(e.message);
            }
          }}
        />
      )}
    </>
  );
}
