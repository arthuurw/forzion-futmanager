import { pick, type Rng } from "./rng";
import type { Country } from "./types";

const FIRST_NAMES = [
  "Adriano", "Alan", "Alex", "Alisson", "Anderson", "André", "Arthur", "Bruno", "Caio", "Carlos",
  "Cauã", "Cléber", "Danilo", "Davi", "Dener", "Diego", "Douglas", "Éder", "Edson", "Elias",
  "Emerson", "Enzo", "Everton", "Fábio", "Felipe", "Fernando", "Flávio", "Gabriel", "Geovani", "Gilberto",
  "Guilherme", "Gustavo", "Henrique", "Hugo", "Igor", "Ítalo", "Jackson", "Jair", "Jean", "João",
  "Jonas", "Jorge", "José", "Juan", "Júlio", "Kaio", "Kléber", "Leandro", "Léo", "Lucas",
  "Luís", "Marcelo", "Marcos", "Mateus", "Maurício", "Michel", "Murilo", "Natan", "Nilson", "Otávio",
  "Patrick", "Paulo", "Pedro", "Rafael", "Renan", "Ricardo", "Robson", "Rodrigo", "Rogério", "Samuel",
  "Sérgio", "Tiago", "Vagner", "Valdir", "Vinícius", "Vítor", "Wallace", "Wesley", "William", "Yuri",
];

const ONSETS = ["b", "c", "d", "f", "g", "l", "m", "n", "p", "r", "s", "t", "v", "z", "br", "cr", "tr", "pr", "gr"];
const NUCLEI = ["a", "e", "i", "o", "u", "ei", "ou", "ai", "ão"];
const CODAS = ["", "", "", "n", "r", "s", "l"];
const SURNAME_ENDINGS = ["", "", "es", "ini", "eira", "ão", "inho", "aldo", "elli", "oso"];

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** PT-BR-sounding fictional surname built from syllables. */
export function generateSurname(rng: Rng): string {
  const syllables = 1 + Math.floor(rng.next() * 2);
  let s = "";
  for (let i = 0; i < syllables; i++) {
    s += pick(rng, ONSETS) + pick(rng, NUCLEI);
    if (i < syllables - 1) s += pick(rng, CODAS);
  }
  s += pick(rng, SURNAME_ENDINGS);
  return capitalize(s);
}

/** Door 4 (paises): Spanish-Argentine sounding first names. */
const AR_FIRST_NAMES = [
  "Agustín", "Alejandro", "Ariel", "Bautista", "Benjamín", "Claudio", "Cristian", "Damián", "Darío", "Emiliano",
  "Esteban", "Ezequiel", "Facundo", "Federico", "Franco", "Germán", "Gonzalo", "Guido", "Hernán", "Ignacio",
  "Joaquín", "Julián", "Lautaro", "Leonel", "Luciano", "Mariano", "Matías", "Mauro", "Maximiliano", "Nahuel",
  "Nicolás", "Pablo", "Ramiro", "Santiago", "Sebastián", "Valentín", "Walter", "Fermín", "Gastón", "Lisandro",
];

/** Door 4 (paises): European-Portuguese sounding first names. */
const PT_FIRST_NAMES = [
  "Afonso", "Álvaro", "António", "Armando", "Bernardo", "Custódio", "Dinis", "Diogo", "Domingos", "Duarte",
  "Filipe", "Francisco", "Frederico", "Gonçalo", "Hélder", "Joaquim", "Lourenço", "Manuel", "Martim", "Miguel",
  "Nélson", "Nuno", "Raul", "Rúben", "Rui", "Salvador", "Sebastião", "Silvestre", "Simão", "Tomás",
  "Valter", "Vasco", "Xavier", "Abel", "Adelino", "Belmiro", "Fausto", "Horácio", "Jaime", "Quim",
];

/** Door 4 (paises): the first names of each country's players. */
export const FIRST_NAMES_BY_COUNTRY: Readonly<Record<Country, readonly string[]>> = {
  BR: FIRST_NAMES,
  AR: AR_FIRST_NAMES,
  PT: PT_FIRST_NAMES,
};

const AR_ONSETS = ["b", "c", "d", "f", "g", "l", "m", "n", "p", "r", "s", "t", "v", "ch", "gu", "br", "cr", "tr"];
const AR_NUCLEI = ["a", "e", "i", "o", "u", "ia", "ue", "ie"];
const AR_CODAS = ["", "", "", "n", "r", "s", "l"];
const AR_SURNAME_ENDINGS = ["", "ez", "ez", "ini", "etti", "ón", "ero", "ano", "illo", "ada"];

const PT_ONSETS = ["b", "c", "d", "f", "g", "l", "m", "n", "p", "r", "s", "t", "v", "x", "ch", "br", "fr", "pr"];
const PT_NUCLEI = ["a", "e", "i", "o", "u", "ei", "ou", "oi"];
const PT_CODAS = ["", "", "", "n", "r", "s", "l"];
const PT_SURNAME_ENDINGS = ["", "", "es", "eira", "ão", "ares", "elo", "ota", "ais", "ém"];

function syllableSurname(rng: Rng, onsets: readonly string[], nuclei: readonly string[], codas: readonly string[], endings: readonly string[]): string {
  const syllables = 1 + Math.floor(rng.next() * 2);
  let s = "";
  for (let i = 0; i < syllables; i++) {
    s += pick(rng, onsets) + pick(rng, nuclei);
    if (i < syllables - 1) s += pick(rng, codas);
  }
  s += pick(rng, endings);
  return capitalize(s);
}

/** Door 4 (paises): `BR` draws exactly as before the countries existed. */
export function generatePlayerName(rng: Rng, country: Country = "BR"): string {
  if (country === "AR") return `${pick(rng, AR_FIRST_NAMES)} ${syllableSurname(rng, AR_ONSETS, AR_NUCLEI, AR_CODAS, AR_SURNAME_ENDINGS)}`;
  if (country === "PT") return `${pick(rng, PT_FIRST_NAMES)} ${syllableSurname(rng, PT_ONSETS, PT_NUCLEI, PT_CODAS, PT_SURNAME_ENDINGS)}`;
  return `${pick(rng, FIRST_NAMES)} ${generateSurname(rng)}`;
}

export type FlagPattern = "vertical" | "horizontal" | "diagonal" | "cross" | "hoops";

export interface ClubIdentity {
  name: string;
  /** Up to three kit colours, main first. */
  colors: readonly string[];
  pattern: FlagPattern;
}

/**
 * The 20 clubs of the league: fictional names in the spirit of the Brazilian Série A - a
 * nickname plus the city or state, and the colours it evokes. No real club name or crest (AD-008).
 */
export const CLUB_IDENTITIES: readonly ClubIdentity[] = [
  { name: "Rubro-Negro Carioca", colors: ["#d7141a", "#111111"], pattern: "hoops" },
  { name: "Alviverde Paulistano", colors: ["#0b6e2c", "#ffffff"], pattern: "vertical" },
  { name: "Alvinegro do Parque", colors: ["#111111", "#ffffff"], pattern: "horizontal" },
  { name: "Tricolor do Morumbi", colors: ["#ffffff", "#d7141a", "#111111"], pattern: "horizontal" },
  { name: "Peixe Praiano", colors: ["#ffffff", "#111111"], pattern: "vertical" },
  { name: "Tricolor das Laranjeiras", colors: ["#7a0f2b", "#0b6e2c", "#ffffff"], pattern: "vertical" },
  { name: "Estrela Solitária", colors: ["#111111", "#ffffff"], pattern: "vertical" },
  { name: "Cruzmaltino da Colina", colors: ["#111111", "#ffffff", "#d7141a"], pattern: "diagonal" },
  { name: "Tricolor Gaúcho", colors: ["#1b8fd8", "#111111", "#ffffff"], pattern: "vertical" },
  { name: "Colorado do Sul", colors: ["#d7141a", "#ffffff"], pattern: "horizontal" },
  { name: "Galo Mineiro", colors: ["#111111", "#ffffff"], pattern: "vertical" },
  { name: "Raposa Celeste", colors: ["#1446b8", "#ffffff"], pattern: "cross" },
  { name: "Esquadrão de Aço", colors: ["#1446b8", "#d7141a", "#ffffff"], pattern: "horizontal" },
  { name: "Leão da Barra", colors: ["#d7141a", "#111111"], pattern: "horizontal" },
  { name: "Leão do Pici", colors: ["#1446b8", "#d7141a", "#ffffff"], pattern: "horizontal" },
  { name: "Vozão Alvinegro", colors: ["#111111", "#ffffff"], pattern: "diagonal" },
  { name: "Leão da Ilha", colors: ["#d7141a", "#111111", "#f5c400"], pattern: "hoops" },
  { name: "Massa Bruta Paulista", colors: ["#ffffff", "#d7141a"], pattern: "diagonal" },
  { name: "Furacão Paranaense", colors: ["#d7141a", "#111111"], pattern: "diagonal" },
  { name: "Coxa Alviverde", colors: ["#0b6e2c", "#ffffff"], pattern: "hoops" },
];

/**
 * The 20 clubs that start in the Série B (AD-011): nicknames in the spirit of the Brazilian
 * second division, with city or state and colours. No real club name or crest (AD-008).
 */
export const SERIE_B_IDENTITIES: readonly ClubIdentity[] = [
  { name: "Esmeraldino do Cerrado", colors: ["#0b6e2c", "#ffffff"], pattern: "horizontal" },
  { name: "Macaca Campineira", colors: ["#111111", "#ffffff"], pattern: "vertical" },
  { name: "Bugre Campineiro", colors: ["#0b6e2c", "#ffffff"], pattern: "diagonal" },
  { name: "Leão Catarinense", colors: ["#1446b8", "#ffffff"], pattern: "hoops" },
  { name: "Papão da Curuzu", colors: ["#1b8fd8", "#ffffff"], pattern: "vertical" },
  { name: "Leão Azul Paraense", colors: ["#1446b8", "#ffffff"], pattern: "cross" },
  { name: "Timbu Pernambucano", colors: ["#d7141a", "#ffffff"], pattern: "hoops" },
  { name: "Cobra Coral", colors: ["#d7141a", "#111111", "#ffffff"], pattern: "horizontal" },
  { name: "Coelho Mineiro", colors: ["#0b6e2c", "#ffffff"], pattern: "vertical" },
  { name: "Verdão do Oeste", colors: ["#0b6e2c", "#f5c400"], pattern: "diagonal" },
  { name: "Tigre Catarinense", colors: ["#f5c400", "#111111"], pattern: "vertical" },
  { name: "Tigrão Goiano", colors: ["#d7141a", "#111111"], pattern: "hoops" },
  { name: "Galo da Pajuçara", colors: ["#1b8fd8", "#ffffff"], pattern: "horizontal" },
  { name: "Azulão do Mutange", colors: ["#1446b8", "#ffffff"], pattern: "vertical" },
  { name: "Alvinegro Potiguar", colors: ["#111111", "#ffffff"], pattern: "hoops" },
  { name: "Tubarão Paranaense", colors: ["#1446b8", "#111111"], pattern: "diagonal" },
  { name: "Fantasma de Ponta Grossa", colors: ["#111111", "#ffffff"], pattern: "cross" },
  { name: "Pantera de Ribeirão", colors: ["#111111", "#ffffff", "#d7141a"], pattern: "vertical" },
  { name: "Dragão Goiano", colors: ["#d7141a", "#111111"], pattern: "diagonal" },
  { name: "Dourado Pantaneiro", colors: ["#f5c400", "#0b6e2c"], pattern: "horizontal" },
];

/**
 * Paises AC 3: the 20 clubs of the Liga Argentina, nicknames in the spirit of the Argentine first
 * division with a neighbourhood, city or region, and colours. No real club name or crest (AD-008).
 */
export const AR_IDENTITIES: readonly ClubIdentity[] = [
  { name: "Millonario de Núñez", colors: ["#ffffff", "#d7141a"], pattern: "diagonal" },
  { name: "Xeneize de la Ribera", colors: ["#1446b8", "#f5c400"], pattern: "horizontal" },
  { name: "Académico de Avellaneda", colors: ["#1b8fd8", "#ffffff"], pattern: "vertical" },
  { name: "Diablo Rojo del Sur", colors: ["#d7141a", "#ffffff"], pattern: "horizontal" },
  { name: "Cuervo de Boedo", colors: ["#1446b8", "#d7141a"], pattern: "vertical" },
  { name: "Fortín de Liniers", colors: ["#ffffff", "#1446b8"], pattern: "cross" },
  { name: "Pincharrata Platense", colors: ["#d7141a", "#ffffff"], pattern: "vertical" },
  { name: "Lobo de La Plata", colors: ["#ffffff", "#1446b8"], pattern: "hoops" },
  { name: "Leproso Rosarino", colors: ["#d7141a", "#111111"], pattern: "vertical" },
  { name: "Canalla del Arroyito", colors: ["#1446b8", "#f5c400"], pattern: "vertical" },
  { name: "Globo de Parque Patricios", colors: ["#ffffff", "#d7141a"], pattern: "cross" },
  { name: "Granate del Sur", colors: ["#7a0f2b", "#ffffff"], pattern: "horizontal" },
  { name: "Taladro Bonaerense", colors: ["#0b6e2c", "#ffffff"], pattern: "vertical" },
  { name: "Tomba Mendocino", colors: ["#1446b8", "#ffffff"], pattern: "vertical" },
  { name: "Pirata Cordobés", colors: ["#1b8fd8", "#ffffff"], pattern: "horizontal" },
  { name: "Bicho de La Paternal", colors: ["#d7141a", "#ffffff"], pattern: "diagonal" },
  { name: "Calamar Norteño", colors: ["#6b3e1e", "#ffffff"], pattern: "vertical" },
  { name: "Tatengue del Litoral", colors: ["#d7141a", "#ffffff"], pattern: "vertical" },
  { name: "Sabalero Santafesino", colors: ["#d7141a", "#111111"], pattern: "vertical" },
  { name: "Halcón de Varela", colors: ["#f5c400", "#0b6e2c"], pattern: "diagonal" },
];

/**
 * Paises AC 3: the 20 clubs of the Liga Portuguesa, nicknames in the spirit of the Portuguese
 * first division with a city or region, and colours. No real club name or crest (AD-008).
 */
export const PT_IDENTITIES: readonly ClubIdentity[] = [
  { name: "Águia da Luz", colors: ["#d7141a", "#ffffff"], pattern: "horizontal" },
  { name: "Dragão das Antas", colors: ["#1446b8", "#ffffff"], pattern: "vertical" },
  { name: "Leão de Alvalade", colors: ["#0b6e2c", "#ffffff"], pattern: "hoops" },
  { name: "Arsenalista do Minho", colors: ["#d7141a", "#ffffff"], pattern: "diagonal" },
  { name: "Conquistador Minhoto", colors: ["#ffffff", "#111111"], pattern: "vertical" },
  { name: "Pantera do Bessa", colors: ["#111111", "#ffffff"], pattern: "cross" },
  { name: "Verde-Rubro Insular", colors: ["#d7141a", "#0b6e2c"], pattern: "vertical" },
  { name: "Pastel do Restelo", colors: ["#1446b8", "#ffffff"], pattern: "horizontal" },
  { name: "Sadino Verde-Branco", colors: ["#0b6e2c", "#ffffff"], pattern: "hoops" },
  { name: "Estudante de Coimbra", colors: ["#111111", "#ffffff"], pattern: "horizontal" },
  { name: "Canarinho da Linha", colors: ["#f5c400", "#1446b8"], pattern: "vertical" },
  { name: "Algarvio Alvinegro", colors: ["#111111", "#ffffff"], pattern: "diagonal" },
  { name: "Galo de Barcelos", colors: ["#d7141a", "#1446b8"], pattern: "vertical" },
  { name: "Castor da Capital do Móvel", colors: ["#f5c400", "#0b6e2c"], pattern: "horizontal" },
  { name: "Vilacondense Verde", colors: ["#0b6e2c", "#ffffff"], pattern: "vertical" },
  { name: "Cónego do Vale do Ave", colors: ["#0b6e2c", "#ffffff"], pattern: "diagonal" },
  { name: "Lobo de Arouca", colors: ["#f5c400", "#1446b8"], pattern: "hoops" },
  { name: "Azul de Famalicão", colors: ["#1446b8", "#ffffff"], pattern: "cross" },
  { name: "Viriato da Beira", colors: ["#111111", "#ffffff"], pattern: "vertical" },
  { name: "Flaviense Azul-Grená", colors: ["#1446b8", "#7a0f2b"], pattern: "horizontal" },
];

const IDENTITY_BY_NAME = new Map([...CLUB_IDENTITIES, ...SERIE_B_IDENTITIES, ...AR_IDENTITIES, ...PT_IDENTITIES].map((c) => [c.name, c]));

export function clubIdentity(name: string): ClubIdentity | undefined {
  return IDENTITY_BY_NAME.get(name);
}

/** Draw until a name not yet in `taken`; adds it to `taken`. */
export function uniqueName(rng: Rng, taken: Set<string>, draw: (rng: Rng) => string): string {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const name = draw(rng);
    if (!taken.has(name)) {
      taken.add(name);
      return name;
    }
  }
  throw new Error("could not draw a unique name");
}
