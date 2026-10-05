import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import {
  AppContext,
  type Screen,
  type MeasurementDraft,
  type EditingDraft,
} from "./context";
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
  "entry",
  "edit",
  "profile",
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
  const [entryId, setEntryId] = useState<string | null>(
    history.state?.entryId ?? null,
  );
  const editing =
    route === "edit"
      ? (data.entries.find((e) => e.id === entryId) ?? null)
      : null;
  const [viewState, setViewState] = useState<Record<string, unknown>>({});
  const routeRef = useRef(route);
  const navigationKey = useRef(history.state?.mesuraKey ?? crypto.randomUUID());
  const scrollPositions = useRef(new Map<string, number>());
  const screenPositions = useRef(new Map<Screen, number>());
  const pendingScroll = useRef<number | null>(null);
  const [navigationVersion, setNavigationVersion] = useState(0);
  const [success, setSuccess] = useState<{
    entry: Entry;
    previous: number | null;
  } | null>(null);
  const [draft, setDraft] = useState<MeasurementDraft | null>(null);
  const [editingDrafts, setEditingDrafts] = useState<
    Record<string, EditingDraft>
  >({});
  const [historyMonth, setHistoryMonth] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: session, isPending } = useSession();
  const authenticated = Boolean(session?.user);
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
    setEditingDrafts({});
    setHistoryMonth(null);
    setViewState({});
    scrollPositions.current.clear();
    screenPositions.current.clear();
  }, [session?.user.id]);
  function rememberPosition() {
    scrollPositions.current.set(navigationKey.current, window.scrollY);
    screenPositions.current.set(routeRef.current, window.scrollY);
  }
  function openScreen(next: Screen, id: string | null = null) {
    if (next === routeRef.current && id === entryId) return;
    rememberPosition();
    const key = crypto.randomUUID();
    history.pushState(
      { mesuraKey: key, mesuraParent: true, screen: next, entryId: id },
      "",
      `#${next}`,
    );
    navigationKey.current = key;
    routeRef.current = next;
    pendingScroll.current = ["entry", "edit", "success"].includes(next)
      ? 0
      : (screenPositions.current.get(next) ?? 0);
    setEntryId(id);
    setRoute(next);
    setNavigationVersion((v) => v + 1);
  }
  function navigate(next: Screen) {
    openScreen(next);
  }
  function back() {
    if (history.state?.mesuraParent) history.back();
    else
      navigate(
        ["photos", "compare", "monthly"].includes(routeRef.current)
          ? "analysis"
          : "measure",
      );
  }
  useLayoutEffect(() => {
    if (pendingScroll.current === null || loading) return;
    window.scrollTo(0, pendingScroll.current);
    pendingScroll.current = null;
  }, [route, navigationVersion, loading]);
  async function reload() {
    if (session?.user) {
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
      setEntryId(null);
      setSuccess(null);
      setLoadError("");
      setMessage("");
    }
    return () => controller.abort();
  }, [session?.user.id, authenticated, isPending, recovering]);
  useEffect(() => {
    if (!canAccess || accountOwner !== session?.user.id) return;
    if (!data.consents.body) {
      setDraft(null);
      setEditingDrafts({});
      setSuccess(null);
      setEntryId(null);
    } else if (!data.consents.photos) {
      setDraft((d) => (d ? { ...d, photos: {} } : null));
      setEditingDrafts((drafts) =>
        Object.fromEntries(
          Object.entries(drafts).map(([id, d]) => [id, { ...d, photos: {} }]),
        ),
      );
    }
  }, [
    data.consents.body,
    data.consents.photos,
    canAccess,
    accountOwner,
    session?.user.id,
  ]);
  useEffect(() => {
    setEditingDrafts((drafts) =>
      Object.fromEntries(
        Object.entries(drafts).filter(([id]) =>
          data.entries.some((entry) => entry.id === id),
        ),
      ),
    );
  }, [data.entries]);
  useEffect(() => {
    history.scrollRestoration = "manual";
    history.replaceState(
      {
        ...history.state,
        mesuraKey: navigationKey.current,
        screen: routeRef.current,
      },
      "",
    );
    const trackScroll = () => {
      scrollPositions.current.set(navigationKey.current, window.scrollY);
      screenPositions.current.set(routeRef.current, window.scrollY);
    };
    const change = () => {
      const next = location.hash.slice(1) as Screen;
      if (!screens.includes(next)) return;
      const state = history.state;
      const key =
        state?.screen === next && state?.mesuraKey
          ? state.mesuraKey
          : crypto.randomUUID();
      if (key === navigationKey.current && next === routeRef.current) return;
      navigationKey.current = key;
      routeRef.current = next;
      pendingScroll.current =
        scrollPositions.current.get(key) ??
        screenPositions.current.get(next) ??
        0;
      setEntryId(state?.screen === next ? (state.entryId ?? null) : null);
      setRoute(next);
      setNavigationVersion((v) => v + 1);
      if (state?.screen !== next)
        history.replaceState({ mesuraKey: key, screen: next }, "");
    };
    window.addEventListener("scroll", trackScroll, { passive: true });
    window.addEventListener("popstate", change);
    window.addEventListener("hashchange", change);
    return () => {
      window.removeEventListener("scroll", trackScroll);
      window.removeEventListener("popstate", change);
      window.removeEventListener("hashchange", change);
      history.scrollRestoration = "auto";
    };
  }, []);
  useEffect(() => {
    const titles: Record<Screen, string> = {
      measure: "Nouvelle mesure",
      edit: "Modifier la mesure",
      entry: "Détail de la mesure",
      history: "Historique des mesures",
      analysis: "Analyse",
      photos: "Photos de comparaison",
      compare: "Comparer deux périodes",
      monthly: "Bilan mensuel",
      success: success ? "Mesure enregistrée" : "Nouvelle mesure",
      reminder: "Rappels",
      account: "Mon espace",
      profile: "Profil",
      privacy: "Données et confidentialité",
      goal: "Objectifs",
      favorites: "Mesures favorites",
      legal: "Informations du service",
      onboarding: "Votre point de départ",
    };
    document.title = `${APP_NAME} — ${canAccess ? titles[screen] : screen === "legal" ? titles.legal : "Connexion"}`;
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
    update();
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
    back,
    entryId,
    viewEntry: (id: string) => openScreen("entry", id),
    viewState,
    setViewState,
    capabilities,
    reload,
    requireAccount,
    toast: setMessage,
    draft,
    setDraft,
    editingDrafts,
    setEditingDrafts,
    historyMonth,
    setHistoryMonth,
    editing,
    edit: (entry: Entry | null) => {
      if (entry) openScreen("edit", entry.id);
      else navigate("measure");
    },
    success,
    saved: (entry: Entry, previous: number | null) => {
      setMessage("");
      if (!editing) {
        setDraft(null);
        setViewState((state) => ({ ...state, "measure.photos": false }));
      }
      setData((d) => ({
        ...d,
        entries: [entry, ...d.entries.filter((e) => e.id !== entry.id)],
      }));
      if (editing) {
        setEditingDrafts((drafts) =>
          Object.fromEntries(
            Object.entries(drafts).filter(([id]) => id !== entry.id),
          ),
        );
        setMessage("Modifications enregistrées.");
        back();
      } else {
        setSuccess({ entry, previous });
        navigate("success");
      }
    },
  };
  const analysisActive = [
    "analysis",
    "photos",
    "compare",
    "monthly",
    "goal",
  ].includes(screen);
  const hasAction =
    ["measure", "edit", "reminder", "success", "goal", "favorites"].includes(
      screen,
    ) && canAccess;
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
            aria-label={`${APP_NAME}, Mesures`}
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
                className={`circle account-circle ${accountOwner === session?.user.id && data.profile.avatar ? "has-avatar" : ""}`}
                aria-label="Mon compte et mes réglages"
                onClick={() => navigate("account")}
              >
                {accountOwner === session?.user.id && data.profile.avatar ? (
                  <img
                    className="header-avatar"
                    src={data.profile.avatar}
                    alt=""
                  />
                ) : (
                  <Icon as={UserRound} />
                )}
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
              {(screen === "measure" || (screen === "edit" && editing)) && (
                <MeasureScreen
                  key={`${session?.user.id}-${editing?.id ?? "new"}`}
                />
              )}
              {screen === "edit" && !editing && (
                <>
                  <h1>Mesure indisponible</h1>
                  <button className="secondary" onClick={back}>
                    Revenir
                  </button>
                </>
              )}
              {screen === "analysis" && <AnalysisScreen />}
              {screen === "success" && <SuccessScreen />}
              {screen === "reminder" && <ReminderScreen />}
              {screen === "account" && <ProfileScreen />}
              {screen === "profile" && <ProfileScreen editingProfile />}
              {screen === "privacy" && <PrivacyScreen />}
              {(screen === "history" || screen === "entry") && (
                <HistoryScreen />
              )}
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
