# Países - checks

Profile: light
Plan: `.specs/features/paises/plan.md`

## Intent

33 checks in 8 slices · 5 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`). Telas usam `@testing-library/react` em jsdom. Todo valor esperado é literal ou calculado no próprio teste, nunca pela função de produção sob teste (L-004). «Todo», «cada» e «todas» são provados por tabela sobre o conjunto inteiro (L-005). Lições aplicadas: L-003 (fiação pelo ponto de entrada), L-007 (fixture com o membro excluído), L-009 (door nova no build ganha check), L-015 (contagem contra total independente), L-018 (fixture em que os valores candidatos diferem).

Este plano é construído depois de ajustes-4a, sobre o save v6. «Snapshot v6» é um arquivo de fixture gravado pelo builder **antes** de mudar o motor, a partir do `HEAD` de então: para as seeds 1, 2 e 3, a Série A, a Série B, o mercado e o `rngState` de `newGame(seed)`, e os placares das rodadas 1 e 2 das duas divisões depois de `playRound`. As doors 2 e 3 são provadas contra ele.

## Checks

### S1 - Dois países novos no jogo novo · ~4 files · ~60 KB · ~15k

**C1** ✓ - `newGame(1)` tem `leagues` com 4 elementos, ids `l1`, `l2`, `l3`, `l4`, `country` `BR`, `BR`, `AR`, `PT` e `tier` 0, 1, 0, 0, nessa ordem (AC 1, door 1)
Proof: `npx vitest run src/engine/generate.test.ts -t "quatro ligas em ordem"`

**C2** ✓ - A Liga Argentina tem os clubes `c41`–`c60` e a Liga Portuguesa `c61`–`c80`, 20 cada, e cada um dos 40 tem 22 jogadores no formato de elenco atual (3 GK, 7 DF, 7 MF, 5 FW, literal no teste) (AC 2)
Proof: `npx vitest run src/engine/generate.test.ts -t "ligas novas com 20 clubes de 22"`

**C3** ✓ - `AR_IDENTITIES` e `PT_IDENTITIES` têm 20 nomes cada, sem repetição entre si nem com a Série A e a Série B; cada identidade tem de 1 a 3 cores e um padrão; os nomes dos clubes de cada liga nova são exatamente os da sua lista; nenhum nome contém um nome de clube real da lista de negação do teste (pelo menos River, Boca, Racing, Independiente, San Lorenzo, Vélez, Estudiantes, Newell's, Rosario Central, Huracán, Benfica, Porto, Sporting, Braga, Vitória, Boavista, Marítimo, Belenenses) (AC 3)
Proof: `npx vitest run src/engine/generate.test.ts -t "identidades fictícias dos países novos"`

**C4** ✓ - Em `newGame(1)`, o primeiro nome de todo jogador da Liga Argentina está na lista `AR` e o de todo jogador da Liga Portuguesa na lista `PT`; as listas `AR`, `PT` e `BR` são diferentes; nenhum nome de jogador se repete entre as 4 ligas, livres e juniores (AC 4, door 4)
Proof: `npx vitest run src/engine/generate.test.ts -t "nomes de jogador por país"`

**C5** ✓ - A força-base da Liga Argentina é `{ min: 60, max: 76 }` e a da Liga Portuguesa `{ min: 58, max: 80 }`. Em `newGame(1)`, a diferença entre a média de força do clube mais forte e a do mais fraco é de pelo menos 10 pontos em cada liga nova (AC 5)
Proof: `npx vitest run src/engine/generate.test.ts -t "força dos países novos"`

**C6** ✓ - Para as seeds 1, 2 e 3, `newGame(seed)` tem Série A, Série B, mercado e `rngState` iguais (`toEqual`) aos do snapshot v6, depois de tirar `country` e `tier` das duas ligas (AC 6, door 3, door 4)
Proof: `npx vitest run src/engine/generate.test.ts -t "Brasil igual ao snapshot v6"`

### S2 - As quatro ligas jogam a mesma rodada · ~5 files · ~90 KB · ~23k

**C7** - Depois de `playRound` num jogo novo, as 4 ligas têm `currentRound` 1 e as 10 partidas da rodada 1 de cada uma têm resultado (AC 7)
Proof: `npx vitest run src/engine/season.test.ts -t "quatro ligas jogam a rodada"`

**C8** - O placar da partida `i` da rodada 1 da Liga Argentina e da Liga Portuguesa é o de `simulateMatch` com o `Rng` de `matchSeed` sobre a base `mix32(mix32(rngState, 0xE0), k)`, com `k` 2 e 3, recalculado no teste pela fórmula literal. Os placares da Série A e da Série B nas rodadas 1 e 2 são iguais aos do snapshot v6 (AC 8, door 2)
Proof: `npx vitest run src/engine/live.test.ts -t "semente das ligas novas"`

**C9** - Ao fechar a rodada 1, um clube da Liga Argentina e um da Liga Portuguesa têm `lastRound.sponsorship` igual ao `finance.sponsorship` inteiro. Ao fechar a rodada 38, o prêmio de cada clube das duas ligas é (21 − posição) × R$ 250.000 (AC 9)
Proof: `npx vitest run src/engine/finance.test.ts -t "patrocínio e prêmio dos países novos"`

**C10** - O chaveamento da copa nacional de um jogo novo tem 40 ids, todos das ligas `BR`; nenhum `c41`–`c80` aparece nele nem em nenhum confronto sorteado da temporada (AC 10)
Proof: `npx vitest run src/engine/cup.test.ts -t "copa nacional só com o Brasil"`

### S3 - Virada por país · ~2 files · ~40 KB · ~10k

**C11** - Depois de uma temporada inteira e `nextSeason`, a Série A e a Série B trocaram 4 clubes cada uma, e os conjuntos de ids da Liga Argentina e da Liga Portuguesa são iguais aos de antes (AC 11)
Proof: `npx vitest run src/engine/rollover.test.ts -t "sobe e desce só no Brasil"`

**C12** - O registro da temporada no histórico tem 4 `divisions`, com `leagueId` `l1`–`l4`, campeão e artilheiro em cada; as de `l3` e `l4` têm `promotedIds` e `relegatedIds` vazios (AC 12)
Proof: `npx vitest run src/engine/rollover.test.ts -t "histórico com as quatro ligas"`

### S4 - Diretoria e emprego em qualquer país · ~3 files · ~45 KB · ~11k

**C13** - Tabela da meta num clube da Liga Argentina ou da Liga Portuguesa pelo posto no ranking de força da liga: posto 1 → 4; posto 10 → 13; posto 17 → 20; posto 20 → 20. O rótulo é «até o 4º», «até o 13º», «até o 20º» (AC 13)
Proof: `npx vitest run src/engine/board.test.ts -t "meta em liga sem rebaixamento"`

**C14** - Tabela do veredito numa liga sem rebaixamento, com meta 16: posição 16 → cumprida; 17 → não cumprida; 20 → não cumprida (na Série A, com meta 16, a posição 17 demite). Com meta 8: posição 13 → demitido; 12 → não cumprida (AC 14, L-007)
Proof: `npx vitest run src/engine/board.test.ts -t "veredito em liga sem rebaixamento"`

**C15** - `jobOffers` rankeia os 80 clubes: para um usuário no posto `p` do ranking de força de todos, as ofertas são os postos `p+1` a `p+3`, calculados no teste a partir das médias dos 11 melhores. Numa seed escolhida pelo teste, pelo menos uma das 3 ofertas é de um clube `c41`–`c80` (AC 15)
Proof: `npx vitest run src/engine/board.test.ts -t "propostas de emprego de qualquer país"`

**C16** - `userCupGoal` de um usuário da Série A usa o posto no ranking de força só dos 40 clubes do Brasil (fixture em que o posto entre os 80 e entre os 40 dão metas diferentes). Um usuário da Liga Argentina ou da Liga Portuguesa tem meta de copa -1 (AC 16, L-018)
Proof: `npx vitest run src/engine/board.test.ts -t "meta de copa só com o Brasil"`

### S5 - Mercado com o mundo · ~4 files · ~70 KB · ~18k

**C17** - Com a janela aberta, um usuário da Série A compra um jogador da Liga Argentina pelo preço pedido: o jogador chega com `contractSeasons` 3, o caixa do usuário cai o preço e o do vendedor sobe o preço (AC 17)
Proof: `npx vitest run src/engine/market.test.ts -t "comprar de clube de outro país"`

**C18** - Na lista «Comprar», o filtro de país começa no país do clube do usuário (Brasil para Série A ou B, Argentina, Portugal) e, ao trocar para «Portugal», lista só jogadores de clubes `c61`–`c80`: 20 × 22 linhas, contadas contra os elencos (AC 18, L-015)
Proof: `npx vitest run src/ui/Market.test.tsx -t "filtro de país na lista comprar"`

**C19** - Numa compra da IA de um clube do Brasil, o melhor candidato elegível está num clube da Argentina e o segundo num do Brasil: a IA compra o do Brasil. Na venda do vermelho de um clube de Portugal, o clube de maior sobra de todos é do Brasil e o de maior sobra de Portugal recebe a venda (AC 19, L-007)
Proof: `npx vitest run src/engine/market.test.ts -t "IA negocia só no próprio país"`

**C20** - Um usuário da Liga Portuguesa com jogadores à venda recebe propostas só de clubes `c61`–`c80`, em 20 rodadas de janela de uma seed fixa (AC 20)
Proof: `npx vitest run src/engine/market.test.ts -t "propostas vêm da liga do usuário"`

### S6 - Telas com as quatro ligas · ~8 files · ~90 KB · ~23k

**C21** - A tela de escolha de clube tem as abas «Série A», «Série B», «Liga Argentina» e «Liga Portuguesa»; a aba «Liga Portuguesa» lista os 20 clubes dela, e escolher um deles faz dele o clube do usuário. A tela Tabela tem as 4 ligas para escolher e abre na liga do usuário (AC 21)
Proof: `npx vitest run src/ui/ChooseClub.test.tsx -t "abas das quatro ligas"`
Proof: `npx vitest run src/ui/Round.test.tsx -t "tabela escolhe entre as quatro ligas"`

**C22** - A tela Histórico mostra, numa temporada fechada, o campeão das 4 ligas com o nome de cada liga; a tela Fim e a Nova temporada mostram «Liga Portuguesa» como a liga de um usuário de Portugal, e a meta com «até o Nº». O conteúdo de cada uma fica dentro de um elemento com a classe `fill` (AC 22, AD-010)
Proof: `npx vitest run src/ui/History.test.tsx -t "campeões das quatro ligas"`
Proof: `npx vitest run src/ui/End.test.tsx -t "fim com usuário em Portugal"`
Proof: `npx vitest run src/ui/NewSeason.test.tsx -t "nova temporada com usuário em Portugal"`

**C23** - Pelo app: escolher um clube da Liga Portuguesa, jogar uma rodada e abrir a Tabela mostra a Liga Portuguesa com 20 linhas, e o clube do usuário nela (AC 21, L-003)
Proof: `npx vitest run src/app.test.tsx -t "usuário em Portugal joga e vê a tabela"`

### S7 - Equilíbrio dos países novos · ~1 file · ~12 KB · ~3k

**C24** ✓ - Em 3 seeds (1, 2, 3) e 5 temporadas sem usuário, o caixa final de cada clube da Liga Argentina e da Liga Portuguesa fica entre −2× e 15× o inicial, e a mediana de cada liga entre 1,2× e 4× (AC 23; piso renegociado de 2× pelo autor em 27/09/2026 após medir PT 1,67× e AR 3,19×)
Proof: `npx vitest run src/engine/balance.test.ts -t "caixa em 5 temporadas dos países novos"`

**C25** ✓ - Nas mesmas seeds e temporadas, a média das 18 melhores da Liga Argentina e da Liga Portuguesa fica a até 5 pontos da temporada 1, em toda temporada (AC 24)
Proof: `npx vitest run src/engine/balance.test.ts -t "força estável dos países novos"`

**C26** ✓ - As faixas do Brasil continuam: caixa em 5 temporadas, compras em 5 temporadas, força estável e resultado corrente de uma temporada, medidas só sobre os clubes das ligas `BR`, com os limites de hoje (AC 25)
Proof: `npx vitest run src/engine/balance.test.ts -t "caixa em 5 temporadas"`
Proof: `npx vitest run src/engine/balance.test.ts -t "compras da IA em 5 temporadas"`
Proof: `npx vitest run src/engine/balance.test.ts -t "força estável em 5 temporadas"`
Proof: `npx vitest run src/engine/balance.test.ts -t "caixa equilibrado em uma temporada"`

### S8 - Save v7 · ~4 files · ~50 KB · ~13k

**C27** - A fixture v6 na rodada 0 migrada vira `schemaVersion: 7`: `leagues[2]` e `leagues[3]` são iguais (`toEqual`) às de `newGame(seed)` da mesma seed; Série A e Série B ganham `country: "BR"` e `tier` 0 e 1; tirando esses campos e as duas ligas novas, o documento é igual ao v6 (AC 26, door 1, door 5)
Proof: `npx vitest run src/engine/migrate.test.ts -t "v6 vira v7 na rodada 0"`

**C28** - A fixture v6 na rodada 12 migrada tem as ligas novas com `currentRound` 12; o placar da partida `i` da rodada `n < 12` de cada liga nova é o de `runToEnd` com a door 2 sobre `mix32(seed, 10)`, recalculado no teste; cada clube novo tem o caixa de `initialFinance` do elenco e todo jogador novo `fitness` 100; nada da Série A, Série B, mercado, copa e usuário muda (AC 27, door 5)
Proof: `npx vitest run src/engine/migrate.test.ts -t "v6 no meio da temporada ganha os países"`

**C29** ✓ - Uma fixture de cada versão, v1 a v5, carregada vira `schemaVersion: 7` com 4 ligas (AC 28)
Proof: `npx vitest run src/engine/migrate.test.ts -t "cadeia até v7"`

**C30** ✓ - Um save com `schemaVersion: 8` é recusado como incompatível, e um com 7 carrega (AC 29)
Proof: `npx vitest run src/engine/migrate.test.ts -t "versão acima de 7 incompatível"`

**C31** - Um save v7 de um jogo novo com o usuário na Liga Argentina, gravado e relido pela camada de persistência (fake-indexeddb), volta igual, com `country` e `tier` nas 4 ligas (door 1)
Proof: `npx vitest run src/persistence/save.test.ts -t "save v7 com países"`

**C32** ✓ - `SCHEMA_VERSION` vale 7 (door 1)
Proof: `npx vitest run src/engine/generate.test.ts -t "quatro ligas em ordem"`

**C33** ✓ - Nenhuma liga de um save de 5 temporadas das seeds 1 a 3 tem clube com `country` diferente do da liga em que começou: um clube nunca muda de país (door 1)
Proof: `npx vitest run src/engine/balance.test.ts -t "clube nunca muda de país"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| Landing doors (5) | save v7 C1 · C27 · C31 · C32 · C33 · semente das ligas novas C8 · fluxos de geração C6 · nomes por país C4 · C6 · migração v6 → v7 C27 · C28 | - |
| Relations entities (3) | `League.country`/`tier` C1 · `Country` via `COUNTRIES` C18 · C21 · `DivisionRecord` por liga C12 | - |
| ligas (4) | Série A C6 · C26 · Série B C6 · C26 · Liga Argentina C2 · C24 · Liga Portuguesa C2 · C24 | - |
| países (3) | BR C10 · C16 · C26 · AR C4 · C19 · PT C4 · C20 | - |
| leitores do nível no lugar do índice (6) | patrocínio C9 · prêmio C9 · meta C13 · veredito C14 · sobe e desce C11 · rótulo de tela C22 | - |
| postos da meta sem rebaixamento (4) | 1 C13 · 10 C13 · 17 C13 · 20 C13 | - |
| veredito sem rebaixamento (5) | cumprida C14 · não cumprida C14 · posição 20 C14 · demitido C14 · contraste com Série A C14 | - |
| negociação da IA por país (2) | compra C19 · venda do vermelho C19 | - |
| telas com as 4 ligas (5) | ChooseClub C21 · Tabela C21 · C23 · Histórico C22 · Fim C22 · Nova temporada C22 | - |
| versões de save carregadas (8) | v1 C29 · v2 C29 · v3 C29 · v4 C29 · v5 C29 · v6 C27 · C28 · v7 C30 · v8 C30 | - |
| faixas do equilíbrio (3 conjuntos) | caixa dos países novos C24 · força dos países novos C25 · Brasil C26 | - |

- Nenhum check afirma mais do que o caso que a prova exercita. As faixas de C24–C26 e C33 são simulações com seed fixa: uma execução decide.

## Superseded checks of earlier features

| Check | What changes | Now proven by |
| --- | --- | --- |
| literais de versão do save (gastos-da-ia C28 «v5 vira v6», C29 «cadeia até v6», C30 «versão acima de 6 incompatível», C32 «jogo novo com boletim vazio»; `save.test` «documento tem schemaVersion 5 com copa» e «carrega save v1 migrado»; Home.test «save de versão 7 incompatível») | `schemaVersion` esperado passa de 6 para 7, e a versão incompatível de 7 para 8; o que cada teste assegura sobre o boletim e a copa continua igual | C29, C30, C32 |
| contagens de ligas e clubes (testes que esperam `leagues` com 2 elementos, 40 clubes, 40 ids únicos, «lista Comprar» com 39 × 22 + 40 linhas) | passam a 4 ligas, 80 clubes, 80 ids e 79 × 22 + 40 linhas | C1, C2, C18 |
| multiplas-temporadas AC 34 (`jobOffers` sobre 40 clubes) | o ranking passa a ter 80 clubes; os ids esperados são recalculados no teste pela mesma regra | C15 |
| balance «caixa em 5 temporadas», «compras da IA em 5 temporadas», «força estável em 5 temporadas», «caixa equilibrado em uma temporada» | medem só os clubes das ligas `BR` (antes todas as ligas eram do Brasil); limites iguais | C26 |
| testes que usam `DIVISION_LABEL[i]` ou o índice da liga como divisão | passam a ler o rótulo da liga e o `tier` | C9, C13, C22 |

Regra para os outros testes existentes: um teste antigo pode ter a **fixture** ajustada para o mundo de 4 ligas (por exemplo, zerar a sobra da IA também nas ligas novas, ou filtrar `allClubs` pelas ligas `BR` onde ele só fala do Brasil), sem mudar nenhum valor esperado. Mudar um valor esperado fora desta tabela é parada e pergunta.

## Swept

- validation: C3, C4, C5 - identidades, nomes e força dentro dos limites
- failure modes: existing - a gravação que falha é tratada pela store como hoje; C31 prova o save v7 inteiro
- idempotency: C27, C28 - a migração da mesma fixture dá sempre o mesmo resultado pelas doors 3 e 5; cada rodada fecha uma vez
- authorization: n/a - jogo local de um jogador, sem conta
- concurrency: n/a - o motor roda numa thread só; as 4 ligas fecham na ordem do array
- data lifecycle: C12 - o histórico ganha as 4 ligas por temporada; C27, C28 - migração
- dependency failure: existing - os avisos de IndexedDB do núcleo cobrem o save v7
- state transitions: C11, C33 - clube muda de divisão só dentro do país e nunca de país
- observability: C22 - histórico e fim mostram o que aconteceu nas 4 ligas

## Handoff

- Arquivos existentes lidos e mudados: motor (`types`, `generate`, `names`, `live`, `season`, `finance`, `board`, `rollover`, `migrate`, `market`, `cup`, `calendar`) e seus testes, `balance.test`, `board.test`, `save.test`, `store`, telas `ChooseClub`, `Table`, `History`, `End`, `NewSeason`, `Market` e seus testes, `app.test`: 419 KB → ~105k
- Código e testes novos (identidades e nomes de 2 países, snapshot v6, testes) ≈ 70 KB → ~18k
- Por fatia: S1 ≈ 15k; S2 em 38k acumulado; S3 em 48k; S4 em 59k; S5 em 77k; S6 em 100k; S7 em 103k; S8 em 116k. As fatias dividem arquivos, então o total real fica perto de ~123k
- Total ≈ 123k, abaixo do budget de 150k: one builder. Margem pequena; se houver compactação, o builder relê `checks.md` e o diff antes de seguir (build.md)
- Ordem: começa depois de ajustes-4a verificada
- Risco anotado: as faixas de C24–C26 não foram medidas. Se alguma falhar, o builder para e traz a medição; não mexe em constante nem em faixa
