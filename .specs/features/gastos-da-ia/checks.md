# Gastos da IA - checks

Profile: light
Plan: `.specs/features/gastos-da-ia/plan.md`

## Intent

33 checks in 6 slices · 3 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`). Telas usam `@testing-library/react` em jsdom. Todo valor esperado é literal ou calculado no próprio teste, nunca pela função de produção sob teste (L-004). «Todo», «cada» e «todas» são provados por tabela sobre o conjunto inteiro (L-005). Lições aplicadas: L-003 (fiação pelo ponto de entrada), L-007 (fixture com o membro excluído), L-009 (door nova no build ganha check antes de fechar).

Este plano é construído sobre o save v5 da copa-nacional. Onde um check diz «rodada de janela», vale a regra de elenco-mercado-financas: fechar a rodada de liga `r` (1-based) dispara o mercado da IA quando a rodada `r + 1` está em 1–5 ou 18–22, ou seja, ao fechar as rodadas 1–4 e 17–21. O comportamento da IA roda dentro de `closeRoundMarket`, e as fixtures chamam esse ponto ou o `playRound`/`finishRound` que o chama. Nenhuma fixture chama um helper privado como única prova de uma regra de fiação (L-003).

## Checks

### S1 - A IA compra reforços com o que sobra · ~5 files · ~75 KB · ~19k

**C1** - `aiBudget` de um clube com caixa R$ 10.000.000, folha R$ 500.000 por rodada e salário novo R$ 50.000 vale 10.000.000 − 8 × 550.000 = R$ 5.600.000. Um candidato de preço R$ 5.600.000 é comprado; com preço R$ 5.610.000 e nenhum outro candidato, a tentativa termina sem compra (AC 1)
Proof: `npx vitest run src/engine/market.test.ts -t "sobra da IA"`
Proof: `npx vitest run src/engine/market.test.ts -t "compra no limite da sobra"`

**C2** - Fechar uma rodada de janela consome exatamente um `next()` por clube da IA do fluxo `createRng(mix32(mix32(rngState, 0xA1), roundNumber))`, na ordem `leagues[0].clubs` e depois `leagues[1].clubs`, pulando o clube do usuário. O clube tenta comprar quando o valor sorteado é menor que 0,25. O teste recalcula os sorteios pela fórmula literal da door 3 e confere que só os clubes com sorteio < 0,25 mudaram de elenco, numa fixture em que todos têm candidato e sobra (AC 2, door 3)
Proof: `npx vitest run src/engine/market.test.ts -t "chance de compra pelo fluxo da door 3"`

**C3** - As compras da IA não mudam os sorteios das partidas, das propostas ao usuário nem dos juniores: o mesmo save, com e sem sobra na IA, fecha a rodada 1 com os mesmos placares da rodada 2, as mesmas propostas (ids, jogadores, valores) e os mesmos juniores (door 3)
Proof: `npx vitest run src/engine/market.test.ts -t "compras da IA não mudam os outros sorteios"`

**C4** - Com todos os clubes da IA com sobra, candidato e sorteio garantido pela fixture, fechar as rodadas 1, 4, 17 e 21 produz compras, e fechar as rodadas 5, 16, 22 e 38 não produz nenhuma: elencos e caixas da IA ficam iguais aos de antes, fora o efeito de `closeRoundFinances` (AC 2)
Proof: `npx vitest run src/engine/market.test.ts -t "compras só em rodada de janela"`

**C5** - O alvo é a posição do titular de menor força em `aiLineup`. Numa fixture em que o titular mais fraco é um zagueiro de força 60, a tabela de candidatos dá: zagueiro força 63, 32 anos, de clube da IA com 19 jogadores → elegível; força 62 → fora; 33 anos → fora; de clube da IA com 18 jogadores → fora; do clube do usuário, força 90 → fora; livre força 63 → elegível; meia força 80 → fora (AC 3, AC 8)
Proof: `npx vitest run src/engine/market.test.ts -t "candidatos da compra da IA"`

**C6** - Entre candidatos elegíveis, a IA compra o de maior força. Com força igual, compra o de menor preço. Com força e preço iguais, compra o de menor id. O preço de um titular do vendedor é 1,5 × `marketValue`, o de um reserva é `marketValue` e o de um livre é 4 × salário. A fixture tem um titular e um reserva de mesma força, e o reserva é o comprado (AC 4)
Proof: `npx vitest run src/engine/market.test.ts -t "escolha do reforço da IA"`

**C7** - Uma compra de clube da IA por R$ 2.000.000 move o jogador com `contractSeasons` 3 e o mesmo `salary` que tinha. O caixa do comprador cai R$ 2.000.000 e o `pendingOut` sobe R$ 2.000.000; o caixa e o `pendingIn` do vendedor sobem R$ 2.000.000. Um livre contratado chega com `contractSeasons` 2, e o comprador paga 4 × salário no caixa e no `pendingOut` (AC 5)
Proof: `npx vitest run src/engine/market.test.ts -t "compra da IA move jogador e dinheiro"`

**C8** - Um comprador com 22 jogadores que compra um zagueiro fica com 22: o zagueiro de menor força que não é titular em `aiLineup` vai para `market.freeAgents` com `contractSeasons` 0. O comprador paga 4 × salário dele no caixa e no `pendingOut`. A fixture tem um zagueiro titular mais fraco que o dispensado, e esse fica (AC 6, L-007)
Proof: `npx vitest run src/engine/market.test.ts -t "dispensa ao passar de 22"`

**C9** - Um clube sorteado para comprar sem candidato na força mínima, ou só com candidatos acima da sobra, termina a rodada com o mesmo elenco e o mesmo caixa que `closeRoundFinances` deixou (AC 7)
Proof: `npx vitest run src/engine/market.test.ts -t "tentativa sem candidato não muda nada"`

**C10** - Um usuário cujo elenco tem os 5 melhores jogadores de cada posição do jogo fecha as rodadas 1 a 4 com todos os clubes da IA ricos: o elenco do usuário termina com os mesmos ids (AC 8)
Proof: `npx vitest run src/engine/market.test.ts -t "IA nunca compra do usuário"`

**C11** - `playRound` de um jogo novo cujo clube da IA de índice 0 da Série A tem caixa R$ 500.000.000 e cujo fluxo da door 3 sorteia esse clube abaixo de 0,25 na rodada 1 termina com uma linha `kind: "buy"` ou `"free"` desse clube em `market.transfers` (AC 2, L-003)
Proof: `npx vitest run src/engine/season.test.ts -t "rodada de janela dispara compras da IA"`

### S2 - Clube da IA no vermelho vende · ~2 files · ~35 KB · ~9k

**C12** - Fechar uma rodada de janela com um clube da IA de caixa −R$ 1.000.000 e 20 jogadores vende o jogador dele de maior `marketValue` pelo `marketValue`, sem o acréscimo de titular, mesmo que ele seja titular. O comprador é o clube da IA de maior sobra. A venda acontece antes das compras: o comprador também é sorteado para comprar, e a sobra usada na venda é a de antes da compra dele (AC 9, AC 10)
Proof: `npx vitest run src/engine/market.test.ts -t "vermelho vende o mais valioso"`

**C13** - Com dois compradores de mesma sobra, a venda vai ao de menor id. Um clube da IA com 30 jogadores e a maior sobra é pulado. Um comprador que passa de 22 com a venda dispensa pela regra do C8 (AC 10, L-007)
Proof: `npx vitest run src/engine/market.test.ts -t "comprador da venda do vermelho"`

**C14** - Um clube da IA de caixa negativo e 18 jogadores não vende. Um de caixa negativo e 20 jogadores sem comprador com sobra para o valor e o salário também não vende: elenco e caixa iguais aos de depois de `closeRoundFinances` (AC 9, AC 11)
Proof: `npx vitest run src/engine/market.test.ts -t "vermelho sem venda"`

**C15** - Fechar a rodada 5 (janela fechada na 6) com um clube da IA de caixa negativo não vende nada (AC 9)
Proof: `npx vitest run src/engine/market.test.ts -t "vermelho só vende com janela aberta"`

### S3 - A IA amplia estádio lotado · ~2 files · ~25 KB · ~6k

**C16** - Um clube da IA com capacidade 30.000, público 30.000 em casa, sem obra, caixa R$ 20.000.000 e folha R$ 500.000 fecha a rodada com o caixa em (valor de `closeRoundFinances`) − R$ 4.000.000 e `expansionRoundsLeft` 6. Não amplia, com o caixa só pelo fechamento: jogando fora de casa; com público 29.999; com obra em andamento; com capacidade 76.000; com caixa − 4.000.000 abaixo de 8 × folha (AC 12)
Proof: `npx vitest run src/engine/finance.test.ts -t "IA amplia estádio lotado"`

**C17** - O clube do usuário com estádio lotado, sem obra e caixa R$ 500.000.000 fecha uma rodada em casa com `expansionRoundsLeft` 0 e capacidade igual (AC 13)
Proof: `npx vitest run src/engine/finance.test.ts -t "usuário não amplia sozinho"`

**C18** - Uma data de copa, com clubes da IA de estádio lotado, caixa alto e janela aberta na próxima rodada de liga, não amplia estádio, não compra e não vende: elencos e `market.transfers` iguais, e caixa só pela bilheteria e pelo prêmio da copa (assumption «compras em data de copa»)
Proof: `npx vitest run src/engine/cup.test.ts -t "data de copa não mexe no mercado da IA"`

### S4 - O caixa da IA fica numa faixa · ~1 file · ~10 KB · ~3k

**C19** - Em 3 seeds (1, 2, 3) e 5 temporadas sem usuário, o caixa final de cada clube fica entre −2× e 12× o inicial, e a mediana entre 1× e 4×. Substitui multiplas-temporadas C53 (AC 14)
Proof: `npx vitest run src/engine/balance.test.ts -t "caixa em 5 temporadas"`

**C20** - Nas mesmas seeds e temporadas, as linhas `kind: "buy"` e `kind: "free"` das compras dos AC 3–5 (sem `fillAiSquads` e sem a venda do vermelho), contadas antes de cada virada, somam entre 50 e 600 por seed, e nenhuma temporada tem zero (AC 15)
Proof: `npx vitest run src/engine/balance.test.ts -t "compras da IA em 5 temporadas"`

**C21** - A força continua estável em 5 temporadas: a média das 18 melhores de cada divisão fica a até 4 pontos da temporada 1, e o caixa de uma temporada fica na faixa de elenco-mercado-financas C13, sem mudar as faixas desses testes (Impact)
Proof: `npx vitest run src/engine/balance.test.ts -t "força estável em 5 temporadas"`
Proof: `npx vitest run src/engine/balance.test.ts -t "caixa equilibrado em uma temporada"`

### S5 - O usuário vê o mercado da IA · ~5 files · ~60 KB · ~15k

**C22** - Cada movimento de IA anexa uma linha a `market.transfers` com todos os campos literais. Tabela: compra de clube da IA na rodada 3 → `{ round: 3, kind: "buy", playerId, playerName, fromId: <vendedor>, toId: <comprador>, amount: <preço> }`; livre contratado pela compra → `kind: "free"`, `fromId: null`, `amount` = 4 × salário; livre por `fillAiSquads` → mesmo formato; dispensa do C8 → `kind: "release"`, `toId: null`, `amount` = 4 × salário; venda do vermelho → `kind: "buy"`; proposta aceita pelo usuário → `kind: "buy"`, `fromId` = clube do usuário, `toId` = comprador, `amount` = valor da proposta, `round` = número da última rodada de liga fechada (AC 16, door 1, door 2)
Proof: `npx vitest run src/engine/market.test.ts -t "boletim registra cada movimento da IA"`

**C23** - `buyPlayer`, `releasePlayer`, `signFreeAgent` e `promoteJunior` do usuário deixam `market.transfers` com o mesmo comprimento. A tabela passa pelas quatro (AC 17, door 2)
Proof: `npx vitest run src/engine/market.test.ts -t "ações do usuário fora do boletim"`

**C24** - `nextSeason` de um save com 5 linhas no boletim devolve `market.transfers` com 0 linhas (AC 18)
Proof: `npx vitest run src/engine/rollover.test.ts -t "virada esvazia o boletim"`

**C25** - A tela Mercado tem a aba «Transferências». Com 3 linhas nas rodadas 1, 2 e 3, a lista mostra a da rodada 3 primeiro. Cada linha mostra a rodada, o nome do jogador, «Livre» no lugar de `fromId` ou `toId` nulo, o nome do clube nos outros casos, e o valor em `formatMoney`. Com a próxima rodada fora da janela, a aba continua lá e mostra as linhas (AC 19)
Proof: `npx vitest run src/ui/Market.test.tsx -t "aba transferências"`

**C26** - Com `market.transfers` vazio, a aba mostra «Nenhuma transferência nesta temporada» (AC 20)
Proof: `npx vitest run src/ui/Market.test.tsx -t "transferências vazio"`

**C27** - A lista da aba fica dentro de um elemento com a classe `fill`, a mesma que dá rolagem interna às outras listas (AD-010, AC 21)
Proof: `npx vitest run src/ui/Market.test.tsx -t "transferências rolam no painel"`

### S6 - Save v6 · ~4 files · ~35 KB · ~9k

**C28** - A fixture v5 migrada vira `schemaVersion: 6` com `market.transfers: []`. Tirando esses dois campos, o documento é igual ao v5 (`toEqual`) (AC 22, door 1)
Proof: `npx vitest run src/engine/migrate.test.ts -t "v5 vira v6"`

**C29** - Uma fixture de cada versão, v1, v2, v3 e v4, carregada vira `schemaVersion: 6` com `market.transfers: []` (AC 23)
Proof: `npx vitest run src/engine/migrate.test.ts -t "cadeia até v6"`

**C30** - Um save com `schemaVersion: 7` é recusado como incompatível, e um com 6 carrega (AC 24)
Proof: `npx vitest run src/engine/migrate.test.ts -t "versão acima de 6 incompatível"`

**C31** - Um save v6 com 2 linhas no boletim, gravado e relido pela camada de persistência (fake-indexeddb), volta com as 2 linhas iguais (door 1)
Proof: `npx vitest run src/persistence/save.test.ts -t "boletim sobrevive ao save"`

**C32** - `SCHEMA_VERSION` vale 6 e um jogo novo começa com `market.transfers: []` (door 1)
Proof: `npx vitest run src/engine/generate.test.ts -t "jogo novo com boletim vazio"`

**C33** - Os valores de `TransferRecord.kind` que o motor escreve são exatamente `"buy"`, `"free"` e `"release"`: a tabela do C22 cobre os três, e um save de 5 temporadas das seeds 1 a 3 só tem esses três valores no boletim de cada temporada (door 2)
Proof: `npx vitest run src/engine/balance.test.ts -t "boletim só com os três tipos"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| Landing doors (3) | save v6 C28 · C31 · C32 · o que entra no boletim C22 · C23 · C33 · `Rng` das compras C2 · C3 | - |
| Relations entities (1) | `TransferRecord` C22 · C24 · C28 | - |
| `TransferRecord.kind` (3) | `buy` C22 · `free` C22 · `release` C22 | - |
| fontes de linha no boletim (6) | compra IA→IA C22 · livre pela compra C22 · livre por `fillAiSquads` C22 · dispensa C22 · venda do vermelho C22 · proposta aceita C22 | - |
| ações do usuário sem linha (4) | `buyPlayer` C23 · `releasePlayer` C23 · `signFreeAgent` C23 · `promoteJunior` C23 | - |
| rodada fechada vs janela (8 bordas) | 1 C4 · 4 C4 · 17 C4 · 21 C4 · 5 C4 · 16 C4 · 22 C4 · 38 C4 | - |
| filtro de candidato (7) | força +3 C5 · força +2 C5 · 32 anos C5 · 33 anos C5 · vendedor com 19 C5 · vendedor com 18 C5 · jogador do usuário C5 · C10 | - |
| fonte do candidato (2) | clube da IA C5 · C7 · livre C5 · C7 | - |
| preço do candidato (3) | titular 1,5× C6 · reserva C6 · livre 4× salário C6 | - |
| desempate da compra (3) | força C6 · preço C6 · id C6 | - |
| borda da sobra (2) | igual C1 · acima C1 | - |
| venda do vermelho: condições (4) | caixa < 0 e > 18 C12 · 18 jogadores C14 · sem comprador C14 · janela fechada C15 | - |
| venda do vermelho: comprador (3) | maior sobra C12 · empate por id C13 · 30 jogadores pulado C13 | - |
| guardas da ampliação da IA (6) | amplia C16 · fora de casa C16 · público abaixo C16 · obra C16 · 76.000 C16 · sobra C16 | - |
| clube do usuário protegido (2) | compra C10 · ampliação C17 | - |
| tipos de data (2) | liga C4 · C11 · copa C18 | - |
| versões de save carregadas (7) | v1 C29 · v2 C29 · v3 C29 · v4 C29 · v5 C28 · v6 C30 · v7 C30 | - |
| estados da aba «Transferências» (3) | com linhas C25 · vazio C26 · janela fechada C25 | - |

- Nenhum check afirma mais do que o caso que a prova exercita. As faixas de C19–C21 e C33 são simulações com seed fixa: uma execução decide.

## Superseded checks of earlier features

| Check | What changes | Now proven by |
| --- | --- | --- |
| multiplas-temporadas C53 (caixa de 5 temporadas entre −2× e 30×, mediana entre 3× e 10×) | a faixa vira −2× a 12×, mediana 1× a 4×, no mesmo teste `caixa em 5 temporadas` | C19 |
| copa-nacional, checks de versão incompatível (acima de 5) | a versão incompatível passa a ser acima de 6 | C30 |

Regra para os outros testes existentes: um teste antigo cuja fixture passa por uma rodada de janela com clubes da IA ricos pode ter a **fixture** ajustada para zerar a sobra da IA (por exemplo, caixa da IA igual a 8 × folha), sem mudar nenhum valor esperado. Mudar um valor esperado de um teste antigo fora desta tabela é parada e pergunta.

## Swept

- validation: C1, C5 - a borda da sobra e os limites de força, idade e elenco
- failure modes: C9, C14 - tentativa sem candidato e venda sem comprador terminam sem mudar nada
- idempotency: n/a - cada rodada de liga fecha uma única vez (`currentRound` avança no mesmo passo), e a repetição da mesma rodada a partir do mesmo save dá o mesmo resultado pela door 3 (C2, C3)
- authorization: C10, C17 - o clube do usuário nunca perde jogador nem amplia estádio sem ação dele
- concurrency: C12 - a ordem dentro da rodada (venda do vermelho antes das compras) e C2 - a ordem dos clubes no sorteio; o motor roda em uma thread só
- data lifecycle: C24 - o boletim vive uma temporada; C28, C29 - migração
- dependency failure: existing - os avisos de IndexedDB do núcleo cobrem o save v6 como cobriam o v5
- state transitions: C7, C8 - jogador muda de clube ou vira livre; C16 - estádio entra em obra
- observability: C25 - o boletim é o registro visível do que a IA fez; não há log de servidor (AD-001)

## Handoff

Medido depois do build da copa-nacional, que muda os mesmos arquivos. Por arquivo, `wc -c` de hoje com +20% para o que a copa adiciona:

- Existentes lidos e mudados: `market` 14 KB, `market.test` 18, `finance` 8,5, `finance.test` 16, `types` 6,5, `migrate` 5,4, `migrate.test` 10, `rollover` 11, `rollover.test` 20, `balance.test` 7, `season` 8,5, `season.test` 3,5, `generate.test` 8,6, `cup.test` ~15, `Market.tsx` 11, `Market.test` 11, `save.test` 5,7: ~180 KB, com a copa ~215 KB → ~54k
- Código e testes novos ≈ 40 KB → ~10k
- Por fatia: S1 ≈ 19k; S2 fica em 28k acumulado, S3 em 34k, S4 em 37k, S5 em 52k e S6 em 61k. As fatias dividem os mesmos arquivos, então o total real fica perto de ~64k
- Total ≈ 64k, abaixo do budget de 150k: one builder
- Ordem: começa só depois que a copa-nacional passar no Verifier, sobre o save v5 dela
- Risco anotado: as constantes (8 rodadas, 25%, +3, 32 anos) não foram medidas. Se C19 ou C20 não fecharem, o builder ajusta só as constantes, registra a medição (mínimo, mediana, máximo e compras por temporada, por seed) aqui e não mexe nas faixas
