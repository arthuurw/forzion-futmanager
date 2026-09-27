# Música e efeitos sonoros - checks

Profile: light
Plan: `.specs/features/audio/plan.md`

26 checks in 3 slices · 3 one-way doors · 1 open, of which 0 block the build (1 blocks go-live: as 5 faixas)

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`). Os testes de `src/audio` rodam em node, com um `AudioBackend` falso que registra cada chamada (criar contexto, tocar efeito, tocar faixa, rampa de ganho, suspender, retomar, baixar arquivo), relógio falso do Vitest e `Rng` injetado. Os testes de tela rodam em jsdom, com o mesmo backend falso injetado pelo ponto de entrada. Todo valor esperado é literal no teste, nunca calculado pela função sob teste (L-004). Tabelas cobrem o conjunto inteiro (L-005). Lições aplicadas: L-001 (preferência escrita no armazenamento antes de renderizar), L-003 (fiação pela tela, não só pelo módulo), L-007 (fixture com o membro excluído), L-009 (cada door com check próprio).

Ids de efeito fixados aqui para os testes: `whistle-short`, `whistle-double`, `whistle-long`, `crowd-roar`, `goal-jingle`, `crowd-groan`, `crowd-ooh`, `crowd-boo`, e o ambiente `crowd-ambience`.

## Checks

### S1 - O usuário controla o som · ~6 files · ~60 KB · ~15k

**C1** - ✓ Sem preferência gravada, a tela inicial e o top strip da tela Elenco mostram os botões «Música» e «Efeitos», nessa ordem, os dois com `aria-pressed="true"` (AC 1, AC 3)
Proof: `npx vitest run src/app.test.tsx -t "botões de áudio na tela inicial e no top strip"`

**C2** - ✓ Apertar «Música» grava `{"music":false,"sfx":true}` na chave `forzion-futmanager:audio` e deixa o botão com `aria-pressed="false"`; apertar «Efeitos» em seguida grava `{"music":false,"sfx":false}`. Com `{"music":false,"sfx":false}` escrito na chave antes de montar o `App`, os dois botões abrem com `aria-pressed="false"` (AC 2, door 1, L-001)
Proof: `npx vitest run src/app.test.tsx -t "preferências de áudio gravadas e relidas"`

**C3** - ✓ Tabela do valor na chave → estado lido: ausente → `{music: true, sfx: true}`; `{"music":false,"sfx":true}` → `{music: false, sfx: true}`; `lixo` (JSON inválido) → os dois ligados; `{"music":"no","sfx":1}` (tipo errado) → os dois ligados; `getItem` que lança → os dois ligados, sem exceção; `setItem` que lança ao gravar → sem exceção, e o estado em memória muda mesmo assim (AC 3, AC 4, door 1)
Proof: `npx vitest run src/audio/prefs.test.ts -t "leitura e gravação das preferências"`

**C4** - ✓ Com a faixa de gestão tocando, desligar a música registra uma rampa do ganho da música até 0 com duração de no máximo 1 s. Com os efeitos desligados, um `goal` do usuário não registra nenhum efeito tocado; religados, o próximo `goal` registra `crowd-roar` (AC 2)
Proof: `npx vitest run src/audio/music.test.ts -t "desligar a música some em até 1 s"`
Proof: `npx vitest run src/audio/sfx.test.ts -t "efeitos desligados não tocam"`

**C5** - ✓ Antes do primeiro gesto, com a tela inicial aberta e um evento `kickoff` enviado, o backend não registra contexto criado, arquivo baixado nem som tocado. Depois de um `pointerdown` no documento, o contexto é criado e a faixa `abertura` começa. Depois de um `keydown` (num segundo teste, sem `pointerdown`), o mesmo acontece (AC 5, AC 20)
Proof: `npx vitest run src/audio/music.test.ts -t "nada toca antes do primeiro gesto"`
Proof: `npx vitest run src/app.test.tsx -t "primeiro gesto inicia a música de abertura"`

**C6** - ✓ Com `document.hidden` passando a `true` e um `visibilitychange`, o backend registra `suspend`; voltando a `false`, registra `resume`, e a faixa não recomeça (AC 6)
Proof: `npx vitest run src/audio/music.test.ts -t "aba escondida suspende o áudio"`

### S2 - A partida do usuário tem som · ~5 files · ~75 KB · ~19k

**C7** - ✓ Tabela sobre os 12 tipos de `MatchEventType`, com o lado do clube nos dois tipos de gol, → efeitos registrados: `kickoff` → `whistle-short`; `halftime` → `whistle-double`; `fulltime` → `whistle-long`; `goal` do usuário → `crowd-roar` e `goal-jingle`; `goal` do adversário → `crowd-groan`; `penalty_scored` do usuário → `crowd-roar` e `goal-jingle`; `penalty_scored` do adversário → `crowd-groan`; `shot_saved`, `shot_missed` e `penalty_missed` → `crowd-ooh`; `yellow` → `whistle-short`; `red` → `whistle-short` e `crowd-boo`; `injury` e `substitution` → nenhum. Os eventos da tabela são espaçados em 1 s para o limite do C11 não interferir (AC 7)
Proof: `npx vitest run src/audio/sfx.test.ts -t "efeito de cada tipo de evento"`

**C8** - ✓ Pela tela ao vivo: num minuto em que a partida do usuário tem um `goal` do clube do usuário e outra partida da mesma rodada também tem um `goal`, o backend registra `crowd-roar` uma vez e nenhum efeito pelo outro gol (AC 7, AC 8, L-003, L-007)
Proof: `npx vitest run src/ui/Live.test.tsx -t "som só da partida do usuário"`

**C9** - ✓ Tabela do relógio → ganho do `crowd-ambience`: `running` → 1; `halftime` → 0,4; `paused` → 0; fim da partida → rampa até 0 com duração de 2 s e parada do ambiente. Pela tela ao vivo, o ambiente começa com o relógio `running` e vai a 0 quando o usuário aperta pausar (AC 9)
Proof: `npx vitest run src/audio/sfx.test.ts -t "ambiente da torcida segue o relógio"`
Proof: `npx vitest run src/ui/Live.test.tsx -t "ambiente acompanha o relógio da tela ao vivo"`

**C10** - ✓ Com um `Rng` semeado com 1, 200 execuções de cada um de `crowd-roar`, `crowd-groan` e `crowd-ooh` usam pelo menos 2 variantes distintas cada, e todo fator de afinação registrado fica entre 0,94 e 1,06. Com um `Rng` falso que devolve 0, o fator é 0,94; com um que devolve 0,999999, o fator fica acima de 1,0599 e no máximo 1,06 (AC 10)
Proof: `npx vitest run src/audio/sfx.test.ts -t "variantes e afinação"`

**C11** - ✓ Dois `crowd-ooh` a 0 ms e a 399 ms → 1 registrado; a 0 ms e a 400 ms → 2 registrados; um `crowd-ooh` a 0 ms e um `whistle-short` a 100 ms → 2 registrados (AC 11)
Proof: `npx vitest run src/audio/sfx.test.ts -t "mesmo efeito em menos de 400 ms"`

**C12** - ✓ Pela tela ao vivo, num minuto em que a partida do usuário ainda tem pela frente pelo menos um `goal` e um `shot_saved` ou `shot_missed`, apertar «Pular para o fim» registra exatamente um efeito: `whistle-long` (AC 12, L-007)
Proof: `npx vitest run src/ui/Live.test.tsx -t "pular para o fim toca só o apito final"`

**C13** - ✓ Com a faixa de gestão tocando, a `phase` passar a `live` registra uma rampa do ganho da música até 0 com duração de 1 s, e nenhuma faixa começa enquanto a `phase` é `live`, mesmo depois de 120 s de relógio falso. Pelo ponto de entrada, «Jogar rodada» a partir da tela Elenco registra a mesma rampa (AC 13)
Proof: `npx vitest run src/audio/music.test.ts -t "sem música na partida"`
Proof: `npx vitest run src/app.test.tsx -t "tela ao vivo cala a música"`

**C14** - ✓ Com a música ligada e uma partida ao vivo completa jogada em 4×, o `rngState` do jogo e os placares ficam iguais aos da mesma partida com o áudio mudo (Impact: o `Rng` do áudio nunca toca o do jogo)
Proof: `npx vitest run src/ui/Live.test.tsx -t "áudio não mexe no sorteio do jogo"`

### S3 - A música acompanha as telas sem cansar · ~3 files · ~45 KB · ~11k

**C15** - ✓ Tabela sobre as 12 `Phase` → contexto: `home` e `chooseClub` → abertura; `squad`, `market`, `finance`, `round`, `history` e `cup` → gestão; `end` e `newSeason` → fim de temporada; `loading` e `live` → nenhum. O mapa é um `Record<Phase, …>`, então uma `Phase` nova sem contexto não compila (AC 14)
Proof: `npx vitest run src/audio/music.test.ts -t "contexto de cada tela"`

**C16** - ✓ `squad` → `market` → `finance` → `squad` registra um único início de faixa de gestão, nenhuma parada e nenhuma rampa. Pelo ponto de entrada, ir da tela Elenco ao Mercado e voltar registra o mesmo (AC 15, L-003)
Proof: `npx vitest run src/audio/music.test.ts -t "mesmo contexto não recomeça"`
Proof: `npx vitest run src/app.test.tsx -t "trocar de tela de gestão não recomeça a faixa"`

**C17** - ✓ Com uma faixa de gestão tocando, a `phase` passar a `end` registra uma rampa da faixa atual até 0 com duração de 1 s; a 999 ms `fim-de-temporada` ainda não começou, e a 1000 ms começou. Se a `phase` volta a um contexto de gestão durante o fade, só a faixa do último contexto começa (AC 16)
Proof: `npx vitest run src/audio/music.test.ts -t "troca de contexto com fade de 1 s"`

**C18** - ✓ Quando uma faixa termina: com um `Rng` que devolve 0, a próxima começa a 30 s e não a 29,999 s; com um que devolve 0,999999, começa entre 89,9 s e 90 s e não antes de 89,9 s; com um `Rng` semeado com 1, em 200 fins seguidos todo silêncio fica entre 30 e 90 s (AC 17)
Proof: `npx vitest run src/audio/music.test.ts -t "silêncio de 30 a 90 s entre faixas"`

**C19** - ✓ No contexto gestão, com um `Rng` semeado com 1, em 50 faixas seguidas nenhuma é igual à anterior e as 3 (`gestao-1`, `gestao-2`, `gestao-3`) aparecem. No contexto fim de temporada, `fim-de-temporada` volta a tocar depois do silêncio (AC 18)
Proof: `npx vitest run src/audio/music.test.ts -t "próxima faixa diferente da anterior"`

**C20** - ✓ O ganho mestre da música é exatamente metade do ganho mestre dos efeitos (AC 19)
Proof: `npx vitest run src/audio/music.test.ts -t "música na metade do volume dos efeitos"`

**C21** - ✓ Depois do primeiro gesto na tela inicial, o backend registra o download só de `audio/music/abertura.mp3`; ao entrar na gestão, só da faixa sorteada; ao voltar à gestão depois de passar pela partida, a mesma faixa não é baixada de novo. Nenhuma URL aparece duas vezes nos downloads registrados (AC 20)
Proof: `npx vitest run src/audio/music.test.ts -t "faixa baixada só quando toca"`

**C22** - ✓ Com o download de `gestao-1` rejeitado, e num segundo caso com a decodificação rejeitada: nenhuma exceção sai do módulo, `console.error` não é chamado, e a próxima faixa do contexto começa depois de um silêncio entre 30 e 90 s (AC 21)
Proof: `npx vitest run src/audio/music.test.ts -t "faixa que falha vira silêncio"`

### Doors

**C23** - ✓ As faixas são exatamente `abertura`, `gestao-1`, `gestao-2`, `gestao-3` e `fim-de-temporada`, cada uma em `audio/music/<id>.mp3` (door 3)
Proof: `npx vitest run src/audio/music.test.ts -t "faixas e caminhos"`

**C24** - ✓ As dependências de runtime em `package.json` continuam exatamente `idb`, `react`, `react-dom` e `zustand` (door 2)
Proof: `npx vitest run src/deps.test.ts -t "dependências de runtime"`

**C25** - ✓ Nenhum arquivo em `src/audio/` contém `Math.random`, e nenhum arquivo em `src/engine/` importa de `audio` (door 2, AD-002)
Proof: `npx vitest run src/deps.test.ts -t "áudio sem Math.random e fora do motor"`

**C26** - ✓ Sem `window.AudioContext`, criar o áudio, enviar um `pointerdown`, trocar de contexto e enviar um `goal` não lança exceção e não registra som. Pela tela ao vivo em jsdom, que não tem `AudioContext`, com o backend padrão (sem o falso), uma rodada jogada até o fim em 4× termina na tela de resultados sem exceção (door 2)
Proof: `npx vitest run src/audio/music.test.ts -t "sem AudioContext o áudio fica mudo"`
Proof: `npx vitest run src/ui/Live.test.tsx -t "rodada sem AudioContext joga até o fim"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| botões (2) | «Música» C1 · C2 · «Efeitos» C1 · C2 | - |
| telas com os botões (2) | tela inicial C1 · top strip C1 | - |
| valor na chave (6) | ausente C3 · válido C3 · JSON inválido C3 · tipo errado C3 · `getItem` lança C3 · `setItem` lança C3 | - |
| gestos que liberam o som (2) | `pointerdown` C5 · `keydown` C5 | - |
| visibilidade da aba (2) | escondida C6 · visível C6 | - |
| tipos de `MatchEventType` (12) | C7, table-driven sobre os 12 | - |
| lado do gol (2) | usuário C7 · C8 · adversário C7 | - |
| partidas da rodada (2) | a do usuário C8 · outra C8 | - |
| estado do relógio (4) | `running` C9 · `halftime` C9 · `paused` C9 · fim C9 | - |
| efeitos com variantes (3) | `crowd-roar` C10 · `crowd-groan` C10 · `crowd-ooh` C10 | - |
| borda de 400 ms (3) | 399 ms C11 · 400 ms C11 · tipo diferente C11 | - |
| `Phase` → contexto (12) | C15, table-driven sobre as 12 | - |
| contextos (4) | abertura C5 · gestão C16 · fim de temporada C17 · nenhum C13 | - |
| bordas do silêncio (2) | 30 s C18 · 90 s C18 | - |
| contextos por número de faixas (2) | 3 faixas C19 · 1 faixa C19 | - |
| falha da faixa (2) | download C22 · decodificação C22 | - |
| faixas (5) | C23, table-driven sobre as 5 | - |
| doors (3) | door 1 C2 · C3 · door 2 C24 · C25 · C26 · door 3 C23 | - |

- Nenhum check afirma mais do que o caso que a prova exercita. O timbre dos efeitos (se soa como 16 bits) não é afirmável por teste: fica para o autor ouvir no navegador depois do build.

## Swept

- validation: C3 - valor gravado inválido ou de tipo errado
- failure modes: C22, C26 - faixa que falha e navegador sem Web Audio
- idempotency: C21 - cada faixa é baixada no máximo uma vez
- authorization: n/a - jogo local de um jogador, sem conta
- concurrency: C11, C17 - efeitos empilhados em 4× e troca de contexto durante o fade
- data lifecycle: n/a - a preferência vive até o usuário limpar os dados do navegador; nada expira nem migra
- dependency failure: C22, C26 - arquivo ausente e `AudioContext` ausente
- state transitions: C9, C13, C17 - relógio da partida e troca de contexto
- observability: n/a - sem log; a falha de faixa é silenciosa por decisão do plano (AC 21)

## Handoff

- Arquivos existentes lidos e mudados: `App.tsx`, `Home.tsx`, `Live.tsx`, `store.ts` (só leitura), `engine/rng.ts` e `engine/types.ts` (só leitura), `styles.css` (botões do top strip), `app.test.tsx`, `Live.test.tsx`, `Home.test.tsx`, `deps.test.ts`: 128 KB → ~32k
- Código e testes novos (`src/audio`: backend, preferências, efeitos sintetizados, música, e os três arquivos de teste) ≈ 50 KB → ~13k
- Por fatia: S1 ≈ 15k; S2 em 34k acumulado; S3 em 45k. Total ≈ 45k, abaixo do budget de 150k: one builder
- Ordem: começa depois de paises verificada, porque paises mexe em `app.test.tsx` e nas telas
- O build entrega sem as 5 faixas reais (pergunta aberta 1 do plano); os testes usam o backend falso e não precisam dos arquivos
