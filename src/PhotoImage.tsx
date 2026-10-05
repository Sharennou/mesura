import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { CLOUD } from "./deployment";
import { apiResponse } from "./api";
export function PhotoImage({
  photoId,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { photoId: string }) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!CLOUD) return;
    const controller = new AbortController();
    let objectURL = "";
    setSrc("");
    setError("");
    void apiResponse(`/photos/${photoId}`, { signal: controller.signal })
      .then((r) => r.blob())
      .then((blob) => {
        if (!controller.signal.aborted) {
          objectURL = URL.createObjectURL(blob);
          setSrc(objectURL);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Photo indisponible. Rechargez la page pour réessayer.");
      });
    return () => {
      controller.abort();
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [photoId]);
  if (error) return <span role="status">{error}</span>;
  if (CLOUD && !src) return <span role="status">Chargement de la photo…</span>;
  return <img {...props} src={CLOUD ? src : `/api/photos/${photoId}`} />;
}
