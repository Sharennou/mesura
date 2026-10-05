import { useState } from "react";
import { Camera, Columns2, Plus, Trash2 } from "lucide-react";
import { useViewState } from "../useViewState";
import { useApp } from "../context";
import { api } from "../api";
import { PhotoImage } from "../PhotoImage";
import {
  Button,
  Confirm,
  DateLabel,
  Empty,
  ErrorMessage,
  Icon,
  PageTitle,
} from "../components";
import type { AccountData } from "../../shared/types";

export function PhotosScreen() {
  const { data, setData, navigate, requireAccount, setViewState } = useApp();
  const [orientation, setOrientation] = useViewState<"face" | "profil" | "dos">(
    "photos.angle",
    "face",
  );
  const [a, setA] = useViewState("photos.a", "");
  const [b, setB] = useViewState("photos.b", "");
  const [slider, setSlider] = useState(50);
  const [side, setSide] = useState(true);
  const [remove, setRemove] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const photos = data.entries
    .flatMap((e) => e.photos.map((p) => ({ ...p, date: e.date })))
    .filter((p) => p.orientation === orientation)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pa = photos.find((p) => p.id === a) ?? photos[0];
  const pb = photos.find((p) => p.id === b) ?? photos.at(-1);
  return (
    <>
      <PageTitle title="Photos de comparaison" />
      <p className="lead">
        Même angle. Deux moments.
        <br />
        Vos images restent privées.
      </p>
      <div className="frequency-selector">
        {(["face", "profil", "dos"] as const).map((o) => (
          <button
            key={o}
            aria-pressed={orientation === o}
            onClick={() => {
              setOrientation(o);
              setA("");
              setB("");
            }}
          >
            {o === "face" ? "Face" : o === "profil" ? "Profil" : "Dos"}
          </button>
        ))}
      </div>
      {photos.length ? (
        <>
          {new Set(photos.map((p) => p.date)).size > 1 ? (
            <div className="two-fields">
              {(
                [
                  ["A", a, setA, pa],
                  ["B", b, setB, pb],
                ] as const
              ).map(([label, value, set, current]) => (
                <label className="field-label" key={label}>
                  {label === "A" ? "Date de référence" : "Date comparée"}
                  <select
                    value={value || current?.id}
                    onChange={(e) => set(e.target.value)}
                  >
                    {photos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.date}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : (
            <p className="small">
              Date disponible : <DateLabel date={photos[0].date} />{" "}
              {photos[0].date.slice(0, 4)}
            </p>
          )}
          {pa && pb && pa.date !== pb.date ? (
            <>
              <Button onClick={() => setSide(!side)}>
                <Icon as={Columns2} />
                {side ? "Passer au curseur" : "Voir côte à côte"}
              </Button>
              <div className={side ? "photo-side-by-side" : "photo-comparison"}>
                {side ? (
                  <>
                    {[pa, pb].map((p, i) => (
                      <figure key={p.id}>
                        <PhotoImage
                          photoId={p.id}
                          alt={`${orientation}, photo ${i === 0 ? "A" : "B"} du ${p.date}`}
                        />
                        <figcaption>
                          {i === 0 ? "Référence" : "Comparée"} ·{" "}
                          <DateLabel date={p.date} /> {p.date.slice(0, 4)}
                        </figcaption>
                      </figure>
                    ))}
                  </>
                ) : (
                  <>
                    <PhotoImage
                      photoId={pa.id}
                      alt={`${orientation}, photo A du ${pa.date}`}
                    />
                    <div
                      className="photo-reveal"
                      style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}
                    >
                      <PhotoImage
                        photoId={pb.id}
                        alt={`${orientation}, photo B du ${pb.date}`}
                      />
                    </div>
                    <div
                      className="photo-divider"
                      style={{ left: `${slider}%` }}
                    />
                  </>
                )}
              </div>
              {!side && (
                <p className="small">
                  Référence : <DateLabel date={pa.date} /> {pa.date.slice(0, 4)}{" "}
                  · Comparée : <DateLabel date={pb.date} />{" "}
                  {pb.date.slice(0, 4)}
                </p>
              )}
              {!side && (
                <label className="field-label">
                  Révéler la photo B : {slider} %
                  <input
                    className="photo-range"
                    type="range"
                    min="0"
                    max="100"
                    value={slider}
                    onChange={(e) => setSlider(+e.target.value)}
                    aria-label="Pourcentage de la photo B révélé"
                  />
                  <div className="two-fields">
                    <Button onClick={() => setSlider(0)}>Photo A</Button>
                    <Button onClick={() => setSlider(100)}>Photo B</Button>
                  </div>
                </label>
              )}
            </>
          ) : (
            <p className="plain-card">
              {new Set(photos.map((p) => p.date)).size < 2
                ? "Une seule date photographiée pour cet angle. Ajoutez une photo du même angle à une seconde date pour comparer."
                : "Choisissez deux dates différentes pour comparer cet angle."}
            </p>
          )}
          <div className="section-heading">
            <h2>Votre galerie</h2>
          </div>
          <div className="photo-gallery">
            {[...photos].reverse().map((p) => (
              <figure key={p.id}>
                <PhotoImage
                  loading="lazy"
                  photoId={p.id}
                  alt={`Vue ${orientation} du ${p.date}`}
                />
                <figcaption>
                  <DateLabel date={p.date} /> {p.date.slice(0, 4)}
                  <button
                    className="circle"
                    aria-label={`Supprimer la photo du ${p.date}`}
                    onClick={() => setRemove(p.id)}
                  >
                    <Icon as={Trash2} size={16} />
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      ) : (
        <Empty title="Votre premier repère en images." icon={Camera}>
          Ajoutez une photo à votre prochaine entrée. Face, profil ou dos :
          choisissez ce qui vous convient.
        </Empty>
      )}
      <Button
        onClick={() => {
          setViewState((state) => ({ ...state, "measure.photos": true }));
          navigate("measure");
        }}
      >
        Ajouter une photo à une entrée
        <Icon as={Plus} />
      </Button>
      <p className="privacy-caption">
        Les proportions d’origine sont conservées. Aucun recadrage ni
        modification du corps.
      </p>
      <ErrorMessage>{error}</ErrorMessage>
      {remove && (
        <Confirm
          title="Supprimer cette photo ?"
          text="L’image privée sera effacée du serveur. Si elle constitue la seule information de l’entrée, celle-ci sera aussi supprimée."
          busy={busy}
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            if (!requireAccount()) return;
            setBusy(true);
            try {
              await api(`/photos/${remove}`, { method: "DELETE" });
              setData(await api<AccountData>("/account"));
              setRemove(null);
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </>
  );
}
