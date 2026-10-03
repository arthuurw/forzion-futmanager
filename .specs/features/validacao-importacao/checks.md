# Validação da importação - checks

Profile: light
Plan: none - bounded change (`src/engine/saveFile.ts` e o teste dele), no one-way door; intent below.

## Intent

A importação (`decodeSaveFile`) valida a forma do jogo e a proposta pendente, mas deixa passar qualquer valor nos três campos opcionais que vieram depois: `difficulty` (AD-029), `news` (AD-028) e `career` (AD-024). Um arquivo editado à mão ou corrompido entra e quebra o jogo depois: `difficultyOf` devolve `undefined` e a meta da diretoria e as compras da IA quebram; uma notícia ou troca de clube com id de clube que não existe faz `findAnyClub` lançar na Rodada e no Histórico; uma notícia sem os campos do tipo vira texto quebrado.

Com esta mudança, um arquivo com um desses campos fora da forma que o motor grava é recusado como `malformed` (a tela mostra o aviso de arquivo corrompido e o save atual fica, como já acontece hoje para os outros campos). Ausente continua valendo: save de antes dos campos importa igual.

Defaults escolhidos (o autor aprovou o próximo passo sem rodada de perguntas):

- Os ids de clube em `career` e `news` (`fromId`, `toId`, `clubId`, `clubIds`, `opponentId`) precisam ser clubes do jogo; o clube do usuário vale (venda do próprio clube, troca de clube). Os `cupId` não precisam existir: a tela já cai no id quando a copa não existe.
- `news` com mais de 60 itens (`NEWS_LIMIT`) é recusado: o motor nunca grava mais que isso.
- `job.clubIds` vazio é recusado: a frase ficaria «… e undefined querem contratar você».
- Fora do escopo: `boardWarnings` e a leitura do IndexedDB (o save do próprio aparelho é gravado pelo jogo).

3 checks in 1 slice · 0 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`).

Lições aplicadas: L-005 (tabela sobre o conjunto inteiro: cada valor de dificuldade, cada tipo de notícia, cada campo quebrado), L-007 (cada tabela tem casos aceitos e recusados, e os ids recusados não são do jogo), L-003 (a ligação `malformed` → aviso na tela e save mantido já tem prova em `src/ui/Home.test.tsx` «arquivo corrompido mostra o aviso e mantém o save»; esta mudança só acrescenta motivos de `malformed` dentro de `decodeSaveFile`), L-030 (não se aplica: as provas de recusa são comportamento novo e falham no código de antes; as de aceite prendem o que já passa).

## Checks

### S1 - Campos opcionais na importação · 2 files · ~14 KB · ~4k

**C1** - `decodeSaveFile` de um jogo válido com `difficulty`, em tabela: ausente, `"easy"`, `"normal"`, `"hard"` → `{ kind: "ok", state }` com `state` igual ao exportado; `"medio"`, `1`, `null` → `{ kind: "malformed" }`.
Proof: `npx vitest run src/engine/saveFile.test.ts -t "dificuldade no arquivo"`

**C2** - `decodeSaveFile` de um jogo válido com `career`: ausente e uma lista de duas trocas (uma `"fired"`, uma `"offer"`, com clubes de ligas diferentes, um deles o do usuário) → `ok` com o jogo igual ao exportado; em tabela, cada caso → `malformed`: `career` objeto em vez de lista; item `null`; `season` `1.5`; `round` `"3"`; `fromId` de clube que não existe; `toId` de clube que não existe; `reason` `"quit"`.
Proof: `npx vitest run src/engine/saveFile.test.ts -t "carreira no arquivo"`

**C3** - `decodeSaveFile` de um jogo válido com `news`: ausente e uma lista com um item de cada um dos 8 tipos (`injury`, `suspension` com e sem `cupId`, `rating`, `offer`, `transfer`, `board`, `job`, `cup`), com data de liga e de copa → `ok` com o jogo igual ao exportado; uma lista de 60 itens → `ok`; em tabela, cada caso → `malformed`: `news` objeto em vez de lista; 61 itens; item `null`; `kind` `"goal"`; `season` `"1"`; `date.kind` `"week"`; data de liga com `round` `1.5`; data de copa com `cupId` `7`; data de copa com `phase` `"0"`; `injury` com `rounds` `"2"`; `injury` sem `playerName`; `suspension` com `cupId` `7`; `rating` com `delta` `2`; `rating` com `rating` `"70"`; `offer` com `clubId` que não existe; `offer` com `amount` `"900000"`; `transfer` com `fromId` que não existe; `transfer` com `toId` que não existe; `board` com `warnings` `"1"`; `job` com `clubIds` `[]`; `job` com um id que não existe; `cup` com `result` `"lost"`; `cup` com `opponentId` que não existe; `cup` com `phase` `"0"`.
Proof: `npx vitest run src/engine/saveFile.test.ts -t "notícias no arquivo recusa a forma errada"`
Proof: `npx vitest run src/engine/saveFile.test.ts -t "notícias atravessam o arquivo"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| valores de `difficulty` aceitos (4) | ausente C1 · `easy` C1 · `normal` C1 · `hard` C1 | - |
| valores de `difficulty` recusados (3) | texto fora da lista C1 · número C1 · `null` C1 | - |
| campos de `CareerMove` (5) | `season` C2 · `round` C2 · `fromId` C2 · `toId` C2 · `reason` C2 | - |
| `reason` de `CareerMove` (2) | `fired` C2 · `offer` C2 | - |
| tipos de `NewsItem` (8) | `injury` C3 · `suspension` C3 · `rating` C3 · `offer` C3 · `transfer` C3 · `board` C3 · `job` C3 · `cup` C3 | - |
| tipos de `NewsDate` (2) | `league` C3 · `cup` C3 | - |
| campos de tipo das notícias (14) | `injury.rounds` C3 · `injury.playerName` C3 · `suspension.cupId` C3 · `rating.delta` C3 · `rating.rating` C3 · `offer.clubId` C3 · `offer.amount` C3 · `transfer.fromId` C3 · `transfer.toId` C3 · `board.warnings` C3 · `job.clubIds` vazio C3 · `job.clubIds` id C3 · `cup.result` C3 · `cup.opponentId` C3 | - |
| limite de notícias (2 bordas) | 60 C3 · 61 C3 | - |

- Nenhum check fala de tela: a ligação `malformed` → aviso já é provada por `src/ui/Home.test.tsx`.

## Swept

- validation: C1, C2, C3
- failure modes: C1, C2, C3 - cada forma errada vira `malformed`, nunca uma exceção na tela
- idempotency: n/a - decodificar é função pura do texto
- authorization: n/a - jogo local, sem usuário
- concurrency: n/a - a importação não grava nada nesta camada
- data lifecycle: C1, C2, C3 - campo ausente (save de antes) continua aceito
- dependency failure: n/a - sem dependência externa
- state transitions: n/a - nenhum estado novo
- observability: n/a - sem log no jogo

## Handoff

- S1 = `saveFile.ts` 4,7 KB + `saveFile.test.ts` 9 KB ≈ 14 KB / 4 ≈ 4k, abaixo do budget de 150k - one builder
