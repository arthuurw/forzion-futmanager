# Carreira dinâmica - checks

Profile: light
Plan: `.specs/features/carreira-dinamica/plan.md`

20 checks in 6 slices · 2 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`). Telas usam `@testing-library/react` em jsdom, e o IndexedDB é `fake-indexeddb`. O layout usa `npm run check:layout` (Chrome headless).

Regras dos testes:
- Todo valor esperado é literal ou calculado no próprio teste, nunca pela função de produção sob teste (L-004). `strengthRanking`, `jobOffers`, `boardGoalFor`, `autoLineup` e `createRng`/`mix32` já têm prova própria e podem montar o esperado.
- Toda tabela cobre o conjunto inteiro (L-005).

Lições aplicadas:
- L-003: aviso, demissão e proposta provados também pelo `finishRound`, e a troca pela store.
- L-005: reputação, janela de rodadas e zonas de demissão em tabela.
- L-006: a regra das propostas nomeia teto, janela de 8 e o caso sem candidato, com fixture em que o clube 9º da janela e o clube mais forte que o teto ficam de fora.
- L-007: fixtures com o membro excluído: entrada de `history` sem `userClubId`, sexta temporada mais antiga, `CareerMove` offer, data de copa, id fora de `clubIds`.
- L-008: textos de tela afirmados exatos onde são renderizados.
- L-009: door achada no build ganha check antes de fechar.

## Checks

### S1 - Reputação do técnico · 3 files · 30 KB · ~8k

**C1** - `managerReputation(state)` (AC 1), tabela:
- `history` vazio e sem `career` → 50;
- um «met» → 56; um «missed» → 47; um «fired» → 42;
- «met» com título da Série A (`tier` 0) → 64; «met» com título da Série B (`tier` 1) → 60;
- «met» com a copa nacional → 62; «met» com a continental → 66;
- 3 «met» e um título da Série A → 76;
- 6 «met»: só as 5 últimas contam → 80;
- uma entrada com `userClubId` null no meio → ignorada;
- `career` com um `fired` da temporada atual → −8; um `fired` de temporada passada e um `offer` da atual → 0;
- 5 «fired» e 2 `fired` da temporada atual em `career` → 0 (piso, 50 − 40 − 16); 5 «met», cada um com a liga da Série A e a continental → 100 (teto, 50 + 5 × 24).
Proof: `npx vitest run src/engine/career.test.ts -t "reputação: tabela"`

**C2** - A História de um save com 3 «met» e um título da Série A mostra «Reputação: 76/100» (AC 2).
Proof: `npx vitest run src/ui/History.test.tsx -t "reputação e carreira"`

### S2 - A diretoria avisa e demite · 6 files · 90 KB · ~23k

**C3** - `boardAfterRound(state, n)` numa liga de 38 rodadas (AC 3, AC 4), tabela sobre a janela e as zonas:
- na zona (meta 8, posição 13), `boardWarnings` 1: rodada 9 → 0; rodada 10 → 2; rodada 34 → 2; rodada 35 → 0;
- fora da zona (meta 8, posição 12), `boardWarnings` 2, rodada 12 → 0;
- zona de rebaixamento (Série A, meta 16, posição 17), rodada 12, `boardWarnings` 0 → 1;
- último de liga sem rebaixamento (Liga Argentina, meta 17, posição 20), rodada 12 → 1;
- `boardWarnings` ausente conta como 0.
Proof: `npx vitest run src/engine/career.test.ts -t "avisos da diretoria: tabela"`

**C4** - Com `boardWarnings` 3 e a quarta rodada na zona, `boardAfterRound` grava `pendingJob = { reason: "fired", clubIds }`, com `clubIds` = os 3 clubes logo abaixo do usuário em `strengthRanking` de todos os clubes, e `boardWarnings` volta a 0 (AC 5).
Proof: `npx vitest run src/engine/career.test.ts -t "quarta rodada demite"`

**C5** - Pelo `finishRound` (L-003): um save na rodada 13 com `boardGoal` 1, `boardWarnings` 3 e o usuário fora dos 5 primeiros depois da rodada fecha com `pendingJob.reason` «fired». `finishCupDate` de uma data de copa mantém o `boardWarnings` de antes (2 → 2) (AC 5, AC 9).
Proof: `npx vitest run src/engine/career.test.ts -t "finishRound checa a diretoria"`

**C6** - As telas Rodada e Elenco mostram, com `boardWarnings` 1, 2 e 3, «Aviso da diretoria (1/3): a campanha está abaixo do aceitável.» (e 2/3, 3/3). Com 0 e com o campo ausente, não mostram aviso (AC 6).
Proof: `npx vitest run src/ui/Round.test.tsx -t "aviso da diretoria"`
Proof: `npx vitest run src/ui/Squad.test.tsx -t "aviso da diretoria"`

**C7** - Pela store: jogar a rodada que demite abre a fase `"job"`. A tela mostra o título «Demitido», «Você foi demitido do <clube> na rodada 13.», «Reputação: N/100» e 3 botões «Assumir», um por clube, com «<nome> · <divisão> · força <x.x>» (AC 2, AC 7).
Proof: `npx vitest run src/ui/Job.test.tsx -t "tela demitido"`

**C8** - Com `pendingJob` fired: `playRound` não muda o jogo nem a fase, e um save reaberto com a marca vai de «Continuar» para a tela «Demitido» (AC 8).
Proof: `npx vitest run src/store.test.ts -t "demitido trava o calendário"`

### S3 - Trocar de clube no meio · 4 files · 80 KB · ~20k

**C9** - `takeJob(state, clubId)` com `clubId` em `pendingJob.clubIds`, depois da rodada 13 da temporada 2 (AC 10-13):
- `userClubId` = `clubId`, `pendingJob` ausente, `boardWarnings` 0;
- `career` termina em `{ season: 2, round: 13, fromId: <antigo>, toId: clubId, reason: "fired" }`;
- clube antigo: `lineup` null, sem `training`, `forSale` `[]`; `market.offers` `[]`;
- clube novo: `lineup` igual a `autoLineup(clube, AI_FORMATION, "balanced", 0, nextCompetition(state))`;
- `boardGoal`: posição atual 18 com meta pela força 16 → 18; posição atual 5 com meta pela força 12 → 12;
- `cupGoal` −1.
Proof: `npx vitest run src/engine/career.test.ts -t "assumir no meio da temporada"`

**C10** - `takeJob` com um id fora de `pendingJob.clubIds`, com o id do próprio clube e sem `pendingJob` devolve `{ ok: false }` e o estado igual (AC 14).
Proof: `npx vitest run src/engine/career.test.ts -t "assumir clube fora da lista"`

**C11** - Pela store: «Assumir» grava o save com o `userClubId` novo (lido de volta por `loadGame`) e abre o Elenco com o nome do clube novo (AC 10, AC 15).
Proof: `npx vitest run src/store.test.ts -t "assumir grava e abre o elenco"`

### S4 - Propostas de clubes melhores · 7 files · 120 KB · ~30k

**C12** - `reputationOffers(state, round)` num jogo de 80 clubes, com o usuário no 30º em força (AC 16):
- reputação 90 → teto 8: 2 ids distintos, ambos entre o 8º e o 15º do ranking; nenhum é o 16º nem o 7º;
- o resultado é o do sorteio com `createRng(mix32(mix32(rngState, 0xca), season * 64 + round))` escrito no teste, e o `rngState` do estado não muda;
- reputação 50 → teto 40, sem candidato → `[]`;
- reputação 100 → teto 1;
- com 1 candidato só (usuário no 9º, reputação 90) → 1 id.
Proof: `npx vitest run src/engine/career.test.ts -t "propostas por reputação"`

**C13** - Pelo `finishRound` (L-003), numa liga de 38 rodadas (AC 17):
- rodada 19 fechando com posição ≤ meta e reputação 90 → `pendingJob = { reason: "offer", clubIds: reputationOffers(estado, 19) }`;
- rodadas 18 e 20 → sem proposta;
- posição > meta → sem proposta;
- reputação 50 (sem candidato) → sem proposta;
- `pendingJob` fired já presente → fica igual.
Proof: `npx vitest run src/engine/career.test.ts -t "proposta na rodada do meio"`

**C14** - Uma data de liga e uma de copa que fecham com `pendingJob` offer apagam o campo, e `userClubId` não muda (AC 19).
Proof: `npx vitest run src/engine/career.test.ts -t "jogar recusa a proposta"`

**C15** - Nas telas Rodada e Elenco, com `pendingJob` offer de 2 clubes, aparece o painel «Proposta de emprego» com 2 botões «Aceitar» e um «Recusar». «Recusar» grava o save sem `pendingJob` e mantém o clube. «Aceitar» no segundo grava o `userClubId` dele e abre o Elenco dele (AC 18, AC 19).
Proof: `npx vitest run src/ui/Round.test.tsx -t "proposta de emprego"`
Proof: `npx vitest run src/ui/Squad.test.tsx -t "proposta de emprego"`

**C16** - Virada (AC 20-22):
- `seasonReview` com «met» e reputação 90 devolve `jobOffers` = `reputationOffers(estado, 38)`; com «missed» → `[]`; com «fired» → os 3 de `jobOffers` de board;
- `nextSeason` com uma proposta de «met» assume o clube depois da virada e anota `{ season, round: 38, fromId, toId, reason: "offer" }`;
- sem proposta, mantém o clube e não anota;
- demitido, anota com `reason: "fired"`;
- um id fora da lista lança erro, como hoje na demissão.
Proof: `npx vitest run src/engine/career.test.ts -t "propostas da virada"`

**C17** - O Fim da temporada com «met» e 2 propostas mostra «Propostas de emprego» com os 2 clubes, e «Próxima temporada» fica habilitado sem seleção. Sem seleção, a virada mantém o clube. Selecionando o primeiro, a virada abre a «Nova temporada» com ele (AC 20, AC 21).
Proof: `npx vitest run src/ui/End.test.tsx -t "propostas com a meta cumprida"`

### S5 - Carreira na História · 2 files · 20 KB · ~5k

**C18** - A História lista «Carreira», mais antiga primeiro (AC 23, AC 24):
- «Temporada 2, rodada 13: demitido do <X>, assumiu o <Y>» (fired);
- «Temporada 3, rodada 38: trocou o <Y> pelo <Z>» (offer);
- com `career` vazio e com ele ausente: «Nenhuma troca de clube ainda.».
Proof: `npx vitest run src/ui/History.test.tsx -t "reputação e carreira"`

### S6 - Saves de antes e layout · 4 files · 40 KB · ~10k

**C19** - Save antigo e importação (AC 25, AC 26):
- um jogo v8 sem `boardWarnings`, `pendingJob` e `career` joga as 38 rodadas e vira a temporada sem erro;
- `decodeSaveFile` recusa como «malformed» um save com `pendingJob.clubIds` contendo um id inexistente ou o `userClubId`;
- aceita um com `clubIds` válidos, e um sem `pendingJob`.
Proof: `npx vitest run src/engine/career.test.ts -t "save antigo sem os campos"`
Proof: `npx vitest run src/engine/saveFile.test.ts -t "proposta pendente no arquivo"`

**C20** - `npm run check:layout` sai 0: a temporada inteira é jogada. A tela «Demitido», quando aparece, é medida como `job` e segue por «Assumir». O painel de proposta, quando aparece, segue por «Recusar». Nenhuma tela medida rola (AD-010).
Proof: `npm run check:layout`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| pesos da reputação (8) | met C1 · missed C1 · fired C1 · liga tier 0 C1 · liga tier 1 C1 · copa nacional C1 · continental C1 · career fired C1 | - |
| limites da reputação (4) | piso 0 C1 · teto 100 C1 · janela de 5 C1 · sem clube ignorado C1 | - |
| janela de rodadas (4 bordas) | 9 C3 · 10 C3 · 34 C3 · 35 C3 | - |
| zonas de demissão (3) | meta + 5 C3 · rebaixamento C3 · último sem rebaixamento C3 | - |
| resultado dos avisos (3) | soma C3 · zera C3 · demite C4, C5 | - |
| tipo de data (2) | liga C5, C13 · copa C5, C14 | - |
| telas do aviso (2) | Rodada C6 · Elenco C6 | - |
| efeitos da troca (6) | usuário/marca/avisos C9 · carreira C9 · clube antigo C9 · escalação nova C9 · meta C9 · copa −1 C9 | - |
| troca recusada (3) | fora da lista C10 · próprio clube C10 · sem pendingJob C10 | - |
| regra das propostas (4) | teto e janela de 8 C12 · sorteio e rngState C12 · sem candidato C12 · 1 candidato C12 | - |
| gatilhos da proposta no meio (5) | rodada do meio C13 · outras rodadas C13 · fora da meta C13 · sem candidato C13 · fired presente C13 | - |
| respostas à proposta (3) | aceitar C15 · recusar C15 · jogar C14 | - |
| telas da proposta (3) | Rodada C15 · Elenco C15 · Fim C17 | - |
| veredito da virada (3) | met C16, C17 · missed C16 · fired C16 | - |
| motivo em `career` (2) | fired C9, C16 · offer C16 | - |
| linhas da carreira (3) | fired C18 · offer C18 · vazia C18 | - |
| doors (2) | door 1 C9, C16, C19 · door 2 C12 | - |

- Nenhum check afirma mais do que o caso que a prova exercita.
- C20 mede a tela `job` só quando a seed a alcança; a forma da tela é provada por C7.

## Superseded checks of earlier features

| Check | What changes | Now proven by |
| --- | --- | --- |
| multiplas-temporadas / paises (`SeasonReview.jobOffers` = `[]` sem demissão) | com «met» e reputação que alcança um clube mais forte, `jobOffers` traz as propostas por reputação; «missed» continua `[]` e «fired» continua com as 3 de board | C16 |

Regra para os outros testes existentes: um teste antigo que joga uma temporada com usuário pode ter a **fixture** ajustada (ex.: `boardGoal` alto para não demitir), sem mudar valor esperado. Mudar um valor esperado fora da linha acima ganha linha nova nesta tabela, marcada _achado na build_, antes do código que a fecha.

## Swept

- validation: C10, C19
- failure modes: existing - `persist` mostra a falha de gravação como nas outras ações da store; C8 trava o calendário até a escolha
- idempotency: C10 - assumir de novo, sem `pendingJob`, é recusado
- authorization: n/a - jogo local de um jogador só, sem contas
- concurrency: existing - AD-020, uma aba por vez; a troca é uma escrita da fila `persist`
- data lifecycle: C9, C14, C16 - `career` só cresce; `pendingJob` offer some na data seguinte; `boardWarnings` zera na troca
- dependency failure: n/a - nada externo; IndexedDB já coberto pela store
- state transitions: C3, C4, C9, C14, C16
- observability: n/a - jogo offline sem telemetria

## Handoff

- S1-S6 ≈ 363 KB dos arquivos tocados (`wc -c`) + ~30 KB novos (`career.ts`, `career.test.ts`, `Job.tsx`, `Job.test.tsx`) ≈ 393 KB / 4 ≈ 98k, abaixo do budget de 150k - one builder
