# Caixa de notícias - checks

Profile: light
Plan: `.specs/features/noticias/plan.md`

16 checks in 3 slices · 1 one-way door · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`); layout `npm run check:layout`.

Lições aplicadas: L-001 (telas abertas do IndexedDB onde o check fala do que foi gravado), L-003 (pela store, ao vivo), L-005 (tipos e textos em tabela), L-008 (textos exatos), L-018 (fixtures em que o item certo não é o primeiro nem o único), L-027 (as telas novas medidas com o conteúdo à vista), L-029 (cada prova falha no código de antes), L-030 (nenhuma prova aqui prende comportamento antigo: todas leem `news`, que não existe antes), L-031 (provas de ausência afirmam a pré-condição: a data tem o fato que não deve virar notícia).

## Checks

### S1 - As notícias no motor · 6 files · ~90 KB · ~23k

**C1** - `dateNews(antes, depois, data)` com o jogador A do usuário passando de `injuryRounds` 0 para 3 e o B de 2 para 1 (lesão que já existia) devolve uma única notícia `{ kind: "injury", playerName: <A>, rounds: 3 }`, com `season` e `date` da data (AC 1).
Proof: `npx vitest run src/engine/news.test.ts -t "notícia de lesão"`

**C2** - `dateNews`, em tabela (AC 2): `suspendedRounds` da liga de 0 para 2 → `{ kind: "suspension", rounds: 2 }` sem `cupId`; `cupDiscipline["cup-nat"].suspendedRounds` de 0 para 1 → `{ kind: "suspension", rounds: 1, cupId: "cup-nat" }`; `suspendedRounds` de 1 para 0 (cumpriu) → nenhuma notícia.
Proof: `npx vitest run src/engine/news.test.ts -t "notícia de suspensão"`

**C3** - `dateNews` de uma rodada 7 da liga com o `ratingLog` de A ganhando `{ round: 7, delta: 1 }` (força 71) e o de B já tendo `{ round: 6, delta: -1 }` de antes devolve só `{ kind: "rating", playerName: <A>, rating: 71, delta: 1 }` (AC 3).
Proof: `npx vitest run src/engine/news.test.ts -t "notícia de força"`

**C4** - `dateNews` com duas propostas da IA em `depois.market.offers` (clubes X e Y, valores R$ 1.200.000 e R$ 800.000, jogadores A e B do usuário) devolve duas `offer`, uma por proposta, com `clubId`, `amount` e `playerName` (AC 4).
Proof: `npx vitest run src/engine/news.test.ts -t "notícia de proposta"`

**C5** - `dateNews`, em tabela (AC 5, AC 6): `boardWarnings` de 1 para 2 → `{ kind: "board", warnings: 2 }`; de 2 para 2 → nenhuma `board`; `pendingJob` `{ reason: "offer", clubIds: [X, Y] }` que não havia antes → `{ kind: "job", clubIds: [X, Y] }`; o mesmo `pendingJob` já presente antes → nenhuma `job`.
Proof: `npx vitest run src/engine/news.test.ts -t "notícia da diretoria e de emprego"`

**C6** - `dateNews` de uma rodada 12 com 5 linhas em `depois.market.transfers` devolve `transfer` só para as compras da rodada 12 com um lado na divisão do usuário (2 linhas: comprador da divisão e vendedor da divisão), e nenhuma para uma compra da rodada 12 entre dois clubes de outra divisão, uma compra da rodada 11 e um `free` da rodada 12 (AC 7).
Proof: `npx vitest run src/engine/news.test.ts -t "notícia de transferência"`

**C7** - `dateNews` de uma data de copa, em tabela (AC 8): usuário vence na fase 2 de 6 → `{ kind: "cup", result: "advanced", phase: 2, opponentId }`; vence a última fase → `champion`; perde → `out`, com o adversário; uma data de copa sem confronto do usuário → nenhuma `cup`.
Proof: `npx vitest run src/engine/news.test.ts -t "notícia de copa"`

**C8** - Uma data com copa, lesão, suspensão, força, proposta, aviso, emprego e transferência devolve as notícias nessa ordem de tipos (AC 1-8).
Proof: `npx vitest run src/engine/news.test.ts -t "ordem das notícias"`

**C9** - `appendNews` com 58 notícias guardadas e 5 novas deixa 60: as 3 mais velhas saem e as 5 novas ficam no fim; `dateNews` sem clube do usuário devolve `[]` mesmo com propostas e lesões no jogo (AC 9).
Proof: `npx vitest run src/engine/news.test.ts -t "guarda as 60 mais novas"`

**C10** - `playRound` (motor), na primeira rodada que gera ao menos uma notícia (a evolução de força gera quase toda rodada), guarda no fim de `news` exatamente o que `dateNews` devolve para essa data; uma data de copa com o usuário jogada por `playDate` guarda a notícia `cup` dela (AC 9).
Proof: `npx vitest run src/engine/news.test.ts -t "fechamento guarda as notícias"`

**C11** - Pela store, a mesma data dá as mesmas notícias jogando ao vivo até o fim (`playRound` + `skipToEnd`) e reabrindo o jogo com a data ao vivo pendente (AD-019), iguais às do motor `playDate` para o mesmo jogo (AC 10).
Proof: `npx vitest run src/store.test.ts -t "notícias ao vivo e na reabertura"`

**C12** - `encodeSaveFile`/`decodeSaveFile` e `saveGame`/`loadGame` devolvem o jogo com `news` igual (door 1).
Proof: `npx vitest run src/engine/saveFile.test.ts -t "notícias atravessam o arquivo"`

### S2 - O texto e as telas · 7 files · ~70 KB · ~18k

**C13** - `newsText(notícia, jogo)`, em tabela com os textos exatos da AC 12: lesão (3 rodadas e 1 rodada), suspensão na liga e na copa, força subindo e caindo, proposta com valor formatado, diretoria, emprego com um e com dois clubes, transferência, copa classificado, campeão e eliminado (AC 12).
Proof: `npx vitest run src/ui/newsText.test.ts -t "texto das notícias"`

**C14** - A tela Rodada aberta do IndexedDB depois de uma data com 2 notícias dela e 3 de datas anteriores mostra a aba «Notícias (2)» e, no painel «Notícias», só as 2 frases da data, na ordem guardada; uma data sem notícia mostra «Nada de novo nesta data.» (AC 11).
Proof: `npx vitest run src/ui/Round.test.tsx -t "notícias da data"`

**C15** - A aba «Notícias» do Histórico mostra as notícias da mais nova para a mais velha, cada uma com «Temporada <n> · Rodada <r>» ou «Temporada <n> · <copa> · <fase>» e a frase; sem notícia, «Nenhuma notícia ainda.» (AC 13).
Proof: `npx vitest run src/ui/History.test.tsx -t "aba notícias"`

### S3 - As telas cabem · 1 file · ~26 KB · ~7k

**C16** - `npm run check:layout` (seed 1) sai 0 e mede 23 telas: as 21 de hoje, `roundNews` (a tela Rodada com a aba «Notícias» aberta e ao menos uma frase) e `historyNews` (o Histórico na aba «Notícias» com ao menos uma linha), cada uma em 400 × 700 sem rolagem; a última linha é «layout: as 23 telas cabem em 400 × 700 px» (AC 14).
Proof: `npm run check:layout`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| tipos de notícia (8) | `injury` C1 · `suspension` C2 · `rating` C3 · `offer` C4 · `board` C5 · `job` C5 · `transfer` C6 · `cup` C7 | - |
| resultados de copa (3) | `advanced` C7 · `champion` C7 · `out` C7 | - |
| filtros de transferência (4) | outra divisão C6 · outra rodada C6 · outro tipo C6 · um lado da divisão C6 | - |
| caminhos que fecham uma data (5) | `playRound` do motor C10 · `playDate` de copa C10 · ao vivo + pular C11 · reabertura pendente C11 · `playDate` do motor C11 | - |
| frases (14) | lesão plural C13 · lesão singular C13 · suspensão liga C13 · suspensão copa C13 · força sobe C13 · força cai C13 · proposta C13 · diretoria C13 · emprego um C13 · emprego dois C13 · transferência C13 · copa classificado C13 · copa campeão C13 · copa eliminado C13 | - |
| lados da gravação, door 1 (2) | arquivo C12 · IndexedDB C12 | - |
| telas novas medidas (2) | `roundNews` C16 · `historyNews` C16 | - |
| estados vazios (2) | Rodada C14 · Histórico C15 | - |

- No check names a status code, route or response shape.

## Swept

- validation: n/a - nada vem do usuário
- failure modes: n/a - gerar notícia não falha; dado faltando (sem clube) dá lista vazia (C9)
- idempotency: C11 (o mesmo fechamento dá as mesmas notícias por qualquer caminho)
- authorization: n/a - jogo local, sem contas
- concurrency: existing - a fila de gravação da store (`src/store.ts` `persist`) grava o jogo com `news` como grava o resto
- data lifecycle: C9 (as 60 mais novas)
- dependency failure: n/a - nada externo
- state transitions: C1-C7 (antes e depois de cada fato)
- observability: n/a - sem log

## Handoff

- S1 = `src/engine/news.ts` (novo, ~8 KB) + `news.test.ts` (novo, ~15 KB) + `season.ts` 11 KB + `cup.ts` 16 KB + `types.ts` 12 KB + `saveFile.test.ts` 9 KB + trecho de `store.test.ts` (49 KB) ≈ 120 KB / 4 ≈ 30k; S2 entra nas telas (`Round.tsx` 8 KB, `Round.test.tsx` 15 KB, `History.tsx` 8 KB, `History.test.tsx` 10 KB, `newsText.ts` novo, `styles.css` 54 KB) a ~55k; S3 entra no `layout-check.mjs` (26 KB) a ~62k, abaixo do budget de 150k - one builder
