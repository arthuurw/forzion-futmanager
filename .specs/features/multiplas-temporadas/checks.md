# Múltiplas temporadas - checks

Profile: light
Plan: `.specs/features/multiplas-temporadas/plan.md`

## Intent

55 checks in 7 slices · 5 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`). Telas usam `@testing-library/react` em jsdom. Todo valor esperado é literal ou calculado no próprio teste, nunca pela função de produção (L-004). «Todo», «cada» e «todas» são provados por tabela sobre o conjunto inteiro (L-005). Lições aplicadas: L-003 (fiação pelo ponto de entrada), L-007 (fixture com o membro excluído), L-008 (texto exato na tela), L-010 (valores exibidos diferentes de zero).

Textos de tela fixados aqui: «Série A», «Série B», «Divisão», «Fim da temporada N», «Campeão: X», «Sobem», «Descem», «Sua posição: Pº na Série A», «Prêmio: R$ X», «Meta cumprida», «Meta não cumprida», «Demitido», «Propostas de emprego», «Próxima temporada», «Nova temporada», «Ninguém se aposentou», «Nenhum contrato encerrado», «Contr.», «Último ano», «Renovar», «Renovar X por 3 temporadas com salário R$ Y por rodada. Confirmar?», «Meta: até o Pº», «Meta: não cair», «Meta: subir», «Histórico», «Artilharia», «Estatísticas», «Campeões», «Nenhuma temporada encerrada», «Nenhum gol ainda», «Prêmio» (linha do registro).

## Checks

### S1 - Série B · ~16 files · ~190 KB · ~48k

**C1** - O jogo novo tem 2 ligas, `l1` e `l2`. Os 20 nomes da primeira são as 20 identidades da AD-009, e os 20 da segunda são as 20 identidades fixas da Série B. Os ids da Série B vão de `c21` a `c40`, e nenhum nome de jogador se repete nas duas ligas e no mercado (AC 1, door 4)
Proof: `npx vitest run src/engine/generate.test.ts -t "duas divisões com identidades fixas"`

**C2** - Em 5 seeds, a média de força dos 22 jogadores de cada clube da Série B fica entre 47 e 69, e a de cada clube da Série A entre 55 e 83. A média dos 20 clubes fica entre 56 e 60 na B e entre 67 e 71 na A (AC 1)
Proof: `npx vitest run src/engine/generate.test.ts -t "série B mais fraca"`

**C3** - A tela «Escolher clube» tem as abas «Série A» e «Série B». A aba A lista os 20 clubes da A em ordem alfabética com «força»; a aba B lista os 20 da B do mesmo jeito. Escolher um clube da B grava o save com esse `userClubId` e abre o elenco dele (AC 2)
Proof: `npx vitest run src/ui/ChooseClub.test.tsx -t "abas Série A e Série B"`

**C4** - Com o usuário na Série B, «Jogar rodada» e «Pular para o fim» deixam resultado nas 10 partidas da rodada 1 de cada divisão, e as duas ligas ficam com `currentRound` 1. Depois de 38 rodadas pelo engine, as duas ficam em 38 com as 380 partidas jogadas (AC 3)
Proof: `npx vitest run src/app.test.tsx -t "rodada joga as duas divisões"`
Proof: `npx vitest run src/engine/live.test.ts -t "temporada inteira nas duas divisões"`

**C5** - A rodada ao vivo tem 20 partidas: as 10 da Série A com `leagueId` `l1` e a semente `mix32(rngState, n*16 + i)`, e as 10 da B com `leagueId` `l2` e a semente `mix32(mix32(rngState, 0xB), n*16 + i)` (door 2)
Proof: `npx vitest run src/engine/live.test.ts -t "sementes das partidas das duas divisões"`

**C6** - Durante a rodada ao vivo, a lista «Jogos da rodada» tem 10 itens, todos entre clubes da divisão do usuário. Vale com o usuário na B e com o usuário na A (AC 4)
Proof: `npx vitest run src/ui/Live.test.tsx -t "jogos da rodada só da divisão do usuário"`

**C7** - O painel «Classificação» da tela Elenco mostra os 20 clubes da divisão do usuário, na ordem da tabela. O seletor «Divisão» começa na divisão dele, e trocá-lo mostra os 20 da outra (AC 5)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "classificação com seletor de divisão"`

**C8** - A tela Rodada faz o mesmo: tabela da divisão do usuário e seletor «Divisão» para a outra (AC 5)
Proof: `npx vitest run src/ui/Round.test.tsx -t "classificação com seletor de divisão"`

**C9** - Com o usuário na B, a tabela «Mercado» tem uma linha para cada jogador dos 39 outros clubes das duas divisões e para cada livre, e nenhuma do elenco do usuário. Uma compra de clube da Série A é aceita e leva o jogador para o usuário (AC 6)
Proof: `npx vitest run src/ui/Market.test.tsx -t "mercado com as duas divisões"`
Proof: `npx vitest run src/engine/market.test.ts -t "compra de clube da outra divisão"`

**C10** - Depois de uma rodada, cada um dos 20 clubes da B registra e recebe patrocínio igual a 60% do `finance.sponsorship`, e cada um dos 20 da A recebe 100%. A tela Finanças de um usuário na B mostra em «Patrocínio por rodada» o valor de 60% (AC 7)
Proof: `npx vitest run src/engine/finance.test.ts -t "série B recebe 60% do patrocínio"`
Proof: `npx vitest run src/ui/Finance.test.tsx -t "patrocínio da série B"`

**C11** - Em 2000 partidas entre times iguais, a média de gols e a vitória do mandante continuam nas faixas do núcleo (AC 8)
Proof: `npx vitest run src/engine/balance.test.ts -t "times iguais"`

### S2 - Virada de temporada · ~10 files · ~80 KB · ~20k

**C12** - Depois da rodada 38, a tela Fim mostra:
- «Fim da temporada 1»;
- «Campeão: X» de cada divisão;
- em «Sobem», os 4 primeiros da B; em «Descem», os 4 últimos da A;
- «Sua posição: Pº na Série A»;
- «Prêmio: R$ X»;
- o veredito.

Cada valor vem da tabela final, calculado no teste (AC 9)
Proof: `npx vitest run src/ui/End.test.tsx -t "resumo da temporada"`

**C13** - Depois de `nextSeason`:
- os 4 últimos da A estão na B e os 4 primeiros da B estão na A;
- cada liga tem 20 clubes, e todos os ids continuam os mesmos;
- os 4 que subiram estão no fim do array da A, na ordem da tabela da B.

(AC 10, door 4)
Proof: `npx vitest run src/engine/rollover.test.ts -t "4 sobem e 4 descem"`

**C14** - Na nova temporada, cada liga tem 38 rodadas em que cada par se enfrenta uma vez em cada mando, sem resultado, e `currentRound` é 0. A temporada é 2, o mercado está aberto, e há 3 juniores com ids `jr-2-1-1` a `jr-2-1-3` (AC 11)
Proof: `npx vitest run src/engine/rollover.test.ts -t "calendário novo e mercado aberto"`

**C15** - Na nova temporada, todo jogador das duas ligas tem condição 100, 0 amarelos e 0 suspensões. Lesão e moral continuam como estavam: a fixture tem jogador lesionado, suspenso, com amarelo e com moral ≠ 0 (AC 12)
Proof: `npx vitest run src/engine/rollover.test.ts -t "condição renovada mantém lesão e moral"`

**C16** - Na nova temporada, as propostas somem. Continuam iguais o registro da última rodada, o caixa (depois do prêmio), a capacidade, as rodadas de obra e o empréstimo de cada clube. A fixture tem empréstimo e obra ≠ 0 (AC 13)
Proof: `npx vitest run src/engine/rollover.test.ts -t "caixa estádio e empréstimo continuam"`

**C17** - «Próxima temporada» abre a tela «Nova temporada», que mostra:
- os nomes dos jogadores do usuário que se aposentaram e dos que saíram por fim de contrato;
- uma linha por jogador do elenco com a força antes e depois;
- a nova meta.

Com as listas vazias, mostra «Ninguém se aposentou» e «Nenhum contrato encerrado» (AC 14)
Proof: `npx vitest run src/ui/NewSeason.test.tsx -t "mostra aposentados contratos evolução e meta"`
Proof: `npx vitest run src/ui/NewSeason.test.tsx -t "listas vazias"`

**C18** - Com o save gravado na rodada 38, «Continuar» depois de recarregar abre a tela Fim com o mesmo campeão, a mesma posição, o mesmo prêmio e o mesmo veredito. `nextSeason` do estado recarregado é igual, campo a campo, ao do estado original (AC 15)
Proof: `npx vitest run src/app.test.tsx -t "recarregar no fim mostra o mesmo resumo"`

**C19** - `nextSeason` sorteia com `createRng(mix32(rngState, 0x5E45 + season))`. O `rngState` novo é o de `createRng(rngState)` depois de um `next()`. Dois estados que só diferem em `rngState` geram evoluções diferentes (door 3)
Proof: `npx vitest run src/engine/rollover.test.ts -t "virada usa o próprio Rng"`

**C20** - «Próxima temporada» grava o save da nova temporada antes de a tela «Nova temporada» aparecer. Se a gravação falha, aparece o aviso de falha existente (AC 15, door 1)
Proof: `npx vitest run src/store.test.ts -t "próxima temporada grava antes de mostrar"`

### S3 - Evolução e aposentadoria · ~4 files · ~50 KB · ~13k

**C21** - Na virada, cada jogador de uma fixture de 6000 (1000 por faixa) muda de força dentro da faixa da sua idade antes do aniversário:

| Idade | Mudança |
| --- | --- |
| até 20 | +2..+6 |
| 21–23 | +1..+4 |
| 24–27 | −1..+2 |
| 28–30 | −2..+1 |
| 31–33 | −4..0 |
| 34+ | −6..−2 |

Os dois extremos de cada faixa aparecem. Um jogador de força 94 com 18 anos fica em até 95, e um de 41 com 34 anos (sem se aposentar) fica em pelo menos 40 (AC 16)
Proof: `npx vitest run src/engine/rollover.test.ts -t "evolução por idade"`

**C22** - Todo jogador que continua no save fica exatamente 1 ano mais velho: de clube, livre ou que saiu por contrato (AC 17)
Proof: `npx vitest run src/engine/rollover.test.ts -t "todos envelhecem um ano"`

**C23** - Com 1000 jogadores de cada idade depois do aniversário:
- aos 33 ninguém se aposenta;
- aos 34 se aposentam de 15% a 25%;
- aos 35, de 45% a 55%;
- aos 36 e aos 37, todos.

O aposentado some de elencos, escalações e livres (AC 18)
Proof: `npx vitest run src/engine/rollover.test.ts -t "aposentadoria por idade"`

**C24** - Um clube da IA reduzido a 15 jogadores, sem atacantes, volta a 22. Os juniores entram primeiro na posição com menos jogadores, têm 18 a 20 anos e força entre a média do elenco − 12 e − 4, e contrato 3. O clube do usuário com 15 jogadores continua com 15 (AC 19, L-007)
Proof: `npx vitest run src/engine/rollover.test.ts -t "IA repõe com juniores até 22"`

**C25** - Com a lista reduzida a 5 livres, depois da virada há pelo menos 40. Os novos têm de 19 a 31 anos e força de 45 a 70 (AC 20)
Proof: `npx vitest run src/engine/rollover.test.ts -t "livres voltam a 40"`

**C26** - O valor de mercado usa a força e a idade, não o salário guardado. Com força 75, vale:

| Idade | Valor |
| --- | --- |
| 20 | R$ 3.060.000 |
| 25 | R$ 2.450.000 |
| 29 | R$ 2.040.000 |
| 32 | R$ 1.220.000 |
| 35 | R$ 610.000 |

Um jogador de força 75 com salário guardado de R$ 2.000 e 25 anos vale R$ 2.450.000 (AC 21)
Proof: `npx vitest run src/engine/market.test.ts -t "valor pela força e idade"`

**C27** - Em 3 seeds e 5 temporadas sem usuário, a média da força dos 18 melhores de cada clube, por divisão, fica a até 4 pontos da média da temporada 1 no começo de cada temporada (AC 22)
Proof: `npx vitest run src/engine/balance.test.ts -t "força estável em 5 temporadas"`

### S4 - Contratos · ~6 files · ~65 KB · ~16k

**C28** - No jogo novo, todo jogador de clube das duas ligas tem `contractSeasons` inteiro de 1 a 4, e cada um dos valores 1, 2, 3 e 4 aparece (AC 23, door 1)
Proof: `npx vitest run src/engine/generate.test.ts -t "contratos de 1 a 4"`

**C29** - O contrato de quem chega ao clube do usuário é de 3 temporadas na compra, 2 no livre contratado e 3 no júnior promovido. Um jogador vendido para a IA chega lá com 3 (AC 24)
Proof: `npx vitest run src/engine/market.test.ts -t "contrato ao chegar"`

**C30** - A tabela Elenco tem a coluna «Contr.», e cada uma das 22 linhas mostra as temporadas restantes do jogador. A linha de quem tem 1 mostra «Último ano» (AC 25)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "coluna contrato e último ano"`

**C31** - «Renovar» aparece só na linha de quem tem 1 temporada; a fixture tem jogadores com 1 e com 2. O clique mostra «Renovar X por 3 temporadas com salário R$ Y por rodada. Confirmar?», com Y = round(2000 × 1,09^(força−40) / 100) × 100 calculado no teste. Confirmar deixa contrato 3 e salário Y; Cancelar não muda nada. A renovação grava antes de mostrar (AC 26)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "renovar mostra salário novo"`
Proof: `npx vitest run src/store.test.ts -t "renovar grava antes de mostrar"`

**C32** - Na virada, o contrato de cada jogador do usuário cai 1. Quem tinha 1 sai do elenco e da escalação e entra nos livres com o mesmo id (AC 27)
Proof: `npx vitest run src/engine/rollover.test.ts -t "contrato cai e último ano vai para os livres"`

**C33** - Na virada, o jogador da IA no último ano com até 32 anos no fim da temporada fica no clube, com contrato de 1 a 3 e salário igual à fórmula aplicada à força nova. O de 33 ou mais vai para os livres; a fixture tem os dois (AC 28)
Proof: `npx vitest run src/engine/rollover.test.ts -t "IA renova até 32 anos"`

### S5 - Premiação e diretoria · ~6 files · ~60 KB · ~15k

**C34** - Ao fechar a rodada 38, cada um dos 40 clubes recebe no caixa, além do registro normal, o prêmio (21 − posição) × R$ 1.000.000 na A e (21 − posição) × R$ 250.000 na B. O prêmio fica em `lastRound.prize`. Na rodada 37 não há prêmio (AC 29)
Proof: `npx vitest run src/engine/finance.test.ts -t "prêmio por posição na rodada 38"`

**C35** - Depois da rodada 38, a tela Finanças mostra a linha «Prêmio» com o valor do registro, e o «Saldo» a inclui. Antes, a linha não aparece (AC 29, assumption «prêmio»)
Proof: `npx vitest run src/ui/Finance.test.tsx -t "linha do prêmio"`

**C36** - A meta pela posição r no ranking de força da própria divisão (média dos 11 melhores, empate pelo id), para todo r de 1 a 20:
- Série A: mín(16, r + 3);
- Série B: 4 se r ≤ 4, senão mín(20, r + 3).

Escolher o clube fixa essa meta no save; a virada fixa a da nova temporada (AC 30)
Proof: `npx vitest run src/engine/season.test.ts -t "meta pela força"`
Proof: `npx vitest run src/app.test.tsx -t "escolher clube fixa a meta"`

**C37** - A tela Elenco mostra «Meta: até o 8º» para meta 8 na A, «Meta: não cair» para 16 na A e «Meta: subir» para 4 na B (AC 31)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "meta da temporada"`

**C38** - O veredito:

| Meta | Posição | Veredito |
| --- | --- | --- |
| A, até o 8º | 8 | «Meta cumprida» |
| A, até o 8º | 9 | «Meta não cumprida» |
| A, até o 8º | 12 | «Meta não cumprida» |
| A, até o 8º | 13 | «Demitido» |
| A, não cair | 16 | «Meta cumprida» |
| A, não cair | 17 | «Demitido» |
| B, subir | 4 | «Meta cumprida» |
| B, subir | 5 | «Meta não cumprida» |
| B, subir | 9 | «Demitido» |
| B, até o 20º | 20 | «Meta cumprida» |

(AC 32, AC 33)
Proof: `npx vitest run src/engine/season.test.ts -t "veredito da diretoria"`

**C39** - Demitido, o usuário recebe 3 propostas: os 3 clubes logo abaixo do seu no ranking de força das 40 equipes. Se ele é o 39º, recebe os 3 mais fracos entre os outros (37º, 38º e 40º). Na tela Fim, «Propostas de emprego» lista os 3, e «Próxima temporada» fica desabilitado até ele escolher um (AC 34, L-006)
Proof: `npx vitest run src/engine/season.test.ts -t "propostas de emprego"`
Proof: `npx vitest run src/ui/End.test.tsx -t "demitido escolhe proposta"`

**C40** - Escolhido o clube, a nova temporada começa com `userClubId` nele, com uma escalação de 11 disponíveis e a meta dele. O clube antigo passa a ser da IA. Pela tela, o elenco aberto depois de «Nova temporada» é o do novo clube (AC 35, L-003)
Proof: `npx vitest run src/engine/rollover.test.ts -t "demitido assume o novo clube"`
Proof: `npx vitest run src/ui/End.test.tsx -t "demitido escolhe proposta"`

### S6 - Histórico e artilharia · ~6 files · ~55 KB · ~14k

**C41** - Depois de uma rodada, cada jogador que entrou em campo soma 1 em `seasonGames`, e quem marcou soma 1 em `seasonGoals` por gol. Um reserva que não entrou fica igual. Vale pelo `playRound`, nas duas divisões (AC 36, L-003, L-007)
Proof: `npx vitest run src/engine/condition.test.ts -t "jogos e gols da temporada"`

**C42** - Na virada, `careerGames` e `careerGoals` somam os da temporada, e `seasonGames` e `seasonGoals` voltam a 0; a fixture tem valores ≠ 0 (AC 37)
Proof: `npx vitest run src/engine/rollover.test.ts -t "estatísticas vão para a carreira"`

**C43** - Depois da virada, `history` tem 1 registro com:
- a temporada;
- para cada divisão, o campeão, os que sobem, os que descem e o artilheiro (nome, clube e gols, o maior `seasonGoals`);
- o clube, a posição, o prêmio e o veredito do usuário.

Uma segunda virada acrescenta um registro e deixa o primeiro igual (AC 38, Relations)
Proof: `npx vitest run src/engine/rollover.test.ts -t "histórico da temporada"`

**C44** - O botão «Histórico» da tela Elenco abre a tela «Histórico». A aba «Artilharia» lista os 10 maiores artilheiros da divisão do usuário na temporada, por gols decrescentes e depois nome, com nome, clube e gols. «Voltar ao elenco» volta (AC 39)
Proof: `npx vitest run src/ui/History.test.tsx -t "artilharia top 10"`

**C45** - A aba «Estatísticas» tem uma linha por jogador do elenco com jogos e gols na temporada e jogos e gols na carreira. A carreira inclui a temporada atual. A fixture tem os 4 números ≠ 0 (AC 39, L-010)
Proof: `npx vitest run src/ui/History.test.tsx -t "estatísticas do elenco"`

**C46** - A aba «Campeões» tem uma linha por temporada, da mais recente para a mais antiga. Cada linha mostra a temporada, o campeão e o artilheiro da A, o campeão e o artilheiro da B, e a posição do usuário (AC 39)
Proof: `npx vitest run src/ui/History.test.tsx -t "campeões por temporada"`

**C47** - Sem temporada encerrada, «Campeões» mostra «Nenhuma temporada encerrada». Sem gols na temporada, «Artilharia» mostra «Nenhum gol ainda» (AC 40)
Proof: `npx vitest run src/ui/History.test.tsx -t "histórico vazio"`

### S7 - Save compatível · ~6 files · ~45 KB · ~11k

**C48** - Um save v3 com 5 rodadas jogadas vira v4:
- a Série A tem os mesmos clubes, jogadores, finanças, resultados e escalação, e ganha contratos de 1 a 4 e estatísticas zeradas;
- o mercado é o mesmo;
- a Série B tem 20 clubes, `c21` a `c40`, com as rodadas 1 a 5 com placar, as seguintes sem resultado e `currentRound` 5;
- `history` vazio e `boardGoal` igual à meta calculada no teste.

(AC 41, door 1)
Proof: `npx vitest run src/engine/migrate.test.ts -t "migra v3 para v4"`

**C49** - Saves v2 e v1 também viram v4, com as mesmas garantias de condição e finanças de antes, e mais a Série B, os contratos e as estatísticas (AC 41)
Proof: `npx vitest run src/engine/migrate.test.ts -t "migra v2 e v1 para v4"`

**C50** - Com um documento de `schemaVersion` 5, a tela Início mostra «Jogo salvo incompatível (versão 5)» e só «Novo jogo» (AC 42)
Proof: `npx vitest run src/ui/Home.test.tsx -t "save de versão 5 incompatível"`

**C51** - Um documento v4 passa pela leitura sem mudança (door 1)
Proof: `npx vitest run src/engine/migrate.test.ts -t "v4 passa direto"`
Proof: `npx vitest run src/persistence/save.test.ts -t "documento tem schemaVersion 4 com finanças e mercado"`

**C52** - A Série B do jogo novo é a de `generateLeague` sobre `createRng(mix32(seed, 4))`. A Série A e o `rngState` continuam os de `createRng(seed)`. Na migração, a Série B vem do mesmo stream e as partidas já jogadas usam `mix32(mix32(seed, 0xB), n*16 + i)`: migrar duas vezes dá o mesmo documento (door 5)
Proof: `npx vitest run src/engine/generate.test.ts -t "série B tem stream próprio"`
Proof: `npx vitest run src/engine/migrate.test.ts -t "série B migrada vem da seed"`

**C53** - Em 3 seeds e 5 temporadas sem usuário, o caixa final de cada clube fica entre −1× e 8× o inicial, e a mediana entre 0,8× e 3× (AC 43)
Proof: `npx vitest run src/engine/balance.test.ts -t "caixa em 5 temporadas"`

**C54** - A lista de livres guarda contrato 0, e todo jogador de clube tem `contractSeasons` ≥ 1 depois de uma temporada inteira com compras, vendas, livres, juniores, dispensas e uma virada (Relations, door 1)
Proof: `npx vitest run src/engine/rollover.test.ts -t "contrato de clube nunca abaixo de 1"`

**C55** - `history` só cresce: `nextSeason` nunca altera um registro existente, e o save gravado depois de duas viradas tem os 2 registros na ordem das temporadas (Relations)
Proof: `npx vitest run src/engine/rollover.test.ts -t "histórico da temporada"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| divisões (2) | Série A C1, C2, C10 · Série B C1, C2, C10 | - |
| telas com tabela e seletor (3) | Elenco C7 · Rodada C8 · Fim C12 | - |
| faixas de evolução (6) | C21, table-driven over all 6 | - |
| idades de aposentadoria (5) | 33 C23 · 34 C23 · 35 C23 · 36 C23 · 37 C23 | - |
| chegadas com contrato (4) | compra C29 · livre C29 · júnior C29 · venda para a IA C29 | - |
| textos da meta (3) | «até o Pº» C37 · «não cair» C37 · «subir» C37 | - |
| vereditos (3) | «Meta cumprida» C38 · «Meta não cumprida» C38 · «Demitido» C38, C39 | - |
| linhas do veredito (10) | C38, table-driven over all 10 | - |
| ranking da meta, 20 por divisão (40) | C36, table-driven over all 40 | - |
| abas do Histórico (3) | Artilharia C44 · Estatísticas C45 · Campeões C46 | - |
| estados vazios (4) | «Ninguém se aposentou» C17 · «Nenhum contrato encerrado» C17 · «Nenhuma temporada encerrada» C47 · «Nenhum gol ainda» C47 | - |
| o que a virada renova (6) | clubes C13 · calendário C14 · condição C15 · propostas C16 · juniores C14 · meta C36 | - |
| o que a virada mantém (7) | lesão C15 · moral C15 · caixa C16 · estádio C16 · obra C16 · empréstimo C16 · registro C16 | - |
| versões de save (5) | v1 C49 · v2 C49 · v3 C48 · v4 C51 · v5 C50 | - |
| portas de mão única (5) | door 1 C48, C51, C54 · door 2 C5 · door 3 C19 · door 4 C1, C13 · door 5 C52 | - |
| entidades de `Relations` (6) | Save → 2 League C1 · SeasonRecord C43 · DivisionRecord C43 · Market C14, C25 · League → 20 Club C13 · Club → Player (contrato ≥ 1) C54 | - |
| restrições de mão única (3) | ordem das divisões C13 · contrato ≥ 1 C54 · histórico só cresce C55 | - |

- `Surface` do plano é `None`; nenhuma rota.
- Claims que cruzam a persistência: C3, C18, C20, C31, C48, C49, C50, C51.

## Superseded checks of earlier features

O plano aprovado muda contratos já provados. Os testes abaixo mudam no mesmo commit da mudança:

| Check anterior | O que muda | Substituído por |
| --- | --- | --- |
| elenco-mercado-financas C19 (valor por salário) | o valor usa `salaryFor(força)`; o teste `valor por salário e idade` passa a `valor pela força e idade`, com os mesmos números para força 75 | C26 |
| elenco-mercado-financas C51 (v2 e v1 viram v3, v3 passa direto) | viram v4; as asserções de condição e finanças continuam, e quem passa direto é v4. O teste `migra v2 e v1 para v3` passa a `migra v2 e v1 para v4` | C49, C51 |
| elenco-mercado-financas C52 (versão 4 incompatível) | só > 4 é incompatível; o teste passa a usar a versão 5 | C50 |
| elenco-mercado-financas C54 (documento gravado v3) | o documento é v4, com as duas ligas, `history` e `boardGoal`; o teste passa a `documento tem schemaVersion 4 com finanças e mercado` e vira mais um `Proof:` de C51 | C51 |
| elenco-mercado-financas C26 (comprado chega como está) | chega igual, exceto o contrato, que passa a 3 | C29 |
| elenco-mercado-financas C13 (caixa de uma temporada entre 50% e 250%) | o caixa final passa a incluir o prêmio da rodada 38; o teste mede o caixa sem o prêmio, que é o que a calibração do patrocínio controla | C34 |
| partida-ao-vivo C42 (`carrega save v1 migrado`) | o save v1 carregado vira v4 | C49 |
| nucleo-liga-partida, tela Fim («Fim da temporada») | o título passa a «Fim da temporada 1»; o teste `fim mostra campeão sem Jogar rodada` procura esse texto | C12 |

## Swept

- validation: C31 (renovar só no último ano), C39 («Próxima temporada» só depois da escolha)
- failure modes: C20
- idempotency: C18, C19
- authorization: n/a - jogo local de um jogador, sem contas
- concurrency: n/a - a virada roda uma vez por clique no store e bloqueia enquanto grava (`saving`), como as ações de mercado
- data lifecycle: C23, C32, C43, C48, C55
- dependency failure: existing - o aviso de falha e o de «Salvamento indisponível neste navegador» do núcleo cobrem o IndexedDB; C20 prova o caminho da virada
- state transitions: C12, C13, C14, C40
- observability: n/a - sem requisito de log

## Handoff

- Arquivos existentes lidos e mudados: `types`, `generate`, `names`, `live`, `season`, `condition`, `finance`, `market`, `migrate`, `store`, `App` e as telas `ChooseClub`, `Live`, `Squad`, `Round`, `End`, `Market`, `Finance`, `Home`. Com os testes deles, ≈ 250 KB → ~63k
- Código novo (`engine/rollover`, `engine/board`, telas `NewSeason` e `History`, testes) ≈ 80 KB → ~20k
- Soma por fatia: S1 ≈ 48k, entrando em quase todo o engine e em 5 telas. S2 fica em 68k acumulado, S3 em 81k, S4 em 97k, S5 em 112k, S6 em 126k e S7 em 137k
- Total ≈ 137k, abaixo do budget de 150k: one builder
