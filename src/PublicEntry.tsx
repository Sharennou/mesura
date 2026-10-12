import { Suspense } from "react";
import { renderToString } from "react-dom/server";
import { APP_NAME } from "../shared/config";
import { AppContext, type AppContextValue } from "./context";
import { AccountScreen } from "./screens/Account";
import { emptyAccountData } from "./account-data";

// Reuse the actual form and its React markup. No separate landing page,
// personalized data, bot detection or deferred substitute for the audited UI.
export function renderPublicEntry(logo: string, logoRetina: string) {
  const noop = () => {};
  const context: AppContextValue = {
    data: emptyAccountData(),
    setData: noop,
    screen: "account",
    capabilities: {
      pushConfigured: false,
      emailConfigured: false,
      development: false,
      privacyContact: null,
    },
    navigate: noop,
    back: noop,
    viewEntry: noop,
    entryId: null,
    viewState: {},
    setViewState: noop,
    reload: async () => {},
    requireAccount: () => false,
    toast: noop,
    editing: null,
    edit: noop,
    success: null,
    saved: noop,
    draft: null,
    setDraft: noop,
    editingDrafts: {},
    setEditingDrafts: noop,
    historyMonth: null,
    setHistoryMonth: noop,
  };
  return renderToString(
    <AppContext value={context}>
      <div className="app-shell auth-shell  ">
        <a className="skip-link" href="#main-content">
          Aller au contenu
        </a>
        <header className="app-header">
          <button className="brand" aria-label={`${APP_NAME}, Mesures`}>
            <img
              className="brand-logo"
              src={logo}
              srcSet={`${logo} 2x, ${logoRetina} 3x`}
              width={100}
              height={58}
              fetchPriority="high"
              alt=""
            />
          </button>
        </header>
        <main id="main-content" className="main-content">
          <Suspense fallback={null}>
            <AccountScreen />
          </Suspense>
        </main>
      </div>
    </AppContext>,
  );
}
