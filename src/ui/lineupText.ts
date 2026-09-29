/** Correcoes-validacao AC 36: «Falta 1 titular», «Faltam N titulares». */
export function missingStartersText(missing: number): string {
  return missing === 1 ? "Falta 1 titular" : `Faltam ${missing} titulares`;
}
