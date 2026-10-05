import { useEffect, useState } from "react";
import { Bell, BellOff, Check, Smartphone, Info, Mail } from "lucide-react";
import { DateTime } from "luxon";
import { useApp } from "../context";
import {
  ActionBar,
  Button,
  ErrorMessage,
  Icon,
  PageTitle,
  Switch,
} from "../components";
import { api } from "../api";
import {
  nextOccurrences,
  reminderDays,
  reminderAnchor,
} from "../../shared/recurrence";
import type { Reminder, AccountData } from "../../shared/types";
import { APP_NAME, CONSENT_TEXTS, CONSENT_VERSION } from "../../shared/config";
export function ReminderScreen() {
  const { data, setData, requireAccount, capabilities, navigate, toast } =
    useApp();
  const initial = data.reminder;
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const weekday = initial?.weekday ?? 1;
  const [weekdays, setWeekdays] = useState(
    initial ? reminderDays(initial) : [1],
  );
  const frequency = "week" as const;
  const [time, setTime] = useState(initial?.time ?? "08:00");
  const [timezone, setTimezone] = useState(
    initial?.timezone ?? data.profile.timezone,
  );
  const [channel, setChannel] = useState<"push" | "email">(
    initial?.channel ?? "push",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [permission, setPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported",
  );
  const [deviceReady, setDeviceReady] = useState(false);
  const supportsPush =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const installed =
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone;
  useEffect(() => {
    if (supportsPush)
      void navigator.serviceWorker.ready
        .then((r) => r.pushManager.getSubscription())
        .then(async (s) => {
          if (s)
            setDeviceReady(
              (
                await api<{ active: boolean }>("/device-status", {
                  method: "POST",
                  body: JSON.stringify({ endpoint: s.endpoint }),
                })
              ).active,
            );
        })
        .catch(() => {});
  }, [supportsPush]);
  const operational =
    channel === "email"
      ? capabilities.emailConfigured && data.consents.email
      : deviceReady && permission === "granted" && data.consents.push;
  const status = !enabled
    ? "Désactivé"
    : channel === "email" && !capabilities.emailConfigured
      ? "À configurer"
      : channel === "push" && (!supportsPush || (ios && !installed))
        ? "Indisponible sur cet appareil"
        : channel === "push" && !capabilities.pushConfigured
          ? "À configurer"
          : permission === "denied" && channel === "push"
            ? "Bloqué dans les réglages du téléphone"
            : operational
              ? "Activé"
              : "Autorisation nécessaire";
  const current: Reminder = {
    enabled,
    weekday,
    weekdays,
    frequency,
    time,
    timezone,
    channel,
    anchor:
      initial &&
      initial.weekday === weekday &&
      initial.frequency === frequency &&
      initial.time === time &&
      initial.timezone === timezone &&
      (frequency !== "week" ||
        JSON.stringify(reminderDays(initial)) === JSON.stringify(weekdays))
        ? initial.anchor
        : reminderAnchor({ weekday, weekdays, frequency, time, timezone }),
  };
  const dates = nextOccurrences(current, DateTime.now());
  async function activate() {
    if (!requireAccount()) return;
    setError("");
    setBusy(true);
    try {
      if (!agreed && !data.consents[channel])
        throw new Error(
          "Choisissez explicitement le canal de rappel ci-dessous.",
        );
      if (channel === "push" && (!supportsPush || (ios && !installed)))
        throw new Error(
          "Ajoutez l’application à votre écran d’accueil sur un téléphone compatible.",
        );
      if (channel === "push" && !capabilities.pushConfigured)
        throw new Error(
          "Les notifications ne sont pas encore disponibles sur ce service.",
        );
      const requestedPermission =
        channel === "push" ? await Notification.requestPermission() : null;
      if (requestedPermission) {
        setPermission(requestedPermission);
        if (requestedPermission !== "granted")
          throw new Error(
            "Les notifications n’ont pas été autorisées. Vous pouvez continuer votre suivi.",
          );
      }
      const next = await api<AccountData>("/consents", {
        method: "POST",
        body: JSON.stringify({
          purpose: channel,
          granted: true,
          version: CONSENT_VERSION,
        }),
      });
      setData(next);
      if (channel === "push") {
        if (!supportsPush || (ios && !installed))
          throw new Error(
            "Ajoutez l’application à votre écran d’accueil sur un téléphone compatible.",
          );
        if (!capabilities.pushConfigured)
          throw new Error(
            "Les notifications ne sont pas encore disponibles sur ce service.",
          );
        const registration = await navigator.serviceWorker.ready;
        const config = await api<{ key: string }>("/push-key");
        const bytes = Uint8Array.from(
          atob(config.key.replaceAll("-", "+").replaceAll("_", "/")),
          (c) => c.charCodeAt(0),
        );
        const subscription =
          (await registration.pushManager.getSubscription()) ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: bytes,
          }));
        await api("/subscriptions", {
          method: "POST",
          body: JSON.stringify(subscription.toJSON()),
        });
        setDeviceReady(true);
      } else if (!capabilities.emailConfigured)
        throw new Error(
          "Le canal email n’est pas encore disponible sur ce service.",
        );
      toast("Le canal de rappel est prêt. Enregistrez votre horaire.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!requireAccount() || busy) return;
    setError("");
    setBusy(true);
    try {
      const r = await api<Reminder>("/reminder", {
        method: "PUT",
        body: JSON.stringify({
          enabled,
          weekday,
          weekdays,
          frequency,
          time,
          timezone,
          channel,
        }),
      });
      setData((d) => ({ ...d, reminder: r }));
      toast(
        enabled
          ? "Votre rappel est enregistré."
          : "Votre rappel est désactivé.",
      );
      navigate("measure");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="Rappel" />
      <section className="reminder-main">
        <div>
          <h2>Mon rappel</h2>
          <p>La régularité commence par un petit rendez-vous.</p>
        </div>
        <Switch
          checked={enabled}
          onChange={() => setEnabled(!enabled)}
          label="Activer mon rappel"
        />
      </section>
      <div className="section-heading">
        <h2>Quels jours ?</h2>
      </div>
      <div className="day-selector">
        {[
          "Lundi",
          "Mardi",
          "Mercredi",
          "Jeudi",
          "Vendredi",
          "Samedi",
          "Dimanche",
        ].map((d, i) => (
          <button
            key={d}
            aria-label={d}
            aria-pressed={weekdays.includes(i + 1)}
            onClick={() => {
              const day = i + 1;
              setWeekdays((days) =>
                days.includes(day)
                  ? days.length > 1
                    ? days.filter((d) => d !== day)
                    : days
                  : [...days, day].sort((a, b) => a - b),
              );
            }}
          >
            {d[0]}
          </button>
        ))}
      </div>
      <p className="small muted">Chaque semaine, les jours choisis.</p>
      <section className="time-card">
        <label className="eyebrow" htmlFor="reminder-time">
          Le bon moment
        </label>
        <input
          id="reminder-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
        <label className="field-label">
          Fuseau horaire
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </label>
      </section>
      <div className="section-heading">
        <h2>Comment vous rappeler ?</h2>
      </div>
      <div className="channel-options">
        <button
          aria-pressed={channel === "push"}
          onClick={() => setChannel("push")}
        >
          <Icon as={Smartphone} />
          Sur mon téléphone
        </button>
        <button
          aria-pressed={channel === "email"}
          disabled={!capabilities.emailConfigured}
          onClick={() => setChannel("email")}
        >
          <Icon as={Mail} />
          Par email
          {!capabilities.emailConfigured && <small>Non disponible</small>}
        </button>
      </div>
      {ios && !installed && (
        <section className="plain-card">
          <h2>Ajoutez votre rendez-vous à l’accueil</h2>
          <p>
            Sur iPhone, ouvrez le menu Partager de Safari puis « Sur l’écran
            d’accueil ». Ouvrez ensuite {APP_NAME} depuis cette icône pour
            activer les notifications.
          </p>
        </section>
      )}
      <section className="plain-card">
        <label className="check-label">
          <input
            type="checkbox"
            checked={agreed || data.consents[channel]}
            disabled={data.consents[channel]}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>{CONSENT_TEXTS[channel]}</span>
        </label>
        <Button
          disabled={
            busy ||
            (!agreed && !data.consents[channel]) ||
            (channel === "push" && !capabilities.pushConfigured)
          }
          onClick={() => void activate()}
        >
          Autoriser ce canal <Icon as={Bell} />
        </Button>
      </section>
      <section
        className={`reminder-status ${status === "Activé" ? "cobalt" : ""}`}
      >
        <Icon
          as={status === "Activé" ? Check : enabled ? Info : BellOff}
          size={24}
        />
        <div>
          <span className="eyebrow">État du canal</span>
          <h2>{status}</h2>
          <p>
            {status === "À configurer"
              ? "Ce canal n’est pas encore disponible sur le service."
              : status === "Activé"
                ? "Un rappel discret, sans mesure ni information personnelle."
                : "Le suivi reste disponible, avec ou sans rappel."}
          </p>
        </div>
      </section>
      <section className="plain-card">
        <span className="eyebrow">
          Prochains rendez-vous {enabled ? "" : "· aperçu"}
        </span>
        {dates.map((d, i) => (
          <p className="occurrence" key={d}>
            <span>{i + 1 < 10 ? `0${i + 1}` : i + 1}</span>
            {DateTime.fromISO(d)
              .setZone(timezone)
              .setLocale("fr")
              .toFormat("cccc d LLLL · HH:mm")}
          </p>
        ))}
        <p className="small muted">
          L’heure est locale. La réception dépend du téléphone, du réseau et du
          système.
        </p>
      </section>
      <ErrorMessage>{error}</ErrorMessage>
      <ActionBar onClick={() => void save()} busy={busy}>
        Enregistrer le rappel
      </ActionBar>
    </>
  );
}
