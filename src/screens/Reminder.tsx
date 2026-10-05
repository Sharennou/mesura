import { useEffect, useState } from "react";
import { Bell, BellOff, Check, Smartphone, Mail } from "lucide-react";
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
  const { data, setData, requireAccount, capabilities, toast } = useApp();
  const initial = data.reminder;
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const weekday = initial?.weekday ?? 1;
  const [weekdays, setWeekdays] = useState(
    initial ? reminderDays(initial) : [1],
  );
  const frequency = "week" as const;
  const [time, setTime] = useState(initial?.time ?? "08:00");
  const [timezone, setTimezone] = useState(
    initial?.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone ??
      data.profile.timezone,
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
  const pushAvailable =
    supportsPush && !(ios && !installed) && capabilities.pushConfigured;
  useEffect(() => {
    const refreshPermission = () => {
      if ("Notification" in window) {
        const next = Notification.permission;
        if (next !== permission) {
          setPermission(next);
          setError("");
        }
      }
    };
    window.addEventListener("focus", refreshPermission);
    document.addEventListener("visibilitychange", refreshPermission);
    return () => {
      window.removeEventListener("focus", refreshPermission);
      document.removeEventListener("visibilitychange", refreshPermission);
    };
  }, [permission]);
  const operational =
    channel === "email"
      ? capabilities.emailConfigured && data.consents.email
      : pushAvailable &&
        deviceReady &&
        permission === "granted" &&
        data.consents.push;
  const notificationStatus =
    channel === "email"
      ? !capabilities.emailConfigured
        ? "Email indisponible"
        : operational
          ? "Rappels par email disponibles"
          : "Consentement email nécessaire"
      : !supportsPush || (ios && !installed)
        ? "Indisponibles sur cet appareil"
        : !capabilities.pushConfigured
          ? "Indisponibles sur ce service"
          : permission === "denied"
            ? "Notifications bloquées"
            : operational
              ? "Notifications disponibles sur cet appareil"
              : "Notifications à activer sur cet appareil";
  const availableElsewhere =
    channel === "push" &&
    capabilities.pushConfigured &&
    data.consents.push &&
    data.devices > 0;
  const canConfirm =
    operational ||
    Boolean(
      initial?.enabled && initial.channel === channel && availableElsewhere,
    );
  const scheduleSaved = Boolean(initial);
  const active = Boolean(
    initial?.enabled && operational && initial.channel === channel,
  );
  const dirty =
    !initial ||
    initial.enabled !== enabled ||
    initial.time !== time ||
    initial.timezone !== timezone ||
    initial.channel !== channel ||
    JSON.stringify(reminderDays(initial)) !== JSON.stringify(weekdays);
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
  const dates =
    active && !dirty && DateTime.local().setZone(timezone).isValid
      ? nextOccurrences(current, DateTime.now())
      : [];
  async function activate() {
    if (!requireAccount() || busy) return;
    setError("");
    setBusy(true);
    try {
      if (!agreed && !data.consents[channel])
        throw new Error(
          "Votre consentement est nécessaire pour recevoir ce rappel.",
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
      toast("Autorisation enregistrée. Confirmez maintenant votre rappel.");
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
          enabled: enabled && canConfirm,
          weekday,
          weekdays,
          frequency,
          time,
          timezone,
          channel,
        }),
      });
      setData((d) => ({ ...d, reminder: r }));
      setEnabled(r.enabled);
      toast(
        r.enabled
          ? "Horaires enregistrés. Rappel actif."
          : "Horaires enregistrés. Aucun envoi actif.",
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="Rappel" />
      <p className="lead">
        Choisissez vos horaires, autorisez les notifications si vous le
        souhaitez, puis confirmez votre rappel.
      </p>
      <div className="section-heading">
        <h2>1. Jours et heure</h2>
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
          Heure du rappel
        </label>
        <input
          id="reminder-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
        <details className="timezone-details">
          <summary>Fuseau : {timezone} · modifier</summary>
          <label className="field-label">
            Fuseau horaire
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
            <small>
              Détecté sur cet appareil pour un nouveau rappel. Exemple :
              Europe/Paris.
            </small>
          </label>
        </details>
      </section>
      <div className="section-heading">
        <h2>2. Notifications</h2>
      </div>
      <div className="channel-options">
        <button
          aria-pressed={channel === "push" && pushAvailable}
          disabled={!pushAvailable}
          onClick={() => {
            setChannel("push");
            setAgreed(false);
          }}
        >
          <Icon as={Smartphone} />
          Sur cet appareil
          {!pushAvailable && <small>Indisponible</small>}
        </button>
        <button
          aria-pressed={channel === "email" && capabilities.emailConfigured}
          disabled={!capabilities.emailConfigured}
          onClick={() => {
            setChannel("email");
            setAgreed(false);
          }}
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
        <h2>{notificationStatus}</h2>
        <p>
          {channel === "push"
            ? "Votre consentement autorise Mesura à envoyer un rappel. L’autorisation du navigateur permet de l’afficher sur cet appareil. Ces deux choix sont distincts et volontaires."
            : "Votre consentement autorise l’envoi d’un rappel à l’adresse email de votre compte."}
        </p>
        {(channel === "push" ? pushAvailable : capabilities.emailConfigured) &&
          !operational && (
            <>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={agreed || data.consents[channel]}
                  disabled={data.consents[channel]}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>{CONSENT_TEXTS[channel]}</span>
              </label>
              {channel === "push" && permission === "denied" ? (
                <p>
                  Autorisez les notifications pour Mesura dans les réglages de
                  votre navigateur, puis revenez ici.
                </p>
              ) : (
                <Button
                  disabled={busy || (!agreed && !data.consents[channel])}
                  onClick={() => void activate()}
                >
                  {channel === "push"
                    ? permission === "granted"
                      ? "Activer les notifications sur cet appareil"
                      : "Autoriser les notifications"
                    : "Autoriser les rappels par email"}
                  <Icon as={Bell} />
                </Button>
              )}
            </>
          )}
      </section>
      <div className="section-heading">
        <h2>3. Confirmer le rappel</h2>
      </div>
      <section className="reminder-main">
        <div>
          <h2>Activer mon rappel</h2>
          <p>
            {operational
              ? "Votre canal est disponible. Confirmez pour enregistrer."
              : "Vous pouvez enregistrer les horaires. L’envoi attend l’activation d’un canal disponible."}
          </p>
        </div>
        <Switch
          checked={enabled}
          onChange={() => setEnabled(!enabled)}
          label="Activer mon rappel"
        />
      </section>
      <section
        className={`reminder-status ${active && !dirty ? "cobalt" : ""}`}
        role="status"
      >
        <Icon as={active && !dirty ? Check : BellOff} size={24} />
        <div>
          <span className="eyebrow">État enregistré</span>
          <h2>
            {active
              ? "Rappel actif"
              : initial?.enabled
                ? "Horaires enregistrés"
                : "Aucun envoi actif"}
          </h2>
          <p>
            {scheduleSaved
              ? "Horaires enregistrés."
              : "Horaires non enregistrés."}
            {dirty && " Modifications à confirmer."}
          </p>
          <p>
            {channel === "push"
              ? operational
                ? "Notifications actives sur cet appareil."
                : "Notifications inactives sur cet appareil."
              : operational
                ? "Canal email autorisé."
                : "Canal email inactif."}
          </p>
          {initial?.enabled && !active && (
            <p>
              Le rappel est activé pour le canal enregistré. Cet appareil reste
              à configurer pour recevoir des notifications ici.
            </p>
          )}
          {!initial?.enabled && (
            <p>Vos horaires seuls ne déclenchent pas de notification.</p>
          )}
        </div>
      </section>
      {dates.length > 0 && (
        <section className="plain-card">
          <span className="eyebrow">
            Prochains rappels · horaires enregistrés
          </span>
          {dates.map((d) => (
            <p className="occurrence" key={d}>
              {DateTime.fromISO(d)
                .setZone(timezone)
                .setLocale("fr")
                .toFormat("cccc d LLLL · HH:mm")}
            </p>
          ))}
          <p className="small muted">
            La réception dépend du téléphone, du réseau et du système.
          </p>
        </section>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      <ActionBar onClick={() => void save()} busy={busy}>
        {enabled && canConfirm
          ? "Confirmer le rappel"
          : enabled
            ? "Enregistrer les horaires"
            : "Enregistrer le rappel"}
      </ActionBar>
    </>
  );
}
