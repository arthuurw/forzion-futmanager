# Empréstimo de jogadores - checks

Profile: light
Plan: `.specs/features/emprestimos/plan.md`

23 checks in 4 slices · 3 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`); layout `npm run check:layout`.

Lições aplicadas: L-001 (estado da tela vindo do IndexedDB onde o check fala de gravação), L-003 (pela store e pela tela), L-005 (regras e recusas em tabela), L-008 (textos exatos), L-018 (fixtures em que o clube escolhido não é o primeiro da lista nem o de menor id, e em que o mais forte não é onde ele seria titular), L-026 (espera o estado depois do save), L-027 (as telas novas medidas com o conteúdo à vista), L-029 (cada prova falha no código de antes), L-030 (as provas que só prendem comportamento que já existe são declaradas: C9 para comprar, contratar e promover com o elenco abaixo de 30 sem emprestados).

## Checks

### S1 - Emprestar um jogador (motor) · 3 files · ~105 KB · ~26k

**C1** - Com o mercado aberto, `loanOut(jogo, id)` de um reserva do usuário (força acima do pior titular da posição no clube de destino, à venda e com uma proposta da IA por ele) devolve `{ ok: true }` com: o jogador fora de `players`, de `lineup.starters` e de `forSale` do usuário; no `players` do clube de destino com `loanFrom` = id do clube do usuário e entre os `starters` de `aiLineup(destino)`; a proposta por ele fora de `market.offers`; `finance.cash`, `pendingIn` e `pendingOut` do usuário e do destino iguais aos de antes (AC 3, AC 9).
Proof: `npx vitest run src/engine/market.test.ts -t "emprestar cede o jogador"`

**C2** - `loanDestination(jogo, id)` segue a door 2, em tabela com clubes montados no fixture (AC 4):
- o clube mais forte do país (soma dos 11 mais fortes) onde ele não entra na `aiLineup` não é escolhido, e o seguinte, onde ele entra, é;
- um clube com 30 jogadores, mais forte, onde ele entraria, não é escolhido;
- um clube de outro país, mais forte, onde ele entraria, não é escolhido;
- dois clubes com a mesma soma onde ele entra → o de menor id;
- nenhum clube onde ele entra → `null`.
Proof: `npx vitest run src/engine/market.test.ts -t "destino do empréstimo"`

**C3** - `loanOut` recusa, em tabela, sem mudar o jogo (AC 5-8, AC 17): mercado fechado → `"closed"`; id fora do elenco do usuário → `"not_found"`; elenco do usuário com 18 → `"user_min"`; `contractSeasons` 1 → `"last_year"`; `loanDestination` nulo → `"no_club"`; jogador com `loanFrom` (emprestado ao usuário) → `"on_loan"`.
Proof: `npx vitest run src/engine/market.test.ts -t "recusas ao emprestar"`

**C4** - Depois de uma rodada da liga fechada com um jogador P1 emprestado pelo usuário ao clube X e um P2 emprestado pelo clube Y ao usuário, `lastRound.salaries` do usuário é a soma dos salários do seu `players` (com P2, sem P1) e o de X inclui o salário de P1 (AC 9, AC 17).
Proof: `npx vitest run src/engine/market.test.ts -t "salário de quem está emprestado"`

### S2 - Pegar emprestado (motor) · mesmos arquivos · ~105 KB · ~0k a mais

**C5** - `loanFee(jogador)` = 20% de `marketValue`, arredondado para R$ 10.000, no mínimo R$ 10.000, em tabela por força e idade: 65 e 20 anos (valor R$ 1.290.000) → 260.000; 61 e 25 (R$ 730.000) → 150.000; 62 e 20 (R$ 1.000.000) → 200.000; 40 e 35 (R$ 30.000, o menor valor possível) → 10.000 (AC 10).
Proof: `npx vitest run src/engine/market.test.ts -t "taxa do empréstimo"`

**C6** - Com o mercado aberto, `loanIn(jogo, id)` de um reserva (fora dos 11 de maior força do dono) que estava na `lineup` salva do dono devolve `{ ok: true }` com: `cash` do usuário − taxa e `pendingOut` + taxa; `cash` do dono + taxa e `pendingIn` + taxa; o jogador fora de `players` e de `lineup.starters` do dono; no `players` do usuário com `loanFrom` = id do dono e fora da `lineup` do usuário (AC 11).
Proof: `npx vitest run src/engine/market.test.ts -t "pegar emprestado traz o jogador"`

**C7** - `loanIn` recusa, em tabela, sem mudar o jogo (AC 12-16): mercado fechado → `"closed"`; id que não está em clube da IA → `"not_found"`; jogador entre os 11 de maior força do dono → `"starter"`; jogador com `loanFrom` → `"on_loan"`; usuário com 29 jogadores e 1 emprestado por ele → `"squad_full"`; dono com 18 → `"seller_min"`; caixa do usuário = taxa − 1 → `"cash"`.
Proof: `npx vitest run src/engine/market.test.ts -t "recusas ao pegar emprestado"`

**C8** - Com o usuário com 29 jogadores e 1 emprestado por ele, `buyPlayer`, `signFreeAgent` e `promoteJunior` recusam com `"squad_full"` (AC 14).
Proof: `npx vitest run src/engine/market.test.ts -t "limite de 30 conta os emprestados"`

**C9** - Com o usuário com 29 jogadores e nenhum emprestado, `buyPlayer`, `signFreeAgent` e `promoteJunior` continuam aceitando (o limite de antes, preso pela L-030).
Proof: `npx vitest run src/engine/market.test.ts -t "limite de 30 sem emprestados"`

**C10** - Um jogador com `loanFrom` não se negocia, em tabela (AC 13, AC 17): no elenco do usuário, `toggleForSale`, `releasePlayer` e `renewContract` (com `contractSeasons` 1) → `"on_loan"`; num clube da IA, `buyPlayer` com oferta acima do pedido → `"on_loan"`.
Proof: `npx vitest run src/engine/market.test.ts -t "emprestado não se negocia"`

### S3 - A IA respeita e a virada devolve · 5 files · ~68 KB · ~17k

**C11** - `closeRoundMarket` com a janela aberta nunca move um jogador com `loanFrom`, em tabela (AC 18):
- compra da IA: o único candidato que atende a regra de compra de um clube tem `loanFrom` → nenhuma compra desse jogador em 40 sementes;
- venda no vermelho: o jogador de maior valor do clube no vermelho tem `loanFrom` → o vendido é outro;
- dispensa depois da compra: o pior reserva da posição do comprador acima de 22 tem `loanFrom` → o dispensado é outro.
Proof: `npx vitest run src/engine/market.test.ts -t "IA respeita o empréstimo"`

**C12** - Com os 5 jogadores de maior valor do usuário emprestados a ele, `closeRoundMarket` com a janela aberta em 40 sementes não gera nenhuma proposta da IA por um jogador com `loanFrom`, e gera ao menos uma proposta por outro jogador (AC 18).
Proof: `npx vitest run src/engine/market.test.ts -t "sem proposta por emprestado"`

**C13** - Na virada, com P1 (do usuário, `contractSeasons` 3, idade 20) emprestado ao clube X e titular da `lineup` de X, e P2 (do clube Y) emprestado ao usuário e titular da `lineup` do usuário, `nextSeason` devolve: P1 no `players` do usuário, sem `loanFrom`, com idade 21 e `contractSeasons` 2, fora de `players` e `lineup` de X; P2 no `players` de Y, sem `loanFrom`, fora de `players` e `lineup` do usuário; nenhum jogador com `loanFrom` no jogo (AC 19, AC 20).
Proof: `npx vitest run src/engine/rollover.test.ts -t "virada devolve os emprestados"`

**C14** - No caso de C13, `report.changes` da virada tem uma linha de P1 com o «Antes» igual à força de P1 no começo da temporada, e nenhuma linha de P2 (AC 20).
Proof: `npx vitest run src/engine/rollover.test.ts -t "quem volta entra no relatório"`

**C15** - Com P1 do clube A do usuário emprestado ao clube X, o usuário troca para o clube B no meio da temporada (`takeJob` de carreira-dinamica); P1 continua em X com `loanFrom` = A, e na virada vai para o `players` de A, não de B (AC 21).
Proof: `npx vitest run src/engine/rollover.test.ts -t "troca de clube mantém o empréstimo"`

**C16** - Um jogo com `loanFrom` em dois jogadores grava e lê igual (`saveGame`/`loadGame`), e exportar e importar o arquivo (`encodeSaveFile`/`decodeSaveFile`) devolve o mesmo `GameState`, com os dois `loanFrom` (door 1).
Proof: `npx vitest run src/engine/saveFile.test.ts -t "empréstimo atravessa o arquivo"`
Proof: `npx vitest run src/persistence/save.test.ts -t "empréstimo atravessa o save"`

### S4 - Telas · 8 files · ~252 KB · ~63k

**C17** - No Elenco aberto do IndexedDB com o mercado aberto, cada linha de jogador do usuário tem o botão «Emprestar <nome>»; a linha de um jogador emprestado ao usuário mostra «Emprestado» e não tem «À venda: <nome>», «Dispensar <nome>», «Emprestar <nome>» nem «Renovar <nome>» (com `contractSeasons` 1); com o mercado fechado, nenhuma linha tem «Emprestar <nome>» (AC 1, AC 8, AC 17).
Proof: `npx vitest run src/ui/Squad.test.tsx -t "botão emprestar no elenco"`

**C18** - «Emprestar <nome>» de um reserva abre «Confirmar empréstimo» com «Emprestar <nome> para <clube de destino> até o fim da temporada? O salário fica com o clube que o recebe.» e o foco em «Confirmar», com o jogador ainda no elenco; «Cancelar» fecha sem mudar nada; «Confirmar» tira a linha do elenco, e o jogo gravado no IndexedDB tem o jogador no clube de destino com `loanFrom` = id do clube do usuário (AC 2, AC 3).
Proof: `npx vitest run src/ui/Squad.test.tsx -t "emprestar com confirmação"`

**C19** - No Elenco, as recusas do «Emprestar» aparecem na barra e não abrem a confirmação, em tabela (AC 5-7): sem destino → «Nenhum clube quer esse jogador agora»; último ano → «Renove o contrato antes de emprestar»; elenco com 18 → «Elenco no mínimo (18)».
Proof: `npx vitest run src/ui/Squad.test.tsx -t "recusas do emprestar na tela"`

**C20** - Em «Negociação», um reserva de clube da IA mostra «Pegar emprestado (<taxa formatada>)» ao lado da oferta; tocar nele soma o jogador ao elenco do usuário com «Emprestado», baixa o «Caixa» da tela pela taxa e grava o jogo; com caixa menor que a taxa, a barra mostra «Caixa insuficiente» e nada muda (AC 10, AC 11, AC 16).
Proof: `npx vitest run src/ui/Market.test.tsx -t "pegar emprestado na negociação"`

**C21** - Em «Negociação», em tabela (AC 12, AC 13): um titular do dono mostra «Titular: o clube não empresta» e não tem «Pegar emprestado»; um jogador com `loanFrom` num clube da IA mostra «Emprestado: não pode ser negociado» e não tem o campo «Oferta», «Fazer proposta» nem «Pegar emprestado».
Proof: `npx vitest run src/ui/Market.test.tsx -t "negociação de titular e de emprestado"`

**C22** - Com o mercado aberto, a aba «Emprestados (2)» mostra «Emprestados por você» com a linha de P1 (nome, posição, força, clube onde joga) e «Emprestados a você» com a linha de P2 (nome, posição, força, clube dono); sem empréstimo, a aba é «Emprestados (0)» e as duas listas mostram «Nenhum» (AC 22).
Proof: `npx vitest run src/ui/Market.test.tsx -t "aba emprestados"`

**C23** - `npm run check:layout` (seed 1) sai 0 e mede 21 telas: as 19 de hoje, `squadLoan` (elenco com «Confirmar empréstimo» aberta e o botão «Emprestar» nas linhas) e `marketLoans` (aba «Emprestados» com uma linha em cada lista), cada uma em 400 × 700 sem rolagem; a última linha é «layout: as 21 telas cabem em 400 × 700 px» (AC 23).
Proof: `npm run check:layout`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| recusas de `loanOut` (6) | `closed` C3 · `not_found` C3 · `user_min` C3 · `last_year` C3 · `no_club` C3 · `on_loan` C3 | - |
| recusas de `loanIn` (7) | `closed` C7 · `not_found` C7 · `starter` C7 · `on_loan` C7 · `squad_full` C7 · `seller_min` C7 · `cash` C7 | - |
| filtros e desempate do destino, door 2 (5) | entra na `aiLineup` C2 · menos de 30 C2 · mesmo país C2 · maior soma C2 · menor id C2 | - |
| destino inexistente (1) | `null` C2 | - |
| ações que contam o limite de 30 (4) | `buyPlayer` C8 · `signFreeAgent` C8 · `promoteJunior` C8 · `loanIn` C7 | - |
| ações recusadas a quem tem `loanFrom` (5) | `toggleForSale` C10 · `releasePlayer` C10 · `renewContract` C10 · `buyPlayer` C10 · `loanOut` C3 | - |
| movimentos da IA que pulam `loanFrom` (4) | compra C11 · venda no vermelho C11 · dispensa C11 · proposta C12 | - |
| devolução na virada, por direção (2) | do usuário para X e de volta C13 · de Y para o usuário e de volta C13 | - |
| quem paga o salário, por direção (2) | emprestado pelo usuário C4 · emprestado ao usuário C4 | - |
| lados da gravação, door 1 (2) | IndexedDB C16 · arquivo exportado C16 | - |
| telas novas medidas (2) | `squadLoan` C23 · `marketLoans` C23 | - |
| estados da aba «Emprestados» (2) | com as duas listas C22 · vazia C22 | - |
| textos de recusa novos na tela (4) | «Nenhum clube quer esse jogador agora» C19 · «Renove o contrato antes de emprestar» C19 · «Titular: o clube não empresta» C21 · «Emprestado: não pode ser negociado» C21 | - |

- No check names a status code, route or response shape.
- C11 e C12 rodam 40 sementes porque a compra da IA e a proposta passam por sorteio; o fixture põe o jogador emprestado como o único candidato (C11) ou entre os 5 alvos (C12).

## Swept

- validation: C3, C7, C10
- failure modes: C19, C20 (recusas na tela)
- idempotency: n/a - cada ação muda o jogo uma vez e a tela fecha a confirmação; repetir o toque cai nas recusas de C3 e C7 (`not_found`, `on_loan`)
- authorization: n/a - jogo local, sem contas
- concurrency: existing - fila de gravação da store (`src/store.ts` `persist`, `writeQueue`), por onde `loanOut` e `loanIn` passam como `buyPlayer`
- data lifecycle: C13, C15 (o empréstimo acaba na virada, também depois de troca de clube)
- dependency failure: existing - gravação que falha mostra o aviso de hoje (`saveStatus: "failed"` em `src/store.ts` `persist`)
- state transitions: C1, C6, C13
- observability: n/a - sem log

## Handoff

- S1 + S2 = market.ts 24 KB + types.ts 12 KB + market.test.ts 69 KB = 105 KB / 4 ≈ 26k; S3 entra na virada e na carreira (rollover.ts 15 KB, rollover.test.ts 36 KB, career.ts 7 KB, season.ts 11 KB) a ~43k; S4 entra nas telas (store.ts 35 KB, store.test.ts 49 KB, Squad.tsx 17 KB, Squad.test.tsx 31 KB, Market.tsx 15 KB, Market.test.tsx 19 KB, styles.css 54 KB, layout-check.mjs 24 KB, saveFile.test.ts 8 KB = 252 KB ≈ 63k) a ~106k, abaixo do budget de 150k - one builder
- **Settled mid-build:** C5 trocou os valores ilustrativos (R$ 1.230.000 e R$ 2.000.000 não são valores de mercado possíveis) por força e idade reais, antes de qualquer teste de C5; o mínimo de R$ 10.000 nunca decide sozinho, porque o menor valor de mercado (R$ 30.000) já arredonda para R$ 10.000
- **Boundary:** C1-C23 closed at `bd82792` (motor em 20e638a, telas em 7f9118c, layout em bd82792)
- **Abandoned:** nada
