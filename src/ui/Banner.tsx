import { useGame } from "../store";

/** AC 27 and AC 32: persistence problems are shown, never fatal. */
export function Banner() {
  const saveStatus = useGame((s) => s.saveStatus);
  if (saveStatus === "unavailable") return <div className="banner">Salvamento indisponível neste navegador</div>;
  if (saveStatus === "failed") return <div className="banner error">Não foi possível salvar</div>;
  return null;
}
