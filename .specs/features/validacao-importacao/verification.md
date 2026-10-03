# Validação da importação verification

**Verdict**: PASS
**Profile**: light
**Diff range**: b30cb2f..51c058f (HEAD)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Resumo: os quatro checks estão provados na HEAD 51c058f (C1, C2, C3 e C4 PASS, cada um com teste que rodou e assertion localizada). O FAIL do round 1 (7 campos de tipo de `NewsItem` recusados pelo código sem nenhum teste que os prendesse) foi resolvido pelo check C4 e pelo teste «notícias no arquivo recusa os demais campos» (commit 51c058f). Recalculada a partir de `src/engine/types.ts:351-359`, a Coverage dos campos de tipo das notícias tem agora os 21 campos ligados a uma prova.

Histórico: round 1 (HEAD 1c46789, outro Verifier) deu FAIL: 7 campos sem prova de recusa e um gap de precisão na linha «campos de tipo das notícias (14)». A correção é só aditiva: 51c058f muda `checks.md` (C4 e uma linha nova de Coverage) e `src/engine/saveFile.test.ts` (um teste novo depois da linha 287). `src/engine/saveFile.ts` não muda.

Escopo deste round, conforme verify.md («Re-verifying after a fix»): todas as provas rodaram de novo na HEAD; refiz as citações de `saveFile.test.ts` (as linhas de C1 andaram 21 para baixo); recalculei a Coverage, porque a correção mexeu nela; li o C4 inteiro; procurei de novo formas que deveriam ser recusadas e passam. O que vem do round 1 está marcado `carried from 1c46789`.

## Binding sources

Carried from 1c46789. Não há plan.md nem fonte binding: o profile é light e a mudança é limitada. A seção `## Intent` de `checks.md` faz o papel do plano, e o step 1 não se aplica (não é `ui`).

## Checks

Verified at 51c058f. Todas as provas rodaram numa só invocação:
`npx vitest run src/engine/saveFile.test.ts src/ui/Home.test.tsx -t "dificuldade no arquivo|carreira no arquivo|notícias no arquivo recusa a forma errada|notícias atravessam o arquivo|notícias no arquivo recusa os demais campos|arquivo corrompido mostra o aviso e mantém o save" --reporter=verbose`. Saída 0, `Tests 7 passed | 36 skipped (43)`. Cada teste nomeado aparece com ✓ e nenhum filtro ficou sem casar:

- `carreira no arquivo (carreira-dinamica) > carreira no arquivo` ✓. O filtro também casa `proposta pendente no arquivo` pelo nome do describe, sem efeito.
- `notícias no arquivo (noticias) > notícias atravessam o arquivo` ✓
- `notícias no arquivo (noticias) > notícias no arquivo recusa a forma errada` ✓
- `notícias no arquivo (noticias) > notícias no arquivo recusa os demais campos` ✓ (novo em 51c058f)
- `dificuldade no arquivo (dificuldade) > dificuldade no arquivo` ✓
- `exportar e importar (lancamento) > arquivo corrompido mostra o aviso e mantém o save` ✓ (prova de ligação, L-003)

Diff: C1, C2 e C3 foram criados ou alterados em 1c46789 e C4 foi criado em 51c058f. Nenhuma prova depende só de um teste que a feature não mexeu. Os dois arquivos inteiros também passam: `npx vitest run src/engine/saveFile.test.ts src/ui/Home.test.tsx` dá 43 passed.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `difficulty` ausente, `easy`, `normal` ou `hard` → `ok` com o mesmo jogo; `"medio"`, `1` ou `null` → `malformed` | `-t "dificuldade no arquivo"` ✓, saída 0 | `src/engine/saveFile.test.ts:316`: `expect(decodeSaveFile(encodeSaveFile(g, ISO))).toEqual({ kind: "ok", state: g })` (ausente; `"difficulty" in g` é falso em :315). `src/engine/saveFile.test.ts:319`: `toEqual({ kind: "ok", state: s })` sobre os 3 níveis (:317). `src/engine/saveFile.test.ts:322`: `toEqual({ kind: "malformed" })` sobre `["medio", 1, null]` (:321). Código: `src/engine/saveFile.ts:73` | PASS |
| C2 | `career` ausente e duas trocas (`fired` e `offer`, ligas diferentes, uma com o clube do usuário) → `ok`; 7 formas erradas → `malformed` | `-t "carreira no arquivo"` ✓, saída 0 | `src/engine/saveFile.test.ts:174` (ausente) e `src/engine/saveFile.test.ts:181`: `expect(decodeSaveFile(encodeSaveFile(s, ISO))).toEqual({ kind: "ok", state: s })`, com `x` de `leagues[0]`, `y` de `leagues[1]` e `toId: me` (:175-179). `src/engine/saveFile.test.ts:193`: `expect(decodeSaveFile(envelope({ ...g, career })), name).toEqual({ kind: "malformed" })` sobre os 7 casos de :184-190, com `toHaveLength(7)` em :192. Código: `src/engine/saveFile.ts:74`, `:85-88` | PASS |
| C3 | `news` ausente, um item de cada um dos 8 tipos e 60 itens → `ok`; 24 formas erradas → `malformed` | `-t "notícias atravessam o arquivo"` ✓ e `-t "notícias no arquivo recusa a forma errada"` ✓, saída 0 | `src/engine/saveFile.test.ts:241`: `toEqual({ kind: "ok", state: g })`, com `new Set(...).size` 8 em :240. `src/engine/saveFile.test.ts:245` (60 itens) e `:249` (ausente): `toEqual({ kind: "ok", state: ... })`. `src/engine/saveFile.test.ts:285`: `expect(decodeSaveFile(envelope({ ...g, news })), name).toEqual({ kind: "malformed" })` sobre os 24 casos de :259-282, com `toHaveLength(24)` em :284 e a base aceita em :286. Código: `src/engine/saveFile.ts:75`, `:80-82`, `:91-117` | PASS |
| C4 | Sobre a lista válida de C3, cada um dos 7 campos restantes → `malformed`: `suspension` sem `playerName`, `suspension.rounds` `"1"`, `rating` sem `playerName`, `offer` sem `playerName`, `transfer` sem `playerName`, `transfer.amount` `"1200000"`, `cup.cupId` `7` no item | `-t "notícias no arquivo recusa os demais campos"` ✓, saída 0 | `src/engine/saveFile.test.ts:306`: `for (const [name, news] of cases) expect(decodeSaveFile(envelope({ ...g, news })), name).toEqual({ kind: "malformed" })` sobre os 7 casos de :297-303, com `toHaveLength(7)` em :305. A base aceita no mesmo teste está em `src/engine/saveFile.test.ts:307`: `expect(decodeSaveFile(envelope({ ...g, news: valid })).kind).toBe("ok")`. Código: `src/engine/saveFile.ts:101`, `:103`, `:105`, `:107`, `:113` | PASS |

Nível e amostragem: os quatro claims falam do valor que `decodeSaveFile` devolve, e as provas chamam `decodeSaveFile` diretamente com o texto do arquivo, então não há gap de nível. Cada tabela de recusa muda um campo por vez sobre uma base que o mesmo teste aceita (:174/:181, :286, :307, :316), e assim cada `malformed` vem do campo mudado.

No C4 conferi cada caso contra a base (`newsOfEveryKind`, :216-233). `at("suspension")` pega o índice 1, a suspensão de liga sem `cupId`. Os casos com `without` (:295) tiram só a chave `playerName`, e o resto do item continua válido. `"1200000"` cai em `Number.isFinite`, que não converte texto (`saveFile.ts:107`). `cupId: 7` muda só o item `cup`, e a data dele continua `{ kind: "cup", cupId: "cup-nat", phase: 0 }` (:219), então é o `typeof n.cupId === "string"` de `saveFile.ts:113` que recusa, não a data. Os ids recusados nas tabelas (`"no-such-club"`) não são do jogo (L-007).

A ligação `malformed` → aviso na tela e save mantido vem do round 1 (carried from 1c46789; o teste rodou de novo agora). A prova é `src/ui/Home.test.tsx:257`, `refused(encodeSaveFile({ ...seededGame(5), leagues: [] }, ISO), "Arquivo corrompido: não foi possível ler o jogo")`. Ela é anterior à feature e usa outro motivo de `malformed`, mas a tela só lê o `kind`, então basta para L-003. A parte «mantém o save» fica dentro do helper `refused` e não aparece na assertion.

## Coverage

Verified at 51c058f. O profile light não exige recalcular a Coverage, mas o pedido incluía conferir as linhas contra os testes. Recalculei cada conjunto a partir de quem tem autoridade sobre ele: o tipo em `src/engine/types.ts` para campos e tipos, `NEWS_LIMIT` em `src/engine/news.ts:4` para o limite e `DIFFICULTIES` em `src/engine/types.ts:342` para os níveis.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| `difficulty` aceitos (4) | `DIFFICULTIES` (`types.ts:342`) e ausente | ausente :316 · `easy`/`normal`/`hard` :317-319 | - |
| `difficulty` recusados (3) | check C1 | `"medio"`/`1`/`null` :321-322 | - |
| campos de `CareerMove` (5) | `types.ts:369-375` | `season` :186 · `round` :187 · `fromId` :188 · `toId` :189 · `reason` :190 | - |
| `reason` de `CareerMove` (2) | `types.ts:374` | `fired` :177 · `offer` :178 | - |
| tipos de `NewsItem` (8) | `types.ts:351-359` | os 8 em `newsOfEveryKind` :221-232, `size` 8 em :240; uma recusa por tipo em :268-282 | - |
| tipos de `NewsDate` (2) e seus campos (3) | `types.ts:345` | `league` :218 · `cup` :219 · `round` :265 · `cupId` :266 · `phase` :267 | - |
| campos comuns de `NewsItem` (2) | `types.ts:351` | `season` :263 · `kind` :262 | - |
| campos de tipo das notícias (21: injury 2, suspension 3, rating 3, offer 3, transfer 4, board 1, job 1, cup 4) | `types.ts:352-359` | `injury.playerName` :269 · `injury.rounds` :268 · `suspension.playerName` :297 · `suspension.rounds` :298 · `suspension.cupId` :270 · `rating.playerName` :299 · `rating.rating` :272 · `rating.delta` :271 · `offer.playerName` :300 · `offer.clubId` :273 · `offer.amount` :274 · `transfer.playerName` :301 · `transfer.fromId` :275 · `transfer.toId` :276 · `transfer.amount` :302 · `board.warnings` :277 · `job.clubIds` :278-279 · `cup.cupId` :303 · `cup.phase` :282 · `cup.result` :280 · `cup.opponentId` :281 | - |
| limite de notícias (2 bordas) | `NEWS_LIMIT` = 60 (`news.ts:4`) | 60 :244-245 · 61 :260 | - |
| ids de clube que precisam ser do jogo (7, pela Intent) | Intent de checks.md | career `fromId` :188 · `toId` :189 · `offer.clubId` :273 · `transfer.fromId` :275 · `transfer.toId` :276 · `job.clubIds` :279 · `cup.opponentId` :281 | - |

As duas linhas de `checks.md` sobre campos de tipo das notícias, somadas, cobrem os 21 campos. A linha antiga «(14)» tem 14 entradas, que são 13 campos distintos (`job.clubIds` aparece duas vezes, vazio e com id). A linha nova «(8)» traz os 7 de C4 e `cup.phase` (C3), e o rótulo dela diz que conta `job.clubIds` duas vezes e omite `cup.phase`. 13 + 8 = 21, igual ao tipo. O round 1 contou 20 campos no tipo; o certo é 21, e a lista de membros do round 1 já tinha os 21 (14 provados e 7 sem prova). O gap de precisão do round 1 está resolvido de forma aditiva: o rótulo «(14)» continua igual, mas a linha nova explica a conta e fecha o conjunto.

## Swept existing

Carried from 1c46789 e conferido de novo na HEAD, porque `saveFile.ts` não mudou em 51c058f:

- validation, failure modes, data lifecycle (C1, C2, C3): uma recusa vira `{ kind: "malformed" }` e não exceção, porque `hasGameShape` só devolve booleano (`src/engine/saveFile.ts:69-76`) e `decodeSaveFile` faz o mapeamento em `:143`. Campo ausente é aceito pelos ramos `=== undefined` em `:73` e `:81`. As linhas de Swept citam C1-C3 e não C4. Não há o que corrigir: C4 está nas mesmas dimensões que C3 (validation, failure modes) e usa o mesmo caminho de código.
- Linhas `n/a` (idempotency, authorization, concurrency, dependency failure, state transitions, observability): são política aprovada e não há o que conferir no código.
- Convenções (AGENTS.md): o diff b30cb2f..HEAD em `src/` não traz `Math.random`, React, DOM, zustand, idb nem «Brasfoot». `saveFile.ts` só importa `./migrate`, `./news` e `./types`.

## Adversarial: formas que ainda passam

Verified at 51c058f. Procurei formas que a Intent manda recusar e que ainda passam. Não achei nenhuma:

- Cada campo que as telas leem de uma notícia é validado em `saveFile.ts:91-117`: `newsText` e `newsDateLabel` (`src/ui/newsText.ts:9-46`), o filtro da Rodada (`src/ui/Round.tsx:48-51`, que lê `season` e `date`) e a lista do Histórico (`src/ui/History.tsx:113-117`). Todo id que vai para `findAnyClub` (`newsText.ts:10`) é conferido contra os clubes do jogo. `cupId` e `phase` fora de faixa caem em fallback (`newsText.ts:11`, `:32`, `:35`, `:45`), como a Intent aceita.
- Um item que é lista (`[]`) é recusado por `isObject` (`saveFile.ts:48`, que exclui arrays). Um `kind` desconhecido ou herdado do protótipo (`"constructor"`) cai em `default: return false` (`:114-115`).
- Ficam aceitos, mas fora da forma que a Intent descreve: inteiros negativos ou zero (`rounds`, `warnings`, `season`, `date.round`), `amount` negativo e `playerName` vazio. Todos estão no tipo declarado e nenhum quebra a tela: o texto sai estranho, mas não aparece `undefined` e nada lança. Não contam como gap.
- Fora do escopo (já anotado no round 1): `hasJobShape` (`saveFile.ts:120-124`, de antes da feature) aceita `pendingJob.clubIds` vazio. Não conta para este veredito.

## Faults injected

Não roda no profile light, e não houve mutação. Por dedução, tirar `isName &&` de `saveFile.ts:101`, `:103`, `:105` ou `:107`, o `Number.isFinite(n.amount)` de `:107` ou o `typeof n.cupId === "string"` de `:113` faria um caso de :297-303 voltar `ok` e o teste falhar em :306. Os sobreviventes que o round 1 apontou agora caem, mas isso também é dedução, não mutação rodada.

## Gate

`npx vitest run src/engine/saveFile.test.ts src/ui/Home.test.tsx`: 43 passed, 0 failed (os dois arquivos inteiros na HEAD 51c058f). Provas nomeadas: 7 passed, 0 failed.

## Ranked gaps

Nenhum. Pontos fracos que não reprovam:

1. Rótulo da Coverage em `checks.md`: a linha «campos de tipo das notícias (14)» continua com a conta antiga (14 entradas, 13 campos, sem `cup.phase`). A linha nova explica a conta e completa o conjunto, mas o total 21 não aparece escrito em nenhum lugar de `checks.md`.
2. As linhas de Swept citam C1-C3 e não C4. É inofensivo, porque C4 cobre as mesmas dimensões no mesmo código.
3. Nenhuma prova de mutação: o profile light não roda fault injection, então dizer que C4 pega a remoção de cada condição é dedução feita pela leitura da tabela.
