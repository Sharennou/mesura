import { lazy, Suspense } from "react";
import { useApp } from "./context";
import "./styles.css";

const MeasureScreen = lazy(() =>
  import("./screens/Measure").then((m) => ({ default: m.MeasureScreen })),
);
const SuccessScreen = lazy(() =>
  import("./screens/Measure").then((m) => ({ default: m.SuccessScreen })),
);
const AnalysisScreen = lazy(() =>
  import("./screens/Analysis").then((m) => ({ default: m.AnalysisScreen })),
);
const ProfileScreen = lazy(() =>
  import("./screens/ProfileScreen").then((m) => ({ default: m.ProfileScreen })),
);
const PrivacyScreen = lazy(() =>
  import("./screens/PrivacyScreen").then((m) => ({ default: m.PrivacyScreen })),
);
const ReminderScreen = lazy(() =>
  import("./screens/Reminder").then((m) => ({ default: m.ReminderScreen })),
);
const HistoryScreen = lazy(() =>
  import("./screens/HistoryScreen").then((m) => ({ default: m.HistoryScreen })),
);
const CompareScreen = lazy(() =>
  import("./screens/CompareScreen").then((m) => ({ default: m.CompareScreen })),
);
const MonthlyScreen = lazy(() =>
  import("./screens/MonthlyScreen").then((m) => ({ default: m.MonthlyScreen })),
);
const GoalScreen = lazy(() =>
  import("./screens/GoalScreen").then((m) => ({ default: m.GoalScreen })),
);
const FavoritesScreen = lazy(() =>
  import("./screens/FavoritesScreen").then((m) => ({
    default: m.FavoritesScreen,
  })),
);
const OnboardingScreen = lazy(() =>
  import("./screens/OnboardingScreen").then((m) => ({
    default: m.OnboardingScreen,
  })),
);
const LegalScreen = lazy(() =>
  import("./screens/LegalScreen").then((m) => ({ default: m.LegalScreen })),
);

export default function PrivateScreens() {
  const { screen, editing, success, back } = useApp();
  return (
    <Suspense
      key={screen}
      fallback={
        <div className="loading" role="status">
          Votre écran se prépare…
        </div>
      }
    >
      {screen === "onboarding" && <OnboardingScreen />}
      {screen === "legal" && <LegalScreen />}
      {(screen === "measure" ||
        (screen === "edit" && editing) ||
        (screen === "success" && !success)) && (
        <MeasureScreen key={editing?.id ?? "new"} />
      )}
      {screen === "success" && success && <SuccessScreen />}
      {screen === "edit" && !editing && (
        <>
          <h1>Mesure indisponible</h1>
          <button className="secondary" onClick={back}>
            Revenir
          </button>
        </>
      )}
      {screen === "analysis" && <AnalysisScreen />}
      {screen === "reminder" && <ReminderScreen />}
      {screen === "account" && <ProfileScreen />}
      {screen === "profile" && <ProfileScreen editingProfile />}
      {screen === "privacy" && <PrivacyScreen />}
      {(screen === "history" || screen === "entry") && <HistoryScreen />}
      {screen === "compare" && <CompareScreen />}
      {screen === "monthly" && <MonthlyScreen />}
      {screen === "goal" && <GoalScreen />}
      {screen === "favorites" && <FavoritesScreen />}
    </Suspense>
  );
}
