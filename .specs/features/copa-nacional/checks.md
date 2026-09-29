# Copa nacional - checks

Profile: light
Plan: `.specs/features/copa-nacional/plan.md`

## Intent

63 checks in 8 slices · 6 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`). Telas usam `@testing-library/react` em jsdom. Todo valor esperado é literal ou calculado no próprio teste, nunca pela função de produção sob teste (L-004). «Todo», «cada» e «todas» são provados por tabela sobre o conjunto inteiro (L-005). Lições aplicadas: L-003 (fiação pelo ponto de entrada), L-007 (fixture com o membro excluído), L-009 (door nova no build ganha check antes de fechar).

Duas regras de interface que os checks fixam e o plano deixa implícitas:
- `playDate(state)` joga **uma** data (liga ou copa). `playRound(state)`, que já existe, passa a jogar as datas de copa pendentes e depois **uma** rodada da liga. Assim, 38 chamadas continuam sendo uma temporada inteira, agora com a copa dentro.
- `cupGoal` igual a `-1` (sem clube, ou estado montado à mão em teste) significa sem meta de copa, e o veredito é o da liga, sem ajuste.

Textos de tela fixados aqui: «Copa», «Copa Nacional», «Copa Nacional · <fase>», «Ao vivo · Copa Nacional · <fase>», as fases «Preliminar», «16 avos», «Oitavas», «Quartas», «Semifinal» e «Final», «a sortear», «Na disputa», «Eliminado na <fase>», «Campeão», «Próxima fase», «Campeão: X», «Vice: Y», «Sua campanha: <fase>», «(pên. X x Y)», «Suspenso (copa)», «Prêmio da copa», e os rótulos de meta «Meta na copa: chegar aos 16 avos», «chegar às oitavas», «chegar às quartas» e «chegar à semifinal». A narração de pênalti diz «Pênalti convertido por X.» e «X perde o pênalti.».

## Checks

### S1 - Calendário de 44 datas · ~9 files · ~95 KB · ~24k

**C1** - Num jogo novo jogado com `playDate` até o fim, a sequência de datas é exatamente `L×4, C0, L×6, C1, L×6, C2, L×6, C3, L×6, C4, L×6, C5, L×4`: 44 datas, sendo `Ck` a fase `k` da copa e `L` uma rodada da liga (AC 1, door 4) - Superseded por copa-continental C9
Proof: `npx vitest run src/engine/calendar.test.ts -t "sequência das 44 datas"`

**C2** - A copa de um jogo novo tem 6 fases com os nomes «Preliminar», «16 avos», «Oitavas», «Quartas», «Semifinal» e «Final», e com `afterLeagueRound` 4, 10, 16, 22, 28 e 34, nessa ordem. O id da copa é `"cup-nat"` (AC 1, door 1, door 4)
Proof: `npx vitest run src/engine/cup.test.ts -t "seis fases com âncoras fixas"`

**C3** - Com a rodada 4 fechada, `playDate` joga a «Preliminar». O `currentRound` das duas divisões fica 4, os `rounds` das duas ligas ficam iguais ao que eram (comparação profunda), e só os 8 confrontos da fase 0 ganham `result` (AC 2)
Proof: `npx vitest run src/engine/calendar.test.ts -t "data de copa não mexe na liga"`

**C4** - Fechar uma data de copa leva `currentPhase` de `k` a `k + 1`, e o novo `rngState` é igual ao de um `createRng(anterior)` depois de um único `next()` (AC 3)
Proof: `npx vitest run src/engine/cup.test.ts -t "fechar data avança fase e rng uma vez"`

**C5** - A partir da rodada 4 fechada, uma chamada de `playRound` joga a «Preliminar» e depois a rodada 5, e as duas ligas ficam em 5. Depois de 38 chamadas desde um jogo novo, `currentPhase` é 6 e as duas ligas estão em 38 (AC 1, AC 5)
Proof: `npx vitest run src/engine/calendar.test.ts -t "playRound joga copa pendente e uma rodada"`

**C6** - Na tela do elenco, a linha da próxima data diz «Copa Nacional · Preliminar» quando a próxima data é a fase 0, e «Rodada 5 de 38» depois que a preliminar fecha (AC 4)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "próxima data de copa no elenco"`

**C7** - Pelo store, jogar a última data (a rodada 38) leva à tela Fim, e nesse estado a `Final` tem `winnerId` preenchido (AC 5)
Proof: `npx vitest run src/store.test.ts -t "fim da temporada com a copa decidida"`

### S2 - Chaveamento e sorteio · ~5 files · ~60 KB · ~15k

**C8** - Num jogo novo, `Cup.seeding` tem 40 ids distintos: os 20 da Série A na ordem de `strengthRanking` da A, depois os 20 da B na ordem de `strengthRanking` da B. A ordem esperada é calculada no teste pela média dos 11 melhores (AC 7, door 1)
Proof: `npx vitest run src/engine/cup.test.ts -t "chaveamento sem temporada anterior"`

**C9** - Na virada, a partir de tabelas finais montadas no teste, o chaveamento da temporada nova é: A = os 16 que ficaram, na ordem da tabela A anterior, depois os 4 que subiram, na ordem da tabela B; B = os 4 que caíram, na ordem da tabela A, depois os 16 que ficaram, na ordem da tabela B (AC 6)
Proof: `npx vitest run src/engine/rollover.test.ts -t "chaveamento da copa na virada"`

**C10** - A «Preliminar» tem 8 confrontos cujos 16 clubes são exatamente os 16 últimos do chaveamento. A «16 avos» sorteada depois dela tem 16 confrontos cujos 32 clubes são os 24 primeiros do chaveamento mais os 8 vencedores da preliminar (AC 8)
Proof: `npx vitest run src/engine/cup.test.ts -t "quem joga a preliminar e quem entra direto"`

**C11** - Numa copa inteira, cada sorteio depois da preliminar tem 16, 8, 4, 2 e 1 confrontos, e o conjunto dos clubes sorteados é igual ao conjunto dos vencedores da fase anterior (mais os 24 diretos na 16 avos), com cada clube uma única vez (AC 9)
Proof: `npx vitest run src/engine/cup.test.ts -t "cada sorteio usa todos os classificados"`

**C12** - Em todo confronto das 6 fases de uma copa inteira, `homeId` é o clube com o maior índice em `Cup.seeding` (AC 10)
Proof: `npx vitest run src/engine/cup.test.ts -t "mando do pior chaveamento"`

**C13** - A «Preliminar» já tem 8 confrontos antes da data 1 nos três começos de temporada: jogo novo, virada e migração de um save v4 na rodada 0 (AC 11)
Proof: `npx vitest run src/engine/cup.test.ts -t "preliminar sorteada no começo"`
Proof: `npx vitest run src/engine/rollover.test.ts -t "copa nova na virada"`
Proof: `npx vitest run src/engine/migrate.test.ts -t "v4 na rodada 0 ganha preliminar"`

**C14** - O sorteio da fase `k` é igual ao que o teste calcula com Fisher-Yates e `randInt` sobre `createRng(mix32(mix32(rngState, 0xD0), k))`, usando os classificados na ordem do chaveamento e formando pares consecutivos. Vale para `k = 0` no jogo novo e para `k = 1` no fechamento da preliminar, com o `rngState` de antes do avanço (door 3)
Proof: `npx vitest run src/engine/cup.test.ts -t "sorteio segue a semente da door 3"`

### S3 - Mata-mata e pênaltis · ~6 files · ~80 KB · ~20k

**C15** - Um confronto empatado no 90' termina com `penalties` preenchido, placares de pênalti diferentes, e `winnerId` igual ao lado com mais pênaltis. Um confronto não empatado termina com `penalties` `null` e `winnerId` igual ao lado com mais gols (AC 12, AC 17)
Proof: `npx vitest run src/engine/cup.test.ts -t "empate vai aos pênaltis"`

**C16** - Com o resultado de cada cobrança fixado no teste, a disputa segue esta tabela: A marca as 3 primeiras e B perde as 3 primeiras → termina 3 x 0 depois de 6 cobranças; A marca as 5 e B marca 4 e perde a 5ª → termina 5 x 4 depois de 10 cobranças; 5 x 5 depois de 10 e o 6º par gol de A e erro de B → 6 x 5 depois de 12; 4 x 4 depois de 10, o 6º par com os dois gols e o 7º par erro de A e gol de B → 5 x 6 depois de 14 (AC 12)
Proof: `npx vitest run src/engine/cup.test.ts -t "regras da disputa de pênaltis"`

**C17** - A chance de gol no pênalti segue esta tabela: batedor 80 e goleiro 80 → 0,75; 70 e 80 → 0,70; 90 e 70 → 0,85; 95 e 40 → 0,92 (limite); 40 e 95 → 0,55 (limite) (AC 13)
Proof: `npx vitest run src/engine/cup.test.ts -t "chance do pênalti"`

**C18** - Com um time em campo no 90' de 2 FW (80, 75), 3 MF, 4 DF, 1 GK, mais um FW expulso e um FW substituído, os batedores seguem FW 80, FW 75, depois os MF por força, os DF por força e o GK. Nem o expulso nem o substituído batem, e a 11ª cobrança é de novo do FW 80, porque há 10 em campo (AC 14; corrigido de «12ª» pelo autor em 27/09/2026)
Proof: `npx vitest run src/engine/cup.test.ts -t "ordem dos batedores"`

**C19** - Cada cobrança vira um evento `penalty_scored` ou `penalty_missed` com `playerId` do batedor, e o número de eventos é igual ao total de cobranças. A narração é «Pênalti convertido por X.» e «X perde o pênalti.» (AC 15)
Proof: `npx vitest run src/engine/cup.test.ts -t "eventos de pênalti"`
Proof: `npx vitest run src/engine/narration.test.ts -t "narração de pênalti"`

**C20** - Um confronto 1 x 1 decidido 4 x 3 nos pênaltis aparece como «1 x 1 (pên. 4 x 3)» na tela «Ao vivo» depois do 90', na tela de resultados e na tela da copa (AC 16)
Proof: `npx vitest run src/ui/Live.test.tsx -t "placar com pênaltis ao vivo"`
Proof: `npx vitest run src/ui/Round.test.tsx -t "placar com pênaltis nos resultados"`
Proof: `npx vitest run src/ui/Cup.test.tsx -t "placar com pênaltis na copa"`

**C21** - Numa copa inteira, nenhum perdedor de uma fase aparece em nenhum confronto das fases seguintes (AC 17)
Proof: `npx vitest run src/engine/cup.test.ts -t "perdedor sai da copa"`

**C22** - Uma data de copa com gols deixa iguais a tabela das duas divisões (`computeTable`) e o `seasonGames` e `seasonGoals` de todos os jogadores. A fixture tem um autor de gol na copa (AC 18)
Proof: `npx vitest run src/engine/cup.test.ts -t "copa não conta na liga nem nas estatísticas"`

**C23** - O confronto `i` da fase `k` usa a semente `mix32(mix32(rngState, 0xC0), k*32 + i)`, calculada no teste, com o `rngState` do começo da data, e os pênaltis continuam o `rngState` da própria partida depois do minuto 90 (door 2)
Proof: `npx vitest run src/engine/cup.test.ts -t "sementes das partidas de copa"`

### S4 - O elenco nas duas competições · ~8 files · ~90 KB · ~23k

**C24** - No fechamento de uma data de copa, um amarelo leva `cupDiscipline["cup-nat"].yellowCards` de 0 a 1 e de 1 a 2. De 2, leva a `suspendedRounds` 1 e amarelos 0 (AC 19)
Proof: `npx vitest run src/engine/condition.test.ts -t "amarelos de copa"`

**C25** - No fechamento de uma data de copa, um expulso fica com `cupDiscipline["cup-nat"].suspendedRounds` 1, e os amarelos de copa daquele jogo não somam (AC 20)
Proof: `npx vitest run src/engine/condition.test.ts -t "vermelho de copa"`

**C26** - Um jogador com 2 amarelos de liga e `suspendedRounds` de liga 0, que leva amarelo e vermelho na copa, fecha a data de copa ainda com 2 amarelos e 0 de suspensão na liga (AC 21)
Proof: `npx vitest run src/engine/condition.test.ts -t "copa não mexe na disciplina da liga"`

**C27** - Um jogador com `cupDiscipline["cup-nat"]` `{ yellowCards: 2, suspendedRounds: 1 }`, que leva amarelo e vermelho numa rodada da liga, fecha a rodada com o `cupDiscipline` igual (AC 22)
Proof: `npx vitest run src/engine/condition.test.ts -t "liga não mexe na disciplina da copa"`

**C28** - `isAvailableFor` segue esta tabela de 8 linhas: {sem nada, lesão, suspensão de liga, suspensão de copa} × {liga, copa} → disponível, fora, fora, disponível / disponível, fora, disponível, fora (AC 23, AC 24, door 6)
Proof: `npx vitest run src/engine/lineup.test.ts -t "disponibilidade por competição"`

**C29** - Em `startCupDate`, num clube da IA com o melhor atacante suspenso na copa e o segundo melhor suspenso na liga, a escalação da IA tem o segundo e não tem o primeiro. O banco do usuário não tem o suspenso na copa. Um titular do usuário suspenso na copa vira vaga `null`, e `validateLineup` para a data de copa recusa essa escalação (AC 23)
Proof: `npx vitest run src/engine/cup.test.ts -t "suspenso na copa fica fora da data de copa"`

**C30** - Em `startRound` de uma rodada da liga, um jogador só com suspensão de copa entra na escalação da IA e no banco (AC 24)
Proof: `npx vitest run src/engine/live.test.ts -t "suspenso na copa joga a liga"`

**C31** - Ao fechar uma data de copa, um jogador com suspensão de copa 1 num clube que jogou a data fica com 0. Um com suspensão de copa 1 num clube que não jogou continua com 1 (AC 25)
Proof: `npx vitest run src/engine/condition.test.ts -t "cumpre suspensão de copa"`

**C32** - Ao fechar uma data de copa, `injuryRounds` baixa 1 em todo jogador de clube: num clube que jogou e num que não jogou. Quem jogou fica com o cansaço do fim do jogo mais 15, limitado a 100 (AC 26)
Proof: `npx vitest run src/engine/condition.test.ts -t "lesão e cansaço na data de copa"`

**C33** - Ao fechar uma data de copa, quem jogou pelo vencedor sobe 1 de moral (de 0 a 1; de 2 fica 2), e quem jogou pelo eliminado desce 1 (de 0 a −1; de −2 fica −2). Vale também para um confronto decidido nos pênaltis (AC 27)
Proof: `npx vitest run src/engine/condition.test.ts -t "moral na copa"`

**C34** - Ao fechar uma data de copa, um jogador de clube que não jogou com cansaço 60, `idleRounds` 2 e moral 1 fica com 90, 2 e 1. Um com cansaço 85 fica com 100 (AC 28)
Proof: `npx vitest run src/engine/condition.test.ts -t "clube fora da data descansa"`

**C35** - Com a próxima data de copa, a tela do elenco mostra «Suspenso (copa)» no jogador suspenso na copa e não marca como suspenso o jogador só suspenso na liga. Com a próxima data de liga, acontece o inverso (AC 29)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "suspensões pela próxima data"`

### S5 - Dinheiro da copa · ~4 files · ~40 KB · ~10k

**C36** - Numa data de copa, o mandante com torcida 30.000, capacidade 24.000 e ingresso R$ 40 recebe 24.000 × 40 = R$ 960.000 de bilheteria (valor literal no teste), e o visitante recebe 0 (AC 30)
Proof: `npx vitest run src/engine/cup.test.ts -t "bilheteria do mandante na copa"`

**C37** - O vencedor de cada fase recebe o prêmio desta tabela: Preliminar 150.000, 16 avos 300.000, Oitavas 500.000, Quartas 800.000, Semifinal 1.200.000, Final 2.500.000. O perdedor recebe 0 de prêmio (AC 31)
Proof: `npx vitest run src/engine/cup.test.ts -t "prêmio por fase"`

**C38** - Um clube com empréstimo, obra em andamento e folha acima de zero que vence em casa uma data de copa tem o caixa mudado exatamente pela bilheteria mais o prêmio. `loan` e `expansionRoundsLeft` ficam iguais (AC 32)
Proof: `npx vitest run src/engine/cup.test.ts -t "data de copa não cobra folha nem juros"`

**C39** - O `market` inteiro (propostas, juniores e livres) é igual antes e depois de uma data de copa, numa fixture com uma proposta aberta (AC 33)
Proof: `npx vitest run src/engine/cup.test.ts -t "data de copa não fecha o mercado"`

**C40** - Depois de uma data de copa, o registro do clube que jogou tem `salaries` 0, `sponsorship` 0, `interest` 0, a bilheteria, as transferências pendentes e `cupPrize`. A tela Finanças mostra «Prêmio da copa» com o valor formatado quando `cupPrize` > 0, e não mostra a linha quando é 0 (AC 34)
Proof: `npx vitest run src/engine/cup.test.ts -t "registro da data de copa"`
Proof: `npx vitest run src/ui/Finance.test.tsx -t "linha prêmio da copa"`

### S6 - Meta de copa e veredito · ~6 files · ~55 KB · ~14k

**C41** - `cupGoal` segue esta regra, provada sobre os 40 clubes de um jogo novo: clube na preliminar → 1; senão, pela posição em `strengthRanking` dos 40, 1-4 → 4, 5-8 → 3, as outras → 2 (AC 35)
Proof: `npx vitest run src/engine/board.test.ts -t "meta de copa pelos 40 clubes"`

**C42** - `cupGoal` é fixado ao escolher o clube, na virada (também para o clube novo de um demitido) e na migração de um v4 com clube (AC 35)
Proof: `npx vitest run src/store.test.ts -t "meta de copa ao escolher clube"`
Proof: `npx vitest run src/engine/rollover.test.ts -t "meta de copa na virada"`
Proof: `npx vitest run src/engine/migrate.test.ts -t "meta de copa na migração"`

**C43** - A fase alcançada segue esta tabela: eliminado na preliminar → 0; eliminado nas oitavas → 2; perdeu a final → 5; campeão → 6. A meta é cumprida quando a fase alcançada é maior ou igual a `cupGoal` (AC 36)
Proof: `npx vitest run src/engine/board.test.ts -t "fase alcançada e meta cumprida"`

**C44** - O veredito combinado segue esta tabela de 9 linhas: {«Meta cumprida», «Meta não cumprida», «Demitido»} × {copa cumprida, copa não cumprida, sem meta de copa (`-1`)} → cumprida, não cumprida, cumprida / cumprida, não cumprida, não cumprida / não cumprida, demitido, demitido (AC 37, AC 38)
Proof: `npx vitest run src/engine/board.test.ts -t "veredito combinado"`

**C45** - Um usuário que seria «Demitido» pela liga e cumpriu a meta de copa vê «Meta não cumprida» na tela Fim, não vê «Propostas de emprego», `nextSeason` aceita a virada sem `jobClubId`, e o `SeasonRecord.verdict` é `"missed"` (AC 39)
Proof: `npx vitest run src/ui/End.test.tsx -t "copa salva o emprego"`
Proof: `npx vitest run src/engine/rollover.test.ts -t "veredito combinado no histórico"`

**C46** - A tela «Nova temporada» e a tela da copa mostram «Meta na copa: chegar às oitavas» para `cupGoal` 2. Os rótulos de 1, 3 e 4 são «chegar aos 16 avos», «chegar às quartas» e «chegar à semifinal» (AC 40)
Proof: `npx vitest run src/ui/NewSeason.test.tsx -t "meta na copa"`
Proof: `npx vitest run src/engine/board.test.ts -t "rótulos da meta de copa"`

### S7 - Telas da copa, do fim e do histórico · ~9 files · ~85 KB · ~21k

**C47** - A tela do elenco tem o botão «Copa», e clicá-lo abre a tela da copa com o título «Copa Nacional» (AC 41)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "botão copa"`

**C48** - Na data 1, a tela da copa lista as 6 fases na ordem, a «Preliminar» com os 8 confrontos (nomes dos dois clubes) e as outras 5 com «a sortear». Depois de uma fase jogada, os placares aparecem em cada confronto dela (AC 42)
Proof: `npx vitest run src/ui/Cup.test.tsx -t "fases e confrontos"`

**C49** - A situação do usuário diz «Na disputa» com o clube vivo, «Eliminado na Oitavas» quando caiu nas oitavas, e «Campeão» quando venceu a final (AC 43)
Proof: `npx vitest run src/ui/Cup.test.tsx -t "situação do usuário"`

**C50** - Com o usuário na Série A e a rodada 4 fechada, «Jogar rodada» não abre a tela «Ao vivo». A tela de resultados abre com «Copa Nacional · Preliminar», a preliminar fica com os 8 confrontos encerrados e o save gravado tem `currentPhase` 1 (AC 44)
Proof: `npx vitest run src/app.test.tsx -t "data de copa sem o usuário fecha direto"`

**C51** - Com o usuário vivo na copa e a próxima data sendo as «Oitavas», a tela «Ao vivo» tem o título «Ao vivo · Copa Nacional · Oitavas», e a lista «Jogos da rodada» tem 8 itens, todos confrontos da fase (AC 45)
Proof: `npx vitest run src/ui/Live.test.tsx -t "ao vivo da copa"`

**C52** - Depois de uma data de copa, a tela de resultados tem o título «Copa Nacional · <fase>», lista todos os confrontos da data e mostra «Próxima fase» com os confrontos sorteados. Depois da «Final», mostra «Campeão: X» no lugar de «Próxima fase» (AC 46)
Proof: `npx vitest run src/ui/Round.test.tsx -t "resultados da data de copa"`

**C53** - A tela Fim tem a seção «Copa Nacional» com «Campeão: X», «Vice: Y» e «Sua campanha: <fase>», e «Sua campanha: Campeão» quando o usuário venceu (AC 47)
Proof: `npx vitest run src/ui/End.test.tsx -t "copa no fim da temporada"`

**C54** - Na virada, o `SeasonRecord` da temporada ganha `cups: [{ cupId: "cup-nat", championId, runnerUpId, userReached }]` com os valores da copa encerrada. A aba «Campeões» do Histórico mostra a coluna «Copa Nacional» com o nome do campeão, e «-» numa temporada migrada com `cups` `[]` (AC 48)
Proof: `npx vitest run src/engine/rollover.test.ts -t "copa no histórico"`
Proof: `npx vitest run src/ui/History.test.tsx -t "campeão da copa no histórico"`

**C55** - Depois da virada, todo jogador em clube, entre os livres e entre os juniores tem `cupDiscipline` `{}`, incluindo um que tinha suspensão de copa. A copa nova tem `currentPhase` 0, a preliminar com 8 confrontos sem resultado e as outras 5 fases sem confrontos (AC 49)
Proof: `npx vitest run src/engine/rollover.test.ts -t "copa nova na virada"`

### S8 - Save v5 · ~5 files · ~55 KB · ~14k

**C56** - O documento gravado tem `schemaVersion` 5, `cups` com a copa, `cupGoal` numérico e `cupDiscipline` em todo jogador (AC 50, door 1)
Proof: `npx vitest run src/persistence/save.test.ts -t "documento tem schemaVersion 5 com copa"`

**C57** - Um save v4 na rodada 12 migra com as fases 0 e 1 encerradas e com vencedor, as «Oitavas» sorteadas com 8 confrontos sem resultado, e `nextDate` igual à rodada da liga de índice 12. O caixa de todos os clubes e a condição de todos os jogadores ficam iguais aos do v4 (AC 51, door 5)
Proof: `npx vitest run src/engine/migrate.test.ts -t "v4 no meio da temporada ganha copa"`

**C58** - Um save v4 na rodada 38 migra com as 6 fases encerradas e um campeão (AC 51)
Proof: `npx vitest run src/engine/migrate.test.ts -t "v4 no fim da temporada ganha copa decidida"`

**C59** - Na migração de um v4, todo jogador em clube, entre os livres e entre os juniores ganha `cupDiscipline` `{}`, cada `SeasonRecord` existente ganha `cups` `[]`, e o `cupGoal` do clube do usuário segue o C41 (AC 52)
Proof: `npx vitest run src/engine/migrate.test.ts -t "campos novos da v5"`

**C60** - Saves v1, v2 e v3 migram para v5 com a copa (AC 53)
Proof: `npx vitest run src/engine/migrate.test.ts -t "v1 v2 e v3 viram v5"`

**C61** - `schemaVersion` 6 e `"x"` são incompatíveis, e a tela inicial mostra «Jogo salvo incompatível (versão 6)» (AC 54) - Superseded por gastos-da-ia C30
Proof: `npx vitest run src/engine/migrate.test.ts -t "versão acima de 5 incompatível"`
Proof: `npx vitest run src/ui/Home.test.tsx -t "save de versão 6 incompatível"`

**C62** - Duas execuções da mesma seed com as mesmas decisões dão `cups` iguais depois de 38 `playRound`. Gravar e ler o save depois da «Preliminar» e seguir jogando dá o mesmo resultado que seguir sem recarregar (AC 55)
Proof: `npx vitest run src/engine/calendar.test.ts -t "mesma seed mesma copa"`
Proof: `npx vitest run src/persistence/save.test.ts -t "reload no meio da copa não muda nada"`

**C63** - A migração sorteia com a door 3 sobre `mix32(seed, 6)` e simula as partidas com a door 2 sobre `mix32(seed, 7)`. O teste recalcula o sorteio da preliminar e a semente da primeira partida a partir desses valores (door 5)
Proof: `npx vitest run src/engine/migrate.test.ts -t "sementes da migração da copa"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| fases da copa (6) | C2, table-driven over all 6 · prêmios C37 over all 6 | - |
| sequência de datas (44) | C1, table-driven over all 44 | - |
| começos de temporada (3) | jogo novo C8, C13 · virada C9, C13, C55 · migração C13, C57 | - |
| grupos do chaveamento (4) | A que ficou C9 · subiram C9 · caíram C9 · B que ficou C9 | - |
| sorteios de uma copa (6) | preliminar C10, C14 · 16 avos C10, C11, C14 · oitavas C11 · quartas C11 · semifinal C11 · final C11 | - |
| regras da disputa (4 casos) | encerra antes C16 · 5 x 4 C16 · alternadas até 1 gol C16 · virada nas alternadas C16 | - |
| chance do pênalti (5 linhas) | C17, table-driven over all 5 | - |
| batedores excluídos (2) | expulso C18 · substituído C18 | - |
| telas com placar de pênalti (3) | «Ao vivo» C20 · resultados C20 · copa C20 | - |
| disponibilidade (8 linhas) | C28, table-driven over all 8 | - |
| pontos de disponibilidade (4) | escalação da IA C29, C30 · banco ao vivo C29, C30 · validação do usuário C29 · tela do elenco C35 | - |
| efeitos da data de copa sobre a condição (6) | amarelo C24 · vermelho C25 · suspensão cumprida C31 · lesão C32 · cansaço C32, C34 · moral C33, C34 | - |
| o que a data de copa não toca (6) | disciplina da liga C26 · tabela C22 · estatísticas C22 · folha e juros C38 · obra C38 · mercado C39 | - |
| rótulos da meta de copa (4) | 1 C46 · 2 C46 · 3 C46 · 4 C46 | - |
| faixas da meta de copa (4) | preliminar C41 · 1-4 C41 · 5-8 C41 · resto C41 | - |
| veredito combinado (9 linhas) | C44, table-driven over all 9 | - |
| onde o veredito combinado vale (3) | tela Fim C45 · propostas de emprego C45 · `SeasonRecord.verdict` C45 | - |
| situações do usuário na copa (3) | «Na disputa» C49 · «Eliminado na <fase>» C49 · «Campeão» C49 | - |
| versões de save (6) | v1 C60 · v2 C60 · v3 C60 · v4 C57, C58, C59 · v5 C56 · v6 C61 | - |
| portas de mão única (6) | door 1 C2, C8, C56 · door 2 C23 · door 3 C14 · door 4 C1, C2 · door 5 C57, C63 · door 6 C28 | - |
| entidades de `Relations` (6) | Save → Cup C2 · Cup → 6 CupPhase C2 · CupPhase → Tie C10, C11 · Tie → Club (home, away) C12 · Player → CupDiscipline C24, C55, C59 · SeasonRecord → CupRecord C54 | - |
| restrições de mão única (4) | `cups[0]` é `"cup-nat"` C2 · chaveamento com 40 ids fixos C8 · sorteio nunca refeito C11, C14 · `cupDiscipline` sempre presente C56, C59 | - |

- `Surface` do plano é `None`; nenhuma rota.
- Claims que cruzam a persistência: C50, C56, C57, C58, C59, C60, C61, C62.

## Superseded checks of earlier features

O plano aprovado muda contratos já provados. Os testes abaixo mudam no mesmo commit da mudança:

| Check anterior | O que muda | Substituído por |
| --- | --- | --- |
| multiplas-temporadas C50 (versão 5 incompatível) | a versão 5 passa a ser a atual; o teste `migrateSave({ schemaVersion: 5 })` e o `save de versão 5 incompatível` da Home passam a usar a versão 6 | C61 |
| multiplas-temporadas C51 (documento gravado v4; v4 passa direto) | o documento é v5; `save.test` e `migrate.test` passam de `toBe(4)` para `toBe(5)`, e o v4 passa a ser migrado | C56, C59 |
| multiplas-temporadas C48, C49 (v3, v2 e v1 viram v4) | viram v5 passando pela v4; as asserções da v4 continuam valendo sobre o resultado | C60 |
| elenco-mercado-financas C13 (caixa de uma temporada entre 50% e 250%, mediana entre 90% e 160%, sem o prêmio da liga) | o teste `caixa equilibrado em uma temporada` passa a descontar também a bilheteria e o prêmio da copa, como já desconta o prêmio da liga: ele mede o custo corrente. As faixas não mudam. Medido no build (seeds 1–5): com a copa, máx 2,81 e mediana 1,74; sem a receita da copa, 0,98 / 1,48 / 2,25. Escolha do autor em 27/09/2026 | C38 |
| `playRound` do engine (usado em loops de 38 rodadas em `balance`, `rollover`, `finance` e `save`) | passa a jogar também as datas de copa pendentes; 38 chamadas continuam sendo uma temporada. Testes que fixam números literais depois da rodada 4 são recalculados a partir do estado, sem mudar o que asseguram | C5 |

## Swept

- validation: C29 (escalação com suspenso na copa recusada), C61 (versão)
- failure modes: existing - o caminho de gravação que falha (store `persist`) já cobre qualquer data; C50 prova a gravação da data de copa
- idempotency: C62 (recarregar no meio da copa não muda o resultado)
- authorization: n/a - jogo local de um jogador, sem contas
- concurrency: n/a - «Jogar rodada» roda uma vez por clique; o store bloqueia com `finishing` enquanto grava, como na liga
- data lifecycle: C55 (disciplina zerada e copa nova na virada), C54 (histórico só cresce), C57 (backfill da migração)
- dependency failure: existing - os avisos de IndexedDB do núcleo cobrem o save; nada novo de fora
- state transitions: C1, C3, C4, C11, C21
- observability: n/a - sem requisito de log

## Handoff

- Arquivos existentes lidos e mudados: `types`, `generate`, `live`, `season`, `condition`, `lineup`, `finance`, `board`, `rollover`, `migrate`, `narration`, `store`, `App` e as telas `Squad`, `Round`, `Live`, `End`, `History`, `NewSeason`, `Finance`, `Condition`: 152 KB. Os testes deles e as fixtures: 131 KB. Soma 283 KB → ~71k
- Código novo (`engine/calendar`, `engine/cup`, a tela `Cup` e os testes deles) ≈ 80 KB → ~20k
- Soma por fatia: S1 ≈ 24k; S2 fica em 39k acumulado, S3 em 59k, S4 em 82k, S5 em 92k, S6 em 106k, S7 em 127k e S8 em 141k. As fatias se sobrepõem nos mesmos arquivos, então o total real fica perto de ~91k
- Total ≈ 91k (limite superior 141k), abaixo do budget de 150k: one builder
- Risco anotado: a banda de caixa de 5 temporadas (multiplas-temporadas C34) agora inclui o dinheiro da copa. Se alguma seed sair da banda, o builder para e pergunta; não mexe na banda

- **Closed with the engine commit (`feat(engine): national cup, calendar, penalties and save v5`):** C1–C5, C8–C19, C21–C34, C36–C39, C41, C43, C44, C54–C63
- **Closed with the UI commit (`feat(ui): cup screen, cup dates in live and results, cup goal`):** C6, C7, C20, C35, C40, C42, C45–C53
- **Gate:** the full suite ran as `npx vitest run --maxWorkers=2`, as the orchestrator allowed. With the default workers, the baseline already timed out under load in `app.test.tsx` and `Market.test.tsx`; no timeout was raised and no flaky test was edited.
- **Boundary:** C1–C63 closed at `69eaa2a` (engine at `ac0b16d`); feature range `1417b07..HEAD`
- **Settled mid-build:**
  - The one-season cash test leaves cup income out, and C18 counts the 11th kick. Both were the author's choices on 27/09/2026, committed in `ba274c2`.
  - The shoot-out lives in `engine/live` (minute-90 step), which already owns the match's `Rng`; `Flow` says so.
  - `MATCH_EVENT_TYPES` stays the 10 events of play; the two penalty events are `PENALTY_EVENT_TYPES`, so the earlier checks that pin 10 types do not move.
  - `playDate` and `playRound` live in `engine/season`, since `engine/cup` already imports the live engine.
- **Abandoned:** nothing.
