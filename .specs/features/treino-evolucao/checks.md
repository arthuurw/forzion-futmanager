# Treino e evolução - checks

Profile: light
Plan: `.specs/features/treino-evolucao/plan.md`

18 checks in 3 slices · 3 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`). Telas usam `@testing-library/react` em jsdom, e o IndexedDB é `fake-indexeddb`.

Regras dos testes:
- Todo valor esperado é literal ou calculado no próprio teste, nunca pela função de produção sob teste (L-004).
- Toda tabela cobre o conjunto inteiro (L-005).
- O sorteio da evolução é provado com um `Rng` falso de valores escolhidos, então cada limiar é exercitado dos dois lados.

Lições aplicadas:
- L-003: a evolução e o custo do treino são provados também pelo ponto de entrada (`finishRound`, `applyRound`, `sideFor`, store).
- L-005: tabela por faixa de idade, por intensidade e por jogou/não jogou.
- L-006: a regra de sorteio nomeia os três resultados (sobe, desce, fica) e os dois limites (95 e 40).
- L-007: fixtures com o membro excluído: clube sem `training`, jogador que não entrou em campo, data de copa.
- L-008: textos de tela afirmados exatos onde são renderizados.
- L-009: door achada no build ganha check antes de fechar.

## Checks

### S1 - O rating evolui durante a temporada · 6 files · 110 KB · ~28k

**C1** - ✓ `evolutionChances(age, training, played, rounds)` com `training` Normal, `played` verdadeiro e `rounds` 38 devolve, por faixa (AC 1, AC 2; quem jogou sobe × 1,3, calibrado no build):

| Idade (amostras) | up | down |
| --- | --- | --- |
| 17, 20 | 2,5 × 1,3/38 | 0 |
| 21, 23 | 1,5 × 1,3/38 | 0 |
| 24, 27 | (1/3) × 1,3/38 | (1/3)/38 |
| 28, 30 | 0 | 1/38 |
| 31, 33 | 0 | 2,5/38 |
| 34, 36 | 0 | 4/38 |

Com `rounds` 30, a mesma idade 19 dá up 2,5 × 1,3/30.
Proof: `npx vitest run src/engine/training.test.ts -t "chances por idade: tabela"`

**C2** - ✓ Para idade 19 e 32, `rounds` 38 (AC 3, AC 8):
- up de 19 para quem jogou (× 1,3): Leve 1,25 × 1,3/38, Normal 2,5 × 1,3/38, Forte 3,75 × 1,3/38, `training` ausente 2,5 × 1,3/38; sem ter jogado, × 0,65 no lugar de × 1,3 (metade);
- down de 32 é 2,5/38 nas 8 combinações de treino e jogou.
Proof: `npx vitest run src/engine/training.test.ts -t "treino e minutos: tabela"`

**C3** - ✓ `evolveRound` com um `Rng` falso, para um jogador de 25 anos que jogou, em Normal, com `rounds` 1 (up 1/3 × 1,3 ≈ 0,433, down 1/3) (AC 1, AC 4, AC 5):
- sorteio 0,2 → rating +1 e `ratingLog` termina em `{ round: 7, delta: 1 }`;
- sorteio 0,5 → rating −1 e `ratingLog` termina em `{ round: 7, delta: -1 }`;
- sorteio 0,8 → rating igual e `ratingLog` igual;
- rating 95 com sorteio 0,2 → fica 95 e sem anotação;
- rating 40 com sorteio 0,5 → fica 40 e sem anotação;
- um sorteio por jogador, na ordem clubes → jogadores.
Proof: `npx vitest run src/engine/training.test.ts -t "sorteio sobe, desce ou fica"`

**C4** - ✓ `finishRound` de uma rodada da liga (L-003): todo jogador cujo rating mudou tem a última anotação `{ round: <número da rodada>, delta: <a diferença> }`; houve mudança em pelo menos 2 ligas; a lista de mudanças é exatamente a de `evolveRound` aplicada com `createRng(mix32(mix32(rngState, 0x7e), n * 16 + d))` escrito no teste, sobre os clubes depois da condição e com os que entraram em campo na rodada (door 3); o `rngState` novo é o de `createRng(rngState)` depois de um `next()` (AC 7).
Proof: `npx vitest run src/engine/training.test.ts -t "rodada da liga evolui pelo finishRound"`

**C5** - ✓ `finishCupDate` de uma data de copa não muda o rating nem o `ratingLog` de jogador nenhum (AC 6).
Proof: `npx vitest run src/engine/training.test.ts -t "data de copa não evolui"`

**C6** - ✓ `nextSeason` (AC 9):
- todo jogador que continua em clube tem o mesmo rating de antes da virada;
- o `ratingLog` de todo jogador (clubes, livres, juniores) fica vazio;
- o `rngState` novo é o de `createRng(rngState)` depois de um `next()`;
- aposentadorias continuam por idade (o teste existente «aposentadoria por idade» continua verde).
Proof: `npx vitest run src/engine/rollover.test.ts -t "virada sem delta de idade"`
Proof: `npx vitest run src/engine/rollover.test.ts -t "aposentadoria por idade"`

**C7** - ✓ `nextSeason` continua sorteando pelo próprio fluxo `createRng(mix32(rngState, 0x5E45 + season))`: dois estados que só diferem em `rngState` geram viradas diferentes (juniores e livres novos), e os mesmos jogadores se aposentam com o sorteio da idade consumido antes, como antes da feature (AC 9).
Proof: `npx vitest run src/engine/rollover.test.ts -t "virada usa o próprio Rng"`

**C8** - ✓ A força média fica estável com a evolução por rodada (AC 10): a média dos 18 melhores de cada clube das ligas do Brasil a até 5 pontos da temporada 1 em 5 temporadas, e da Série A em 20 temporadas (seed 5).
Proof: `npx vitest run src/engine/balance.test.ts -t "força estável em 5 temporadas"`
Proof: `npx vitest run src/engine/balance.test.ts -t "força estável em 20 temporadas"`

**C18** - ✓ _achado na build_ - Os guardas de economia continuam valendo com a evolução por rodada (AC 10): «caixa em 5 temporadas» com o maior caixa de clube até 18× o inicial (era 15×, decisão do autor em 29/09/2026) e mediana de 2× a 6,5×; «caixa da IA limitado em 20 temporadas» com a mediana até 20× o inicial.
Proof: `npx vitest run src/engine/balance.test.ts -t "caixa em 5 temporadas"`
Proof: `npx vitest run src/engine/balance.test.ts -t "caixa da IA limitado em 20 temporadas"`

### S2 - O treino custa físico e lesão · 4 files · 60 KB · ~15k

**C9** - ✓ `applyRound` recupera o físico pelo treino do clube (AC 11), tabela com as 6 combinações a partir de físico 50: descansou Leve 90, Normal 80, Forte 70; jogou (físico ao apito 50) Leve 75, Normal 65, Forte 55. Com físico 95 descansando em Leve fica 100; com físico 0 ao apito, jogando em Forte, fica 5. Clube sem `training` recupera como Normal.
Proof: `npx vitest run src/engine/condition.test.ts -t "recuperação pelo treino: tabela"`

**C10** - ✓ `injuryChance(training)` devolve 0,00125 × 0,8 (Leve), 0,00125 (Normal), 0,00125 × 1,3 (Forte) e 0,00125 com `training` ausente (AC 12).
Proof: `npx vitest run src/engine/live.test.ts -t "chance de lesão pelo treino"`

**C11** - ✓ `sideFor` copia `club.training` para o lado da partida (Forte → `"hard"`; ausente → Normal). Uma partida inteira com o lado em Forte ou Leve, numa seed sem lesão em nenhuma das duas, tem os mesmos eventos e o mesmo `rngState` que em Normal (mesmo número de sorteios); numa seed com lesão, Forte lesiona onde o sorteio fica entre 0,00125 e 0,001625, e Normal não (AC 12).
Proof: `npx vitest run src/engine/live.test.ts -t "treino na partida"`

### S3 - O usuário escolhe e vê · 6 files · 95 KB · ~24k

**C12** - ✓ `setTraining("hard")` grava `Club.training = "hard"` no clube do usuário, no estado e no save; ao reabrir o jogo, o Elenco mostra «Forte» no seletor «Treino» (AC 13).
Proof: `npx vitest run src/store.test.ts -t "treino gravado"`

**C13** - ✓ No Elenco, o seletor «Treino» tem as opções «Leve», «Normal», «Forte», nessa ordem; escolher cada uma chama o gravador com `"light"`, `"normal"`, `"hard"` e mostra a linha exata (AC 13, AC 14):
- Leve «Recupera mais o físico e evolui menos.»;
- Normal «Equilíbrio entre físico e evolução.»;
- Forte «Evolui mais, recupera menos o físico e lesiona mais.».
Clube sem `training` mostra «Normal».
Proof: `npx vitest run src/ui/Squad.test.tsx -t "seletor de treino"`

**C14** - ✓ No Elenco (AC 15, AC 16):
- um jogador com `ratingLog` `[{round: 3, delta: -1}, {round: 14, delta: 1}]` mostra «▲» com rótulo acessível «+1 na rodada 14»;
- um com `[{round: 20, delta: -1}]` mostra «▼» com «−1 na rodada 20»;
- um com `ratingLog` vazio e um sem o campo não mostram seta.
Proof: `npx vitest run src/ui/Squad.test.tsx -t "seta de evolução"`

**C15** - ✓ O relatório da virada tem, para cada jogador do usuário que ficou, `before` = rating − soma do `ratingLog` da temporada e `after` = rating: um jogador de 70 com `[+1, +1, −1]` dá 69 → 70; um sem mudança dá 70 → 70 (AC 17).
Proof: `npx vitest run src/engine/rollover.test.ts -t "relatório da temporada pelo ratingLog"`

**C16** - ✓ A tela «Nova temporada» mostra «Antes» e «Depois» do relatório (o teste existente continua verde).
Proof: `npx vitest run src/ui/NewSeason.test.tsx -t "mostra aposentados contratos evolução e meta"`

**C17** - ✓ Um save v8 sem `training` e sem `ratingLog` abre, joga uma rodada e vira a temporada sem erro, com o clube em Normal (AC 8, door 1, door 2).
Proof: `npx vitest run src/engine/training.test.ts -t "save antigo sem os campos"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| faixas de idade (6) | C1, table-driven over all 6 | - |
| intensidades, com ausente (4) | Leve C2 · Normal C2 · Forte C2 · ausente C2 | - |
| jogou (2) | jogou C2 · não jogou C2 | - |
| resultado do sorteio (3) | sobe C3 · desce C3 · fica C3 | - |
| limites do rating (2) | 95 C3 · 40 C3 | - |
| tipo de data (2) | liga C4 · copa C5 | - |
| recuperação por treino, com ausente (7) | C9, table-driven over all 7 | - |
| lesão por treino, com ausente (4) | C10, table-driven over all 4 | - |
| textos do treino (3) | Leve C13 · Normal C13 · Forte C13 | - |
| seta (4 estados) | ▲ C14 · ▼ C14 · vazio C14 · ausente C14 | - |
| doors (3) | door 1 C12, C17 · door 2 C4, C6, C17 · door 3 C4, C7 | - |

- Nenhum check afirma mais do que o caso que a prova exercita.

## Superseded checks of earlier features

| Check | What changes | Now proven by |
| --- | --- | --- |
| multiplas-temporadas C21 (`rollover.test.ts` «evolução por idade», AC 16) | a virada não soma mais delta de idade; a tabela `EVOLUTION` vira a fonte das chances por rodada. O teste passa a afirmar delta 0 na virada para toda faixa | C1, C6 |
| gastos-da-ia C19 / correcoes-validacao C34 (`balance.test.ts` «caixa em 5 temporadas», máximo 15×) - _achado na build_ | o máximo de um clube passa a 18×: com a evolução por rodada o clube do topo fica entre 15,2× e 17,3× conforme a calibração (antes 14,84×); a mediana 2× a 6,5× não muda. Decisão do autor em 29/09/2026 | C18 |
| paises C8 (`live.test.ts` «semente das ligas novas», snapshot v6 da rodada 2) - _achado na build_ | só a fixture: a evolução da rodada 1 é desfeita antes da rodada 2, que volta a jogar com os ratings do snapshot; nenhum valor esperado muda | C4 |
| multiplas-temporadas C17 (`NewSeason.test.tsx` «mostra aposentados contratos evolução e meta», coluna «Antes») - _achado na build_ | «Antes» passa a ser o rating do começo da temporada (rating − soma do `ratingLog`), como o `Impact` do plano define; «Depois» não muda | C15, C16 |
| `End.test.tsx` «resumo da temporada», «Campeão: X» único - _achado na build_ | com os resultados mudados pela evolução, o campeão da Série A também ganhou uma copa e o card dela lê a mesma linha; o teste passa a contar uma linha por título, com os títulos de copa lidos das finais | fixture |
| multiplas-temporadas C19 (`rollover.test.ts` «virada usa o próprio Rng», door 3) | os deltas dos 8 jogadores de 22 anos passam a ser 0; a prova do fluxo próprio passa a ser a virada diferente com outro `rngState` e o `rngState` avançado uma vez | C7 |

Regra para os outros testes existentes: um teste antigo que fecha rodadas e compara força, preço ou escalação pode ter a **fixture** ajustada (ex.: `ratingLog`/rating fixos), sem mudar valor esperado. Mudar um valor esperado fora das linhas acima ganha linha nova nesta tabela, marcada _achado na build_, antes do código que a fecha.

## Swept

- validation: C13 - o seletor só oferece os três valores; C17 - campos ausentes valem Normal e lista vazia
- failure modes: C12 - gravar o treino passa pelo `editLineup`, que já mostra a falha de gravação existente
- idempotency: C4 - a mesma rodada, do mesmo estado, gera as mesmas mudanças (fluxo por rodada e liga)
- authorization: n/a - jogo local sem conta
- concurrency: n/a - a escolha de treino entra na fila de gravação existente (`writeQueue`), como formação e postura
- data lifecycle: C6 - `ratingLog` zerado na virada; C15 - lido antes de zerar
- dependency failure: n/a - sem dependência externa nova
- state transitions: C3, C6
- observability: C14, C16 - a evolução aparece na tela; SPA sem telemetria (AD-001)

## Handoff

- S1 = 28k (engine: training novo, season, rollover, types, testes), S2 entra na condição e na partida com 43k, S3 entra na store e nas telas com 67k no total, abaixo do budget de 150k - one builder

- **Settled mid-build:** fator de minutos calibrado de 1 / 0,5 para 1,3 / 0,65 (quem joga continua subindo o dobro): com 1 / 0,5 a força da Série A caía cerca de 2 pontos e a mediana de caixa da IA passava de 20× (34× em 20 temporadas); 1,5 / 0,75 passava da deriva de força (5,28); 1,4 / 0,7 deixava a deriva em 4,69. O máximo de 15× de «caixa em 5 temporadas» subiu a 18× por decisão do autor (C18)
