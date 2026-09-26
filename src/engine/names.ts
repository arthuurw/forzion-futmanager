import { pick, type Rng } from "./rng";

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

export function generatePlayerName(rng: Rng): string {
  return `${pick(rng, FIRST_NAMES)} ${generateSurname(rng)}`;
}

const CITIES = [
  "Vila Serrana", "Porto Azul", "Campo Real", "Alto Verde", "Ribeira", "Santa Cruz do Norte", "Boa Vista do Sul",
  "Cachoeira", "Pedra Branca", "Lagoa Dourada", "Monte Claro", "Três Rios", "Vale do Sol", "Barra Nova",
  "São Cosme", "Itaperuna", "Guaratiba", "Jacarandá", "Palmares", "Ouro Fino", "Serra Negra", "Cabo Frio do Vale",
  "Águas Claras", "Floresta", "Piratini", "Coqueiral", "Mangueira", "Sertãozinho", "Bela Aurora", "Nova Esperança",
  "Cruzeiro do Vale", "Ipê Amarelo", "Corumbá Novo", "Taquari", "Baía Grande", "Aracatu", "Jequitibá", "Morro Alto",
  "Lençóis", "Passo Fundo do Oeste",
];

const CLUB_STYLES = [
  "Atlético {c}", "{c} FC", "Esporte Clube {c}", "{c} Esporte Clube", "Grêmio {c}", "União {c}",
  "Nacional de {c}", "{c} Futebol Clube", "Sport {c}", "Associação {c}", "Clube {c}", "Operário de {c}",
];

export function generateClubName(rng: Rng): string {
  return pick(rng, CLUB_STYLES).replace("{c}", pick(rng, CITIES));
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
