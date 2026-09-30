# Posição na substituição - checks

Profile: light
Plan: none - bounded change (live engine, store and live screen), no one-way door; intent below.

## Intent

Depois de uma expulsão, a vaga do expulso fica presa ao setor dele. A substituição põe o reserva sempre na vaga de quem sai, e a troca de formação mantém a vaga vermelha no setor do expulso (correcoes-validacao AC 43). Com um zagueiro expulso, o usuário tira um atacante e põe um zagueiro, mas o zagueiro fica improvisado no ataque, e nenhuma formação o leva para a zaga. O autor mandou print disso em 30/09/2026 e fixou a regra: sai um jogador, entra outro, como no futebol real, podendo escolher a posição de quem entra.

Com esta mudança, a substituição ganha o campo «Posição». O padrão é a vaga de quem sai. A outra opção é a vaga de um expulso: quem entra ocupa essa vaga, e o buraco passa para a vaga de quem saiu. O time continua com 10, e a substituição conta como qualquer outra. Ninguém entra direto na vaga de um expulso sem que alguém saia.

10 checks in 2 slices · 0 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`); layout `npm run check:layout`.

Lições aplicadas: L-003 (pela store e pela tela), L-005 (recusas em tabela), L-007 (a vaga de lesão e a vaga ocupada ficam de fora), L-008 (textos exatos na tela), L-026 (esperar o estado depois da ação).

## Checks

### S1 - Quem entra pode ocupar a vaga do expulso · 5 files · 90 KB · ~23k

**C1** - ✓ `substitute(live, clubId, slot, inId, target)` com um zagueiro expulso na vaga 2 de um 4-4-2, saindo o atacante da vaga 9 e entrando um zagueiro do banco com `target` 2:
- `slots[2]` = quem entra; `slots[9]` = null;
- `vacancy[9]` = `{ why: "red", playerId: <expulso> }`, e `vacancy[2]` fica ausente;
- `subsUsed` sobe 1; `subbedOff` contém o atacante; o banco perde quem entrou;
- o último evento é `{ type: "substitution", playerId: <atacante>, playerInId: <zagueiro> }`;
- 10 jogadores em campo antes e depois.
Proof: `npx vitest run src/engine/live.test.ts -t "entra na vaga do expulso"`

**C2** - ✓ Sem `target`, ou com `target` igual a `slot`, `substitute` põe quem entra na vaga de quem sai, como antes (o mesmo estado nos dois casos, `slots[9]` = quem entra, vaga 2 ainda vazia com a marca vermelha).
Proof: `npx vitest run src/engine/live.test.ts -t "posição padrão é a de quem sai"`

**C3** - ✓ Recusas, com o `live` devolvido igual, em tabela:
- `target` numa vaga ocupada → `not_vacant`;
- `target` numa vaga vazia por lesão → `not_vacant`;
- `target` fora do time (−1 e 11) → `not_vacant`;
- `slot` = a vaga do expulso → `sent_off`, como antes;
- 5 substituições já feitas → `limit`, como antes;
- quem já saiu → `returning`, como antes.
Proof: `npx vitest run src/engine/live.test.ts -t "posição na substituição: recusas"`

**C4** - ✓ A store repassa a posição: `useGame.getState().substitute(9, <zagueiro>, 2)` com o relógio parado deixa o zagueiro na vaga 2 do `live`. Uma recusa `not_vacant` mostra «Escolha a vaga de quem sai ou a de um expulso».
Proof: `npx vitest run src/store.test.ts -t "substituição com posição"`

**C5** - ✓ Na tela ao vivo, parada depois de um zagueiro expulso (o caso do print):
- aparece o campo «Posição» com 2 opções, na ordem «no lugar de <atacante> (ATA)» e «na vaga de <expulso> (ZAG, expulso)»;
- escolhendo Sai = o atacante, Entra = o zagueiro e Posição = a vaga do expulso, «Substituir» deixa em «Em campo» a linha ZAG com o zagueiro, sem «fora de posição»;
- a linha ATA mostra «<expulso> (expulso)»;
- aparece «Substituições: 1/5».
Proof: `npx vitest run src/ui/Live.test.tsx -t "substituição na vaga do expulso"`

**C6** - ✓ Sem expulsão no time, a tela ao vivo parada não mostra o campo «Posição».
Proof: `npx vitest run src/ui/Live.test.tsx -t "sem expulso não há posição"`

**C7** - ✓ `npm run check:layout` sai 0 com as 16 telas (AD-010). O campo «Posição» só aparece com um expulso, então a tela `live` medida não o mostra. A linha de decisões continua a mesma quando não há expulso.
Proof: `npm run check:layout`

### S2 - A posição escolhida sobrevive à troca de formação · achado do Verifier (round 1)

**C8** - Depois de `substitute(live, clubId, 9, <zagueiro>, 2)` com o zagueiro da vaga 2 expulso, `changeFormation` para 4-4-2, 4-5-1, 4-3-3 e 3-5-2 (tabela) deixa a vaga vazia na última vaga FW da formação, com a marca do expulso. Os 4 zagueiros ficam em vagas DF no 4-4-2, no 4-5-1 e no 4-3-3. No 3-5-2, que só tem 3 vagas DF, ficam 3 zagueiros na zaga. No 4-5-1, a única vaga FW é a vazia, e o atacante que sobrou joga no meio.
Proof: `npx vitest run src/engine/live.test.ts -t "formação depois da troca mantém a posição"`

**C9** - Com «Sai» numa vaga vazia (a do expulso), o campo «Posição» só oferece «no lugar de <expulso> (ZAG)», sem a vaga de expulso nenhum.
Proof: `npx vitest run src/ui/Live.test.tsx -t "posição sem quem sai"`

**C10** - Com o goleiro expulso e um goleiro escolhido em «Entra» para um jogador de linha, o campo «Posição» já vem em «na vaga de <goleiro expulso> (GOL, expulso)». «Substituir» põe o goleiro reserva no gol, como a regra da parada obrigatória já fazia.
Proof: `npx vitest run src/ui/Live.test.tsx -t "goleiro reserva vai para o gol"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| destino de quem entra (2) | vaga de quem sai C2 · vaga do expulso C1 | - |
| recusas (6) | ocupada C3 · lesão C3 · fora do time C3 · sai o expulso C3 · limite C3 · quem já saiu C3 | - |
| opções do campo «Posição» (2) | de quem sai C5 · do expulso C5 | - |
| presença do campo (2) | com expulso C5 · sem expulso C6 | - |
| formação depois da troca (4) | C8, table-driven over all 4 | - |
| opções com «Sai» vazio (1) | C9 | - |
| goleiro que entra (1) | C10 | - |

- C7 não mede a tela ao vivo com o campo «Posição» visível, porque o layout não consegue forçar uma expulsão. O campo fica numa linha de decisões própria, abaixo de «Sai» e «Entra», com um select só. A tela `live` continua medida sem ele.

## Amended after verification

| Check | What changes | Why |
| --- | --- | --- |
| C1 (Verifier round 1) | a vaga movida guarda também o setor de onde ela veio: `vacancy[9]` = `{ why: "red", playerId: <expulso>, pos: "FW" }` | sem o setor, `changeFormation` devolvia o buraco para a zaga (C8); a asserção fica mais estrita, não mais frouxa |

## Swept

- validation: C3
- failure modes: C3 - a recusa devolve o `live` igual e mostra a mensagem
- idempotency: n/a - cada substituição é uma decisão nova e gasta uma das 5
- authorization: n/a - jogo local de um jogador só
- concurrency: existing - decisões só com o relógio parado (`decide` na store)
- data lifecycle: n/a - o `live` não é gravado (AD-019)
- dependency failure: n/a - nada externo
- state transitions: C1, C2, C8
- observability: n/a - jogo offline sem telemetria

## Handoff

- S1 ≈ `live.ts` 30 KB + `store.ts` 28 KB + `Live.tsx` 16 KB + testes (`live.test.ts` 34 KB, `Live.test.tsx` ~30 KB, trecho de `store.test.ts`) ≈ 150 KB / 4 ≈ 38k, abaixo do budget de 150k - one builder
- Mechanism: one builder
- **Boundary:** C1-C7 fechados no commit da mudança; `npx vitest run` 607/607 em duas rodadas seguidas (uma rodada anterior, com a máquina sem memória, falhou em 4 testes, entre eles C5, que passou isolado 4 de 4); `npm run check:layout` 16 telas
