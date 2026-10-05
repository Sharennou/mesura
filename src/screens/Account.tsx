import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { useApp } from "../context";
import { Button, ErrorMessage, Icon, PageTitle } from "../components";
import { api, authClient } from "../api";
const authErrors: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "L’adresse ou le mot de passe ne correspond pas.",
  EMAIL_NOT_VERIFIED: "Vérifiez votre adresse email avant de vous connecter.",
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cette adresse.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Un compte existe déjà avec cette adresse.",
  PASSWORD_TOO_SHORT: "Choisissez un mot de passe d’au moins 12 caractères.",
  INVALID_TOKEN: "Ce lien est expiré ou invalide. Demandez un nouveau lien.",
};
export function AccountScreen() {
  const { capabilities, navigate } = useApp();
  const search = new URLSearchParams(location.search);
  const [mode, setMode] = useState<"signup" | "signin" | "reset" | "newpass">(
    search.get("token") ? "newpass" : "signup",
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [localMail, setLocalMail] = useState<{
    url: string;
    purpose: string;
  } | null>(null);
  async function getLocalMail() {
    if (capabilities.development)
      setLocalMail(
        (await api(`/dev/mail?email=${encodeURIComponent(email)}`).catch(
          () => null,
        )) as any,
      );
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      let response: any;
      if (mode === "signup") {
        if (!terms)
          throw new Error(
            "Acceptez les conditions d’utilisation pour créer votre compte.",
          );
        response = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || "Mon espace",
          callbackURL: `${location.origin}/#account`,
        });
      } else if (mode === "signin")
        response = await authClient.signIn.email({ email, password });
      else if (mode === "reset")
        response = await authClient.requestPasswordReset({
          email,
          redirectTo: `${location.origin}/?reset=1#account`,
        });
      else
        response = await authClient.resetPassword({
          newPassword: password,
          token: search.get("token") ?? "",
        });
      if (response.error)
        throw new Error(
          authErrors[response.error.code] ||
            "La demande n’a pas abouti. Vérifiez vos informations puis réessayez.",
        );
      if (mode === "signup" || mode === "reset") {
        setSent(true);
        await getLocalMail();
      } else if (mode === "newpass") {
        history.replaceState(null, "", "/#account");
        setMode("signin");
        setSent(false);
        setPassword("");
        setError("Votre mot de passe a été changé. Connectez-vous.");
      } else navigate("measure");
    } catch (e: any) {
      setError(e.message);
      if (e.message.includes("Vérifiez votre adresse")) {
        setSent(true);
        await getLocalMail();
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title={
          sent
            ? "Un email vous attend."
            : mode === "signin"
              ? "Content de vous revoir."
              : mode === "reset"
                ? "Retrouver mon accès"
                : mode === "newpass"
                  ? "Un nouveau départ."
                  : "Votre espace à vous."
        }
        eyebrow="Privé. Personnel. À votre rythme."
        back={false}
      />
      <div className="account-intro">
        <span className="intro-icon">
          <Icon as={LockKeyhole} size={30} />
        </span>
        <p>
          Des repères pour vous.
          <br />
          Un suivi qui vous appartient.
        </p>
      </div>
      {sent ? (
        <section className="plain-card">
          <Icon as={Mail} size={28} />
          <h2>
            {mode === "reset"
              ? "Consultez votre messagerie"
              : "Vérifiez votre adresse"}
          </h2>
          <p>
            {mode === "reset"
              ? "Si un compte existe à cette adresse, un lien de récupération vous a été envoyé."
              : `Un lien de vérification a été préparé pour ${email}. Ouvrez-le pour activer votre espace.`}
          </p>
          {localMail && (
            <div className="development-mail">
              <span className="eyebrow">
                Messagerie locale de développement
              </span>
              <p>
                Aucun email n’a été envoyé. Ce lien permet de tester le parcours
                sur cet ordinateur.
              </p>
              <a
                href={
                  new URL(localMail.url).pathname +
                  new URL(localMail.url).search
                }
                className="secondary"
              >
                {localMail.purpose === "verify"
                  ? "Vérifier mon adresse"
                  : "Choisir un mot de passe"}
                <Icon as={ArrowRight} />
              </a>
            </div>
          )}
          {mode !== "reset" && (
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const response = await authClient.sendVerificationEmail({
                    email,
                    callbackURL: `${location.origin}/#account`,
                  });
                  if (response.error)
                    throw new Error(
                      "Le lien n’a pas pu être renvoyé. Réessayez.",
                    );
                  await getLocalMail();
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Renvoyer le lien de vérification
            </Button>
          )}
          <Button
            onClick={() => {
              setMode("signin");
              setSent(false);
            }}
          >
            Revenir à la connexion
          </Button>
        </section>
      ) : (
        <form onSubmit={submit} className="stack auth-form">
          {mode === "signup" && (
            <label className="field-label">
              Votre pseudonyme <span className="optional">Facultatif</span>
              <input
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Comment vous appeler ?"
                maxLength={100}
              />
            </label>
          )}
          {mode !== "newpass" && (
            <label className="field-label">
              Adresse email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
              />
            </label>
          )}
          {mode !== "reset" && (
            <label className="field-label">
              Mot de passe
              <div className="password-field">
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={mode === "signin" ? 1 : 12}
                  maxLength={128}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="12 caractères minimum"
                />
                <button
                  type="button"
                  className="circle"
                  aria-label={
                    show
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  onClick={() => setShow(!show)}
                >
                  <Icon as={show ? EyeOff : Eye} />
                </button>
              </div>
            </label>
          )}
          {mode === "signup" && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={terms}
                required
                onChange={(e) => setTerms(e.target.checked)}
              />
              <span>
                J’accepte les{" "}
                <button
                  type="button"
                  className="inline-link"
                  onClick={() => navigate("legal")}
                >
                  conditions d’utilisation
                </button>
                . Mes consentements au suivi, aux photos et aux rappels seront
                choisis séparément.
              </span>
            </label>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "Un instant…"
              : mode === "signup"
                ? "Créer mon espace"
                : mode === "signin"
                  ? "Me connecter"
                  : mode === "reset"
                    ? "Recevoir un lien"
                    : "Changer mon mot de passe"}
            <Icon as={ArrowRight} />
          </button>
        </form>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      <div className="auth-links">
        {mode === "signin" && (
          <button
            className="text-button"
            onClick={() => {
              setMode("reset");
              setSent(false);
              setError("");
            }}
          >
            Mot de passe oublié ?
          </button>
        )}
        <button
          className="text-button"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setSent(false);
            setError("");
          }}
        >
          {mode === "signup"
            ? "Déjà un compte ? Me connecter"
            : "Créer mon espace"}
        </button>
        <button className="text-button" onClick={() => navigate("measure")}>
          Continuer la découverte <Icon as={ArrowRight} size={16} />
        </button>
      </div>
      <p className="privacy-caption">
        <Icon as={ShieldCheck} size={14} />
        Aucune publicité. Vos données restent les vôtres.
      </p>
    </>
  );
}
export { ProfileScreen } from "./ProfileScreen";
export { PrivacyScreen } from "./PrivacyScreen";
export { LegalScreen } from "./LegalScreen";
