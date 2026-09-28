# Copa Continental - checks

Profile: light
Plan: `.specs/features/copa-continental/plan.md`

27 checks in 4 slices · 3 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`) e, para o layout, `npm run check:layout`, cujo código de saída decide. Todo valor esperado é literal ou calculado no próprio teste, nunca pela função de produção sob teste (L-004). O ranking de força vem de `board.strengthRanking`, que tem prova própria e não é a função sob teste aqui. Tabelas cobrem o conjunto inteiro (L-005). Lições aplicadas: L-003 (fiação pela tela ou pelo ponto de entrada), L-007 (fixture com o membro que deve ficar de fora), L-009 (cada door tem check próprio), L-020 e L-021 (tabela de Superseded com toda asserção antiga sobre as coleções que mudam).

## Checks

### S1 - A Copa Continental existe com os classificados certos · 9 files · 129 KB · ~32k

**C1** - ✓ Num jogo novo, `cups[1]` tem id `"cup-cont"`, nome «Copa Continental», fases `["Oitavas", "Quartas", "Semifinal", "Final"]` nessa ordem, `afterLeagueRound` `[7, 13, 25, 31]` e `currentPhase` 0; `cups[0]` continua com id `"cup-nat"` (AC 1, AC 9, door 1, AD-013)
Proof: `npx vitest run src/engine/continental.test.ts -t "continental no jogo novo"`

**C2** - ✓ Num jogo novo, o conjunto dos 16 classificados é: os 6 primeiros de `strengthRanking` da Série A, os 5 primeiros da Liga Argentina e os 5 primeiros da Liga Portuguesa; o 7º da Série A e o 6º de cada liga de fora não estão nele, e nenhum clube da Série B está (AC 2, L-007)
Proof: `npx vitest run src/engine/continental.test.ts -t "classificados do jogo novo pelo ranking de força"`

**C3** - ✓ O `seeding` da continental de um jogo novo é exatamente `[BR1, AR1, PT1, BR2, AR2, PT2, BR3, AR3, PT3, BR4, AR4, PT4, BR5, AR5, PT5, BR6]`, com BRn, ARn e PTn montados no teste pela colocação de cada país (AC 5)
Proof: `npx vitest run src/engine/continental.test.ts -t "seeding intercalado por país"`

**C4** - ✓ Tabela pela virada (`nextSeason`), com o campeão da Copa Nacional em três situações: (a) um clube da Série B → os brasileiros são ele e os 5 primeiros da tabela final da Série A, e o 6º da Série A fica de fora; (b) o 3º da Série A → os brasileiros são os 6 primeiros da tabela final da Série A, e o 7º fica de fora; (c) o 9º da Série A → os brasileiros são ele e os 5 primeiros, e o 6º fica de fora. Em todos, o campeão é BR1 no `seeding` (AC 3, AC 5, L-007)
Proof: `npx vitest run src/engine/continental.test.ts -t "vagas brasileiras na virada"`

**C5** - ✓ Pela virada, os argentinos são os 5 primeiros da tabela final da Liga Argentina e os portugueses os 5 primeiros da tabela final da Liga Portuguesa, lidos no teste da tabela final da revisão; o 6º de cada uma fica de fora, mesmo quando é mais forte pelo ranking de força que o 5º (AC 4, L-007)
Proof: `npx vitest run src/engine/continental.test.ts -t "vagas de fora pela tabela final"`

**C6** - ✓ Para 50 seeds, num jogo novo e depois de uma virada: as Oitavas já têm 8 confrontos sem resultado, os 16 clubes dos confrontos são exatamente o `seeding`, cada um aparece uma vez, e nenhum confronto tem dois clubes do mesmo país; Quartas, Semifinal e Final estão vazias (AC 6)
Proof: `npx vitest run src/engine/continental.test.ts -t "oitavas sem confronto do mesmo país"`

**C7** - ✓ Fechada uma fase da continental: a próxima tem metade dos confrontos, seus clubes são exatamente os vencedores da fase fechada, e em cada confronto o mandante é o clube mais abaixo no `seeding`; em 50 seeds, ao menos um confronto das Quartas junta dois clubes do mesmo país (AC 7)
Proof: `npx vitest run src/engine/continental.test.ts -t "fases seguintes sorteadas entre os vencedores"`

**C8** - ✓ Door 2: a semente de sorteio da continental é `mix32(mix32(rngState, 0xd1), fase)` e a de partida é `mix32(mix32(rngState, 0xc1), fase * 32 + confronto)`, calculadas no teste com `mix32` para 3 valores de `rngState`; as da nacional continuam `0xd0` e `0xc0`; dois jogos novos com a mesma seed têm `cups[1]` igual, e seeds diferentes dão Oitavas diferentes em ao menos uma de 10 (AC 8, door 2)
Proof: `npx vitest run src/engine/continental.test.ts -t "sementes da continental"`

### S2 - A Copa Continental se joga no calendário · 7 files · 72 KB · ~18k

**C9** - ✓ Jogando uma temporada inteira sem decisões a partir de um jogo novo, a sequência das datas é exatamente: 4 rodadas, C0, 3 rodadas, K0, 3 rodadas, C1, 3 rodadas, K1, 3 rodadas, C2, 6 rodadas, C3, 3 rodadas, K2, 3 rodadas, C4, 3 rodadas, K3, 3 rodadas, C5, 4 rodadas - 48 datas (C = nacional, K = continental); no fim, `cups[0].currentPhase` é 6 e `cups[1].currentPhase` é 4 (AC 9)
Proof: `npx vitest run src/engine/calendar.test.ts -t "sequência das 48 datas"`

**C10** - ✓ Pela tela, com o clube do usuário classificado e o jogo parado depois da rodada 7: apertar «Jogar rodada» abre a tela ao vivo com o título `Ao vivo · Copa Continental · Oitavas` (AC 10, L-003)
Proof: `npx vitest run src/ui/Live.test.tsx -t "continental ao vivo para o classificado"`

**C11** - ✓ Pela tela, com o clube do usuário fora da continental e o jogo parado depois da rodada 7: apertar «Jogar rodada» não abre a tela ao vivo, e a continental passa a `currentPhase` 1 com as 8 Oitavas decididas (AC 11, L-007)
Proof: `npx vitest run src/ui/Live.test.tsx -t "continental fecha sem tela para quem não joga"`

**C12** - ✓ Tabela das 4 fases pelo ponto de entrada da data (`playDate`): para cada confronto, o caixa do vencedor sobe o prêmio da fase (Oitavas 800.000, Quartas 1.500.000, Semifinal 2.500.000, Final 5.000.000) mais a renda se foi mandante; o caixa do perdedor sobe só a renda se foi mandante, e nada se foi visitante; `lastRound.cupPrize` mostra o prêmio (AC 12, L-003, L-005)
Proof: `npx vitest run src/engine/continental.test.ts -t "prêmio de cada fase da continental"`

**C13** - ✓ Depois de uma data da continental em que um jogador recebe um cartão amarelo, `cupDiscipline["cup-cont"].yellowCards` dele sobe 1, e `yellowCards` da liga e `cupDiscipline["cup-nat"]` ficam iguais aos de antes (AC 13)
Proof: `npx vitest run src/engine/continental.test.ts -t "cartão da continental conta só nela"`

**C14** - ✓ Com um jogador do usuário suspenso na Copa Nacional (`cupDiscipline["cup-nat"].suspendedRounds` 1) e outro suspenso na continental, o lado do usuário numa partida da continental escala o primeiro e não o segundo (AC 14, L-007)
Proof: `npx vitest run src/engine/continental.test.ts -t "suspensão da nacional não vale na continental"`

**C15** - ✓ Com a mesma temporada da liga e da Copa Nacional, a revisão dá o mesmo `verdict` ao usuário campeão da continental e ao usuário eliminado nas Oitavas dela, para uma meta de liga cumprida e para uma não cumprida (AC 15)
Proof: `npx vitest run src/engine/continental.test.ts -t "veredito não lê a continental"`

### S3 - As telas mostram as duas copas · 12 files · 125 KB · ~31k

**C16** - ✓ Na tela Copa há exatamente duas abas, «Copa Nacional» e «Copa Continental»; na aba nacional aparecem as 6 regiões de fase dela, e na continental as 4 («Oitavas», «Quartas», «Semifinal», «Final»), com os confrontos sorteados de cada uma (AC 16)
Proof: `npx vitest run src/ui/Cup.test.tsx -t "duas abas com as fases de cada copa"`

**C17** - ✓ Tabela: com o clube do usuário no `seeding` da continental, a tela Copa abre com o título «Copa Continental»; com um clube classificado só para a nacional, abre com «Copa Nacional»; sem clube, abre com «Copa Nacional» (AC 17)
Proof: `npx vitest run src/ui/Cup.test.tsx -t "aba inicial da tela Copa"`

**C18** - ✓ Na aba continental, cada um dos 16 clubes das Oitavas tem ao lado a sigla do seu país, lida no teste da liga do clube: «BRA», «ARG» ou «POR»; a aba nacional não mostra sigla (AC 18)
Proof: `npx vitest run src/ui/Cup.test.tsx -t "sigla do país na continental"`

**C19** - ✓ Tabela: usuário de um clube argentino na aba «Copa Nacional» → «Fora da competição»; usuário de um clube brasileiro não classificado na aba «Copa Continental» → «Fora da competição»; usuário classificado ainda vivo → «Na disputa» (AC 19, L-007)
Proof: `npx vitest run src/ui/Cup.test.tsx -t "fora da competição"`

**C20** - ✓ Tabela pela tela Fim: continental com `userReached` 0 → «Sua campanha: Oitavas», 1 → «Quartas», 3 → «Final», 4 → «Campeão»; nacional com 3 → «Quartas», 5 → «Final», 6 → «Campeão»; na região «Copa Continental» nunca aparece «16 avos» nem «Preliminar» (AC 20)
Proof: `npx vitest run src/ui/End.test.tsx -t "campanha com as fases de cada copa"`

**C21** - ✓ Na tela Histórico, a tabela «Campeões» tem a coluna «Copa Continental»; numa temporada fechada com continental ela mostra o nome do campeão lido do registro, e numa temporada com `cups` só da nacional mostra «-» (AC 21)
Proof: `npx vitest run src/ui/History.test.tsx -t "coluna da Copa Continental"`

**C22** - ✓ Tabela pela tela Nova temporada: clube do usuário no `seeding` da nova continental → a linha da temporada contém «Copa Continental»; não classificado → não contém (AC 22)
Proof: `npx vitest run src/ui/NewSeason.test.tsx -t "classificação para a continental"`

**C23** - ✓ `npm run check:layout` sai com 0 e imprime a linha `cupCont`, medida depois de clicar na aba «Copa Continental», com `scrollHeight` ≤ 700 e `scrollWidth` ≤ 400 (AC 23, AD-010)
Proof: `npm run check:layout`

### S4 - Um save antigo ganha a continental · 3 files · 42 KB · ~11k

**C24** - ✓ Um save v7 carregado por `migrateSave` sai com `schemaVersion` 8 e `cups[1]` com id `"cup-cont"` e o mesmo conjunto de classificados do C2, calculado no teste pelo `strengthRanking` das ligas do save; um documento v8 passa sem mudança (AC 24, door 3)
Proof: `npx vitest run src/engine/migrate.test.ts -t "v7 para v8 cria a continental"`

**C25** - ✓ Um save v7 parado depois da rodada 14 migra com as Oitavas e as Quartas da continental jogadas (todos os confrontos com `winnerId`), as Semifinais sorteadas e `currentPhase` 2; o `cash` de todo clube e o `fitness`, o `injuryRounds` e o `cupDiscipline` de todo jogador são iguais aos do save v7 (AC 25, door 3)
Proof: `npx vitest run src/engine/migrate.test.ts -t "v7 no meio da temporada joga as fases passadas só com placar"`

**C26** - ✓ Depois da migração v7 → v8, `history` e `cups[0]` são iguais (deep equal) aos do save v7 (AC 26, door 3)
Proof: `npx vitest run src/engine/migrate.test.ts -t "v7 para v8 não mexe no histórico nem na nacional"`

**C27** - ✓ Um jogo novo gravado e lido pela persistência volta com `schemaVersion` 8 e `cups` de tamanho 2, ids `["cup-nat", "cup-cont"]` (door 1)
Proof: `npx vitest run src/persistence/save.test.ts -t "save v8 com as duas copas"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| fases da continental (4) | nomes C1 · âncoras C1, C9 · prêmios C12, table-driven sobre as 4 | - |
| origens das vagas (4) | ranking de força no jogo novo C2 · campeão da nacional C4 · tabela da Série A C4 · tabelas de fora C5 | - |
| posição do campeão da nacional (3) | Série B C4 · dentro dos 6 da Série A C4 · fora dos 6 C4 | - |
| países (3) | BR C2, C18 · AR C2, C18 · PT C2, C18 | - |
| momentos de criação (3) | jogo novo C1, C6 · virada C4, C6 · migração C24 | - |
| regra de sorteio (2) | Oitavas com restrição C6 · fases seguintes livres C7 | - |
| resultado do confronto para o caixa (4) | vencedor mandante C12 · vencedor visitante C12 · perdedor mandante C12 · perdedor visitante C12 | - |
| disciplinas (3) | liga C13 · nacional C13, C14 · continental C13, C14 | - |
| participação do usuário numa data (2) | joga C10 · não joga C11 | - |
| abas da tela Copa (2) | nacional C16, C17 · continental C16, C17, C18 | - |
| situação na aba (3) | fora (AR na nacional) C19 · fora (BR na continental) C19 · na disputa C19 | - |
| campanha na tela Fim (7) | cont 0 C20 · cont 1 C20 · cont 3 C20 · cont 4 C20 · nac 3 C20 · nac 5 C20 · nac 6 C20 | - |
| temporadas no Histórico (2) | com continental C21 · sem continental C21 | - |
| classificação na Nova temporada (2) | classificado C22 · não classificado C22 | - |
| efeitos da migração (4) | versão e copa C24 · fases passadas C25 · sem dinheiro nem condição C25 · histórico e nacional intactos C26 | - |
| doors (3) | door 1 C1, C27 · door 2 C8 · door 3 C24, C25, C26 | - |

- O AC 11 é provado pela tela (C11) e reaproveita a regra da Copa Nacional; o C11 exercita só a continental, sem afirmar nada da nacional.
- Nenhum check afirma mais do que o caso que a prova exercita.

## Superseded checks of earlier features

| Check | What changes | Now proven by |
| --- | --- | --- |
| copa-nacional, calendário de 44 datas (`calendar.test.ts` «sequência das 44 datas») | a temporada tem 48 datas; a sequência ganha K0-K3 | C9 |
| asserções de `SCHEMA_VERSION` / `schemaVersion` igual a 7 como versão atual (`generate.test.ts:204, 207, 242, 243`; `migrate.test.ts:20, 134, 227, 289, 362, 396, 433`; `save.test.ts:37, 121, 135, 206`) | a versão atual passa a 8; asserções sobre versões intermediárias de fixture (ex.: `migrate.test.ts:307, 359, 430`) não mudam | C24, C27 |
| `rollover.test.ts:461` `cups` com tamanho 1 depois da virada | tamanho 2; as linhas seguintes sobre `cups[0]` não mudam | C4, C6 |
| `save.test.ts:38` `cups` com tamanho 1 | tamanho 2 | C27 |
| audit de migrações que comparam o documento final inteiro a um v7 (se houver em `migrate.test.ts`) | ganham `cups[1]` | C24 |
| _achado na build_ - limite de versão incompatível (`migrate.test.ts` «versão acima de 7 incompatível» e «v5 passa direto», `save.test.ts` «sem save e save incompatível», `Home.test.tsx` «save de versão 6 incompatível») | a primeira versão desconhecida passa de 8 a 9, e um v8 passa direto | C24, C27 |
| _achado na build_ - documentos antigos comparados de volta (`migrate.test.ts` `backToV6` e «v5 vira v6»; `test-fixtures.ts` `onlyBrazil`) | o documento migrado perde também a `cups[1]` antes da comparação; um documento anterior ao v8 não tem continental | C24, C26 |
| _achado na build_ - `rollover.test.ts` «histórico da temporada» e «copa no histórico» | `SeasonRecord.cups` ganha o registro da continental depois do da nacional (Flow hop 6) | C4, C21 |
| _achado na build_ - asserções que acham o campeão de liga por texto na tela Fim (`End.test.tsx` «fim com usuário em Portugal», `app.test.tsx` «recarregar no fim mostra o mesmo resumo») | o campeão da continental pode ser o de uma liga; a busca fica dentro do quadro da liga, sem mudar o valor esperado | C20 |
| _achado na build_ - fixtures que dependiam do calendário de 44 datas (`cup.test.ts` `season`, `Live.test.tsx` «disputa de pênaltis soa pela tela ao vivo») | `season` só junta as datas da nacional; a disputa passa à seed 3, 10º confronto, porque a data da continental muda os elencos antes; nenhum valor esperado muda | C9 |
| _achado na build_ - `History.test.tsx` «campeões por temporada» | a linha ganha a coluna «Copa Continental», com «-» nas temporadas sem continental | C21 |

Regra para os outros testes existentes: mudar um valor esperado fora das linhas acima é parada e pergunta.

## Swept

- validation: n/a - nenhuma entrada nova do usuário; as vagas vêm de tabelas do motor
- failure modes: C25 - migração no meio da temporada sem dinheiro nem condição; C11 - data sem o usuário
- idempotency: C24 - um documento v8 passa pela migração sem mudança; C8 - mesma seed, mesma copa
- authorization: n/a - jogo local de um jogador, sem conta
- concurrency: C9 - as fases das duas copas nunca caem na mesma data
- data lifecycle: C4, C6 - a virada recria a continental; C21 - o registro de cada temporada guarda o campeão
- dependency failure: n/a - nenhuma dependência externa
- state transitions: C7, C9 - fases avançam de 0 a 4 em ordem
- observability: n/a - jogo local sem telemetria; a tela Copa mostra cada sorteio e resultado

## Handoff

- Tamanho por fatia (wc -c dos arquivos que cada uma toca ÷ 4): S1 ≈ 32k; S2 entra em 50k; S3 em 81k; S4 em 92k. Código e testes novos (`continental.test.ts`, formato das copas, abas) ≈ 60 KB → ~15k, total ~107k, abaixo do budget de 150k: one builder
- Mechanism: one builder (cabe no budget, sem pergunta)
- **Settled mid-build:** as linhas _achado na build_ da tabela Superseded são asserções antigas do mesmo tipo das linhas aprovadas (versão atual, `cups` e histórico com a continental); nenhuma mudou um valor esperado fora da consequência direta do plano. O autor pediu para seguir sem rodada de perguntas (26/09/2026)
- **Boundary:** C1-C27 closed at `d7494d8`
- **Abandoned:** nada
