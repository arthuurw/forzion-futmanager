# Nível de dificuldade

## Problem

O jogo tem um só nível: todo clube começa com 10 rodadas de folha em caixa, a diretoria aceita até 3 posições abaixo da força do clube, e cada clube da IA tem 25% de chance de tentar uma compra por rodada com o mercado aberto. Quem está começando é demitido cedo num clube pequeno, e quem já domina o jogo não tem como apertar. O autor escolheu esta feature em 02/10/2026 entre seis candidatas; não há métrica.

Quando isto sair, a tela «Escolher clube» pergunta a dificuldade (Fácil, Normal ou Difícil, Normal já marcado), e ela vale para o jogo inteiro: muda o caixa inicial do clube escolhido, a meta da diretoria em todas as temporadas e o apetite de compra da IA. «Jogos salvos» mostra a dificuldade de cada jogo.

## Flow

Reusa a escolha de clube da store (`chooseClub`), a meta da diretoria (`engine/board.userBoardGoal`, chamada na escolha, na virada, na troca de clube e na migração), as compras da IA (`engine/market.aiPurchases`) e o resumo dos espaços de «Jogos salvos» (`store.okView`).

1. «Novo jogo» -> «Escolher clube» (`ui/ChooseClub`, exists) mostra o campo «Dificuldade» com Normal marcado e a frase do nível
2. clique num clube -> `store.chooseClub(clubId, dificuldade)` (exists) grava `GameState.difficulty` (door 1) e multiplica o caixa inicial do clube escolhido (×2 no Fácil, ×0,5 no Difícil)
3. meta da diretoria -> `engine/board.userBoardGoal` (exists) usa a folga do nível (+5 Fácil, +3 Normal, +1 Difícil) no lugar do +3 fixo; vale em toda chamada (escolha, virada, troca de clube)
4. rodada com mercado aberto -> `engine/market.aiPurchases` (exists) usa a chance do nível (15% Fácil, 25% Normal, 35% Difícil) contra o mesmo sorteio de hoje (o fluxo da door 3 de gastos-da-ia não muda)
5. «Jogos salvos» -> `store.okView` (exists) acrescenta « · <nível>» ao resumo

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: dificuldade (`difficulty`: `"easy"`, `"normal"`, `"hard"`; na tela Fácil, Normal, Difícil) |
| domain | existing term: a folga da meta (`boardGoalFor`, hoje `rank + 3`) passa a depender do nível; os tetos (16 com rebaixamento, 17 sem) e a meta «subir» da Série B continuam |
| domain | existing behaviour: `AI_BUY_CHANCE` (0,25) passa a ser a chance do Normal; o sorteio por clube continua o mesmo, então um jogo Normal joga igual ao de hoje, semente por semente |
| stored data | `GameState.difficulty?` opcional, ausente = Normal; save continua v8. Um save de antes abre como Normal e joga igual |

## Relations

None - um campo no `GameState`, sem entidade nova.

## Surface

None - nothing consumed outside. O arquivo exportado (AD-018) leva `difficulty` junto com o jogo.

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. o nível no save | `GameState.difficulty?: "easy" \| "normal" \| "hard"`, gravado por `chooseClub` em todo jogo novo; ausente = `"normal"`; não muda depois da escolha; save continua v8. Os efeitos ficam numa tabela do motor (`DIFFICULTY`: caixa ×2 / ×1 / ×0,5, folga da meta 5 / 3 / 1, chance de compra da IA 0,15 / 0,25 / 0,35), não no save | gravar cada efeito (multiplicador de caixa, folga, chance) no save: um save velho guardaria números que a calibração depois quer mudar; nível escolhido em «Novo jogo», antes do clube: um passo e uma tela a mais para uma escolha que cabe ao lado da lista de clubes |

- Os números da tabela `DIFFICULTY` são reversíveis: o save guarda o nome do nível, não os números
- Nothing else in this change is hard to reverse

## Criteria

### S1: escolher o nível (P1)

**Acceptance Criteria**

1. WHEN a tela «Escolher clube» abre THEN the system SHALL mostrar o grupo «Dificuldade» com as opções «Fácil», «Normal» e «Difícil», nessa ordem, com «Normal» marcada, e abaixo a frase do nível marcado: Fácil «Mais caixa no começo, diretoria mais paciente e IA comprando menos.»; Normal «O jogo de sempre.»; Difícil «Menos caixa no começo, diretoria exigente e IA comprando mais.».
2. WHEN o usuário escolhe um clube THEN the system SHALL gravar no jogo a dificuldade marcada (`"easy"`, `"normal"` ou `"hard"`).
3. WHEN o usuário escolhe um clube THEN the system SHALL deixar o caixa desse clube em 2× o caixa gerado no Fácil, igual no Normal e 0,5× no Difícil, arredondado a R$ 100.000; os outros clubes não mudam.

**Independent test:** marcar «Difícil», escolher um clube e ver o caixa na metade e `difficulty: "hard"` no jogo gravado.

### S2: o nível pesa a temporada toda (P1)

**Acceptance Criteria**

4. The system SHALL calcular a meta da diretoria com a folga do nível no lugar do +3: posição de força + 5 no Fácil, + 3 no Normal (ou sem nível), + 1 no Difícil, com os tetos de hoje (16 em divisão com rebaixamento, 17 sem) e a meta «subir» da Série B para quem está entre os 4 mais fortes, na escolha do clube, na virada e na troca de clube.
5. WHILE o mercado está aberto the system SHALL usar como chance de compra de cada clube da IA 15% no Fácil, 25% no Normal (ou sem nível) e 35% no Difícil, contra o mesmo número sorteado de hoje para cada clube.
6. The system SHALL jogar um jogo sem `difficulty` e um com `"normal"` exatamente como hoje (o mesmo jogo, semente por semente).

**Independent test:** o mesmo jogo em Fácil e em Difícil tem metas diferentes e, numa rodada de janela, compras da IA diferentes.

### S3: ver o nível (P2)

**Acceptance Criteria**

7. The system SHALL mostrar no resumo de cada jogo legível de «Jogos salvos» « · Fácil», « · Normal» ou « · Difícil» depois de «Temporada <n>» (sem nível = Normal).
8. The system SHALL caber em 400 × 700 px sem rolagem a tela «Escolher clube» com o grupo «Dificuldade» (AD-010).

**Independent test:** `npm run check:layout` mede `chooseClub` com o grupo à vista.

## Out of scope

| Excluded | Why |
| --- | --- |
| mudar o nível no meio do jogo | o nível escolhe o desafio antes de começar; mudar depois tornaria a meta da temporada um alvo móvel |
| nível personalizado (cada efeito separado) | três níveis bastam para o pedido; os números ficam numa tabela do motor |
| caixa do clube novo ao trocar de clube | o multiplicador é do começo da carreira; o clube que contrata no meio do jogo tem o caixa dele |
| força da IA nas partidas | mexeria no motor da partida (AD-007) e no balanço das 5 temporadas |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| o que o nível muda | caixa inicial, folga da meta, chance de compra da IA | três alavancas que já existem como número, sem mexer na partida | n |
| quanto | caixa ×2 / ×1 / ×0,5; folga 5 / 3 / 1; chance 15% / 25% / 35% | o Normal é o jogo de hoje; os outros dois se afastam o bastante para se sentir na primeira temporada | n |
| onde escolher | na tela «Escolher clube», acima da lista | é o passo em que a carreira começa; não cria tela nova | n |
| decisões do autor | defaults recomendados sem rodada de perguntas | o autor pediu em 02/10/2026 «1, 2 e 3. siga até o fim» | y |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen «Escolher clube» grupo «Dificuldade» | default e ordem | AC 1 |
| screen «Escolher clube» | density | AC 8 |
| screen «Escolher clube» | loading state | n/a - escolha local, sem espera |
| screen «Escolher clube» | error state | n/a - sempre há um nível marcado |
| screen «Escolher clube» | empty state | n/a - as três opções sempre aparecem |
| screen «Escolher clube» | unauthorised state | n/a - jogo local, sem contas |
| screen «Jogos salvos» | o nível no resumo | AC 7 |
| save | campo novo | AC 2, door 1 |
| motor | efeitos | AC 3, AC 4, AC 5, AC 6 |

## Sources

- Pedido do autor em 02/10/2026: «1, 2 e 3. siga até o fim. já coloque no state as outras. use a /tlc-spec-lean».
- `.specs/STATE.md` AD-010, AD-018, AD-024 - tela sem rolagem, o envelope e a carreira (meta e demissão) que esta feature lê.
