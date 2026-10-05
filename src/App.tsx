import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Ruler,
  ChartNoAxesCombined,
  UserRound,
  WifiOff,
  X,
} from "lucide-react";
import type { AccountData, Capabilities, Entry } from "../shared/types";
import { APP_NAME } from "../shared/config";
import logo from "./assets/mesura-logo.png";
import { api, useSession } from "./api";
import { CLOUD } from "./deployment";
import { emptyAccountData } from "./account-data";
import { AppContext, type Screen, type MeasurementDraft } from "./context";
import { Icon } from "./components";
import { MeasureScreen, SuccessScreen } from "./screens/Measure";
import { AnalysisScreen } from "./screens/Analysis";
import {
  AccountScreen,
  PrivacyScreen,
  ProfileScreen,
  LegalScreen,
} from "./screens/Account";
import { ReminderScreen } from "./screens/Reminder";
import {
  HistoryScreen,
  PhotosScreen,
  CompareScreen,
  MonthlyScreen,
  GoalScreen,
  FavoritesScreen,
} from "./screens/Explore";
import { useModalFocus } from "./useModalFocus";
import { OnboardingScreen } from "./screens/OnboardingScreen";
const screens: Screen[] = [
  "measure",
  "analysis",
  "reminder",
  "success",
  "account",
  "privacy",
  "history",
  "photos",
  "compare",
  "monthly",
  "goal",
  "favorites",
  "legal",
];
export default function App() {
  useModalFocus();
  const [route, setRoute] = useState<Screen>(() =>
    screens.includes(location.hash.slice(1) as Screen)
      ? (location.hash.slice(1) as Screen)
      : "measure",
  );
  const [data, setData] = useState<AccountData>(emptyAccountData);
  const [capabilities, setCapabilities] = useState<Capabilities>({
    pushConfigured: false,
    emailConfigured: false,
    development: false,
    privacyContact: null,
  });
  const [accountOwner, setAccountOwner] = useState<string | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [success, setSuccess] = useState<{
    entry: Entry;
    previous: number | null;
  } | null>(null);
  const [draft, setDraft] = useState<MeasurementDraft | null>(null);
  const [historyMonth, setHistoryMonth] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: session, isPending } = useSession();
  const authenticated = Boolean(session?.user?.emailVerified);
  const search = new URLSearchParams(location.search);
  const recovering = Boolean(
    search.get("token") || (CLOUD && search.get("reset") === "1"),
  );
  const canAccess = authenticated && !recovering;
  const onboarding =
    canAccess &&
    accountOwner === session?.user.id &&
    !(
      data.profile.onboardingCompleted ??
      Boolean(data.profile.height || data.entries.length)
    );
  const screen =
    canAccess || route === "legal"
      ? onboarding && route !== "legal"
        ? "onboarding"
        : route
      : "account";
  const mainRef = useRef<HTMLElement>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  useEffect(() => {
    if (!isPending) setSessionResolved(true);
  }, [isPending]);
  useEffect(() => {
    setDraft(null);
    setHistoryMonth(null);
  }, [session?.user.id]);
  function navigate(next: Screen) {
    if (next === "measure") setEditing(null);
    if (next === "history") setHistoryMonth(null);
    location.hash = next;
    setRoute(next);
    window.scrollTo(0, 0);
  }
  async function reload() {
    if (session?.user.emailVerified) {
      setData(await api<AccountData>("/account"));
      setAccountOwner(session.user.id);
    } else setCapabilities(await api<Capabilities>("/config"));
  }
  useEffect(() => {
    api<Capabilities>("/config")
      .then(setCapabilities)
      .catch(() =>
        setLoadError(
          "Le serveur est indisponible. Réessayez dans quelques instants.",
        ),
      );
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (canAccess && session && !isPending) {
      setLoading(true);
      setLoadError("");
      api<AccountData>("/account", { signal: controller.signal })
        .then((next) => {
          if (!controller.signal.aborted) {
            setData(next);
            setAccountOwner(session.user.id);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setLoadError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    } else if (!isPending) {
      setData(emptyAccountData());
      setAccountOwner(null);
      setLoading(false);
      setEditing(null);
      setSuccess(null);
      setLoadError("");
      setMessage("");
    }
    return () => controller.abort();
  }, [session?.user.id, authenticated, isPending, recovering]);
  useEffect(() => {
    if (!data.consents.body) {
      setDraft(null);
      setSuccess(null);
      setEditing(null);
    } else if (!data.consents.photos)
      setDraft((d) => (d ? { ...d, photos: {} } : null));
  }, [data.consents.body, data.consents.photos]);
  useEffect(() => {
    const change = () => {
      const next = location.hash.slice(1) as Screen;
      if (screens.includes(next)) {
        setRoute(next);
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    document.title = `${APP_NAME} — ${screen === "analysis" ? "Analyse" : "Votre repère du jour"}`;
    mainRef.current
      ?.querySelector<HTMLElement>("h1")
      ?.focus({ preventScroll: true });
  }, [screen, isPending, loading, accountOwner]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
    };
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () =>
      document.documentElement.classList.toggle(
        "keyboard-open",
        window.innerHeight - viewport.height > 150,
      );
    viewport.addEventListener("resize", update);
    return () => viewport.removeEventListener("resize", update);
  }, []);
  function requireAccount() {
    if (!canAccess) {
      navigate("account");
      setMessage("Connectez-vous pour accéder à votre espace privé.");
      return false;
    }
    return true;
  }
  const context = {
    data:
      canAccess && accountOwner === session?.user.id
        ? data
        : emptyAccountData(),
    setData,
    screen,
    navigate,
    capabilities,
    reload,
    requireAccount,
    toast: setMessage,
    draft,
    setDraft,
    historyMonth,
    setHistoryMonth,
    editing,
    edit: (entry: Entry | null) => {
      setEditing(entry);
      setDraft(null);
      location.hash = "measure";
      setRoute("measure");
      window.scrollTo(0, 0);
    },
    success,
    saved: (entry: Entry, previous: number | null) => {
      setMessage("");
      setDraft(null);
      setData((d) => ({
        ...d,
        entries: [entry, ...d.entries.filter((e) => e.id !== entry.id)],
      }));
      setSuccess({ entry, previous });
      navigate("success");
    },
  };
  const analysisActive = [
    "analysis",
    "history",
    "photos",
    "compare",
    "monthly",
    "goal",
  ].includes(screen);
  const hasAction =
    ["measure", "reminder", "success", "goal", "favorites"].includes(screen) &&
    canAccess;
  return (
    <AppContext value={context}>
      <div
        className={`app-shell ${canAccess && !onboarding ? "" : "auth-shell"} ${screen === "success" ? "success-shell" : ""} ${hasAction ? "with-action" : ""}`}
      >
        <a className="skip-link" href="#main-content">
          Aller au contenu
        </a>
        <header className="app-header">
          <button
            className="brand"
            onClick={() => navigate(canAccess ? "measure" : "account")}
            aria-label={`${APP_NAME}, accueil`}
          >
            <img className="brand-logo" src={logo} alt="" />
          </button>
          {canAccess && !isPending && !onboarding && (
            <div className="header-actions">
              <button
                className="circle"
                aria-label="Régler mon rappel"
                onClick={() => navigate("reminder")}
              >
                <Icon as={Bell} />
                {accountOwner === session?.user.id &&
                  data.reminder?.enabled && (
                    <span className="notification-dot" />
                  )}
              </button>
              <button
                className="circle account-circle"
                aria-label="Mon compte et mes réglages"
                onClick={() => navigate("account")}
              >
                <Icon as={UserRound} />
              </button>
            </div>
          )}
        </header>
        {offline && (
          <div className="connection-banner" role="status">
            <Icon as={WifiOff} />
            Vous êtes hors connexion. L’enregistrement nécessite internet.
          </div>
        )}
        {loadError && (
          <div className="connection-banner" role="alert">
            {loadError}
            <button
              onClick={() =>
                void reload()
                  .then(() => setLoadError(""))
                  .catch((e) => setLoadError(e.message))
              }
            >
              Réessayer
            </button>
          </div>
        )}
        <main ref={mainRef} id="main-content" className="main-content">
          {isPending && (!sessionResolved || canAccess) ? (
            <div className="loading" role="status">
              Vérification de votre connexion…
            </div>
          ) : !canAccess ? (
            screen === "legal" ? (
              <LegalScreen />
            ) : (
              <AccountScreen />
            )
          ) : loading || (accountOwner !== session?.user.id && !loadError) ? (
            <div className="loading" role="status">
              Votre espace se prépare…
            </div>
          ) : loadError ? (
            <div className="empty">
              <h1>Connexion interrompue</h1>
              <p>Réessayez pour retrouver vos mesures.</p>
            </div>
          ) : screen === "onboarding" ? (
            <OnboardingScreen key={session?.user.id} />
          ) : (
            <>
              {screen === "measure" && (
                <MeasureScreen
                  key={`${session?.user.id}-${editing?.id ?? "new"}`}
                />
              )}
              {screen === "analysis" && <AnalysisScreen />}
              {screen === "success" && <SuccessScreen />}
              {screen === "reminder" && <ReminderScreen />}
              {screen === "account" && <ProfileScreen />}
              {screen === "privacy" && <PrivacyScreen />}
              {screen === "history" && <HistoryScreen />}
              {screen === "photos" && <PhotosScreen />}
              {screen === "compare" && <CompareScreen />}
              {screen === "monthly" && <MonthlyScreen />}
              {screen === "goal" && <GoalScreen />}
              {screen === "favorites" && <FavoritesScreen />}
              {screen === "legal" && <LegalScreen />}
            </>
          )}
        </main>
        {message && (
          <div className="toast" role="status">
            <span>{message}</span>
            <button
              aria-label="Fermer le message"
              onClick={() => setMessage("")}
            >
              <Icon as={X} size={16} />
            </button>
          </div>
        )}
        {canAccess && !isPending && !onboarding && (
          <nav className="bottom-nav" aria-label="Navigation principale">
            <button
              aria-current={!analysisActive ? "page" : undefined}
              className={!analysisActive ? "active" : ""}
              onClick={() => navigate("measure")}
            >
              <Icon as={Ruler} />
              <span>Mesures</span>
            </button>
            <button
              aria-current={analysisActive ? "page" : undefined}
              className={analysisActive ? "active" : ""}
              onClick={() => navigate("analysis")}
            >
              <Icon as={ChartNoAxesCombined} />
              <span>Analyse</span>
            </button>
          </nav>
        )}
      </div>
    </AppContext>
  );
}
