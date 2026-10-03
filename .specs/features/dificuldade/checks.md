# Nível de dificuldade - checks

Profile: light
Plan: `.specs/features/dificuldade/plan.md`

8 checks in 3 slices · 1 one-way door · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`); layout `npm run check:layout`.

Lições aplicadas: L-001 (o nível lido do jogo gravado no IndexedDB), L-003 (pela tela, até a store e o save), L-005 (níveis e divisões em tabela), L-008 (textos exatos), L-018 (fixtures em que os três níveis dão resultados diferentes), L-029 (cada prova falha no código de antes), L-030 (C6 prende comportamento que já existe: o jogo Normal igual ao de hoje), L-031 (provas de ausência afirmam a pré-condição).

## Checks

### S1 - Escolher o nível · 4 files · ~75 KB · ~19k

**C1** - A tela «Escolher clube» tem o grupo «Dificuldade» com os rádios «Fácil», «Normal» e «Difícil», nessa ordem, «Normal» marcado; a frase abaixo é, ao marcar cada um, em tabela: Fácil «Mais caixa no começo, diretoria mais paciente e IA comprando menos.»; Normal «O jogo de sempre.»; Difícil «Menos caixa no começo, diretoria exigente e IA comprando mais.» (AC 1).
Proof: `npx vitest run src/ui/ChooseClub.test.tsx -t "campo dificuldade"`

**C2** - Marcar «Difícil» e escolher um clube grava no IndexedDB o jogo com `difficulty: "hard"`; sem mexer no grupo, o jogo gravado tem `difficulty: "normal"` (AC 2).
Proof: `npx vitest run src/ui/ChooseClub.test.tsx -t "dificuldade gravada"`

**C3** - O caixa do clube escolhido, em tabela pelo nível, a partir do caixa gerado C: Fácil → 2 × C, Normal → C, Difícil → C / 2 arredondado a R$ 100.000; o caixa de outro clube continua igual nos três (AC 3).
Proof: `npx vitest run src/ui/ChooseClub.test.tsx -t "caixa pela dificuldade"`

### S2 - O nível pesa a temporada · 6 files · ~170 KB · ~43k

**C4** - `userBoardGoal`, em tabela por nível e posição de força (AC 4): Série A 5º → Fácil 10, Normal 8, Difícil 6, sem nível 8; Série A 14º → Fácil 16, Normal 16, Difícil 15; Série B 2º → 4 nos três; Série B 10º → Fácil 15, Normal 13, Difícil 11; liga sem rebaixamento 15º → Fácil 17, Normal 17, Difícil 16.
Proof: `npx vitest run src/engine/board.test.ts -t "folga da meta pela dificuldade"`

**C5** - Num jogo Difícil, a meta da nova temporada depois de `nextSeason` e a meta depois de `takeJob` no meio da temporada são as de folga 1 (iguais a `userBoardGoal` do mesmo jogo em Difícil e diferentes do mesmo jogo em Normal) (AC 4).
Proof: `npx vitest run src/engine/board.test.ts -t "meta difícil na virada e na troca"`

**C6** - Num mundo em que todo clube da IA tem um candidato e dinheiro (`everyoneBuys`), os clubes que compram numa rodada de janela são exatamente os de sorteio < 0,15 no Fácil, < 0,25 no Normal e sem nível, e < 0,35 no Difícil, com o mesmo sorteio da door 3 de gastos-da-ia; os três conjuntos são diferentes (AC 5).
Proof: `npx vitest run src/engine/market.test.ts -t "chance de compra pela dificuldade"`

**C7** - O mesmo jogo, jogado 3 rodadas com `playRound` sem `difficulty` e com `difficulty: "normal"`, chega ao mesmo estado (sem o campo `difficulty`) (AC 6, L-030).
Proof: `npx vitest run src/engine/board.test.ts -t "normal joga como antes"`

### S3 - Ver o nível · 2 files · ~35 KB · ~9k

**C8** - Em «Jogos salvos», com jogos Fácil no espaço 1, sem nível no 2 e Difícil no 3, os resumos terminam em « · Fácil», « · Normal» e « · Difícil», depois de «Temporada <n>» (AC 7); e `npm run check:layout` mede `chooseClub` com o grupo «Dificuldade» dentro da janela, terminando em «layout: as 23 telas cabem em 400 × 700 px» (AC 8).
Proof: `npx vitest run src/ui/Saves.test.tsx -t "nível no resumo"`
Proof: `npm run check:layout`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| níveis (3) | Fácil C1 C3 C4 C6 C8 · Normal C1 C2 C3 C4 C6 C7 C8 · Difícil C1 C2 C3 C4 C5 C6 C8 | - |
| caminhos da meta (3) | escolha do clube C4 · virada C5 · troca de clube C5 | - |
| casos da meta (5) | Série A no meio C4 · Série A no teto C4 · Série B «subir» C4 · Série B no meio C4 · liga sem rebaixamento C4 | - |
| ausência do nível (3) | meta C4 · chance da IA C6 · resumo C8 | - |
| efeitos do nível (3) | caixa C3 · meta C4 · compra da IA C6 | - |

- No check names a status code, route or response shape.

## Swept

- validation: n/a - o rádio só oferece os três níveis
- failure modes: n/a - nenhuma ação nova que falhe
- idempotency: n/a - o nível é gravado uma vez, na escolha do clube
- authorization: n/a - jogo local, sem contas
- concurrency: existing - a gravação da escolha passa pela fila da store (`src/store.ts` `persist`), como hoje
- data lifecycle: C7 (um save sem nível joga como Normal)
- dependency failure: n/a - nada externo
- state transitions: C2, C5 (escolha; virada e troca de clube)
- observability: n/a - sem log

## Handoff

- S1 = `ChooseClub.tsx` 3 KB + `ChooseClub.test.tsx` ~5 KB + `store.ts` 36 KB + `types.ts` 13 KB ≈ 57 KB / 4 ≈ 14k; S2 entra no motor (`board.ts` 6 KB, `board.test.ts` 10 KB, `market.ts` 30 KB, trecho de `market.test.ts` 80 KB, `rollover.ts` 15 KB, `career.ts` 7 KB) a ~51k; S3 entra em `Saves.test.tsx` 12 KB e `layout-check.mjs` 27 KB a ~61k, abaixo do budget de 150k - one builder
