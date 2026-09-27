# Ajustes da copa e do mercado da IA

## Problem

Três pendências ficaram registradas no `STATE.md` depois da copa-nacional e do gasto da IA.

1. **Suspensão de copa bloqueia data que o usuário não joga.** Numa data de copa, a escalação do usuário é validada pela disciplina da copa mesmo quando o clube dele não tem confronto naquela fase. Isso acontece se ele foi eliminado ou se está entre os 24 clubes que pulam a Preliminar. Uma suspensão de copa só é cumprida jogando a copa (copa-nacional AC 25). Por isso, um eliminado com um titular expulso fica com a suspensão até a virada, e em toda data de copa seguinte «Jogar rodada» fica desligado até ele tirar esse titular, embora o AC 44 diga que o botão fecha a data direto. O Verifier da copa registrou isso como lição L-017 (AC 23 × AC 44).
2. **A IA compra lesionado, e o mesmo jogador roda por vários clubes.** Um reserva lesionado não entra no time de quem o compra e continua elegível como reserva. Na mesma rodada, outro clube da IA pode comprá-lo de novo, e na seed 1 um jogador passou por até 4 clubes numa rodada. O boletim «Transferências» mostra essas voltas, e o usuário vê um mercado sem sentido.
3. **Uma regra decidida não tem teste.** A sobra da compra da IA (gastos-da-ia AC 1) conta o salário atual do jogador, não o de 1,2× da tabela. Os testes de C1 e C9 usam jogadores cujos dois salários são iguais, então um build com a outra leitura passaria (nota 1 do Verifier de gastos-da-ia).

Evidência: `STATE.md` (handoff de 27/09/2026), `.specs/features/copa-nacional/verification.md` e `.specs/features/gastos-da-ia/verification.md`. Não há métrica de uso.

Quando isto for entregue:
- um usuário fora da data de copa escala pela disciplina da liga, que é a do próximo jogo dele;
- a IA não compra lesionado e não revende na mesma temporada quem acabou de comprar;
- a regra da sobra fica travada por teste.

## Flow

Reutiliza `calendar.nextDate`/`competitionOf`, `lineup.isAvailableFor`/`validateLineup`, a busca de candidatos de `market.tryAiPurchase` e o boletim `market.transfers` como registro de quem já foi comprado. Nenhum estado novo é gravado.

1. telas Squad, Round e Condition (exist) - pedem a competição do próximo jogo **do usuário** a `engine/calendar` (exists), no lugar da competição da próxima data
2. `engine/calendar` (exists) - se a próxima data é de copa e o clube do usuário não tem confronto na fase, devolve a liga; senão, a competição da data, como hoje
3. `engine/market.closeRoundMarket` (exists) → compras da IA e venda do vermelho - o filtro de candidatos exclui quem já tem linha `buy` com destino a um clube da IA nesta temporada em `market.transfers`; as compras também excluem lesionados

## Impact

| Front | What changes |
| --- | --- |
| domain | existing term: `nextCompetition(state)` respondia «a competição da próxima data». Para a escalação do usuário passa a valer «a competição do próximo jogo do usuário». Quem lê hoje: `Squad` (validação e marcas), `Round` (`canPlay`) e `Condition` (marca «Suspenso (copa)»). A escalação da IA e o banco ao vivo continuam pela data, porque só montam times de quem joga |
| domain | existing criterion: copa-nacional AC 23 («WHILE a próxima data é uma fase de copa ... na validação da escalação do usuário») passa a valer só quando o usuário joga a fase. Os testes de C29 da copa usam uma data que o usuário joga e não mudam. O teste de C35 da copa («suspensões pela próxima data») usava um clube que pula a Preliminar: só a fixture muda, para um clube da Preliminar (Série B, clube 0, seed 102); nenhum valor esperado muda |
| domain | existing term: candidato da compra da IA (gastos-da-ia AC 3) ganha dois filtros: sem lesão e sem compra pela IA nesta temporada. A venda do vermelho (AC 9) ganha só o segundo: continua vendendo lesionado. Fixtures antigas ajustadas, sem mudar valor esperado: o goleiro 90 de `everyoneBuys` e de «compras da IA não mudam os outros sorteios» fica fora do onze por suspensão de liga, não por lesão; «prêmio por posição na rodada 38» (finance) usa `zeroAiSurplus` antes da rodada 38, porque as compras novas deixam um clube da IA ampliar o estádio nela |
| domain | existing criterion: as faixas de gastos-da-ia C19, C20, C21 e C34 continuam valendo sem mudança; as compras mudam e a medição tem de ser refeita |
| stored data | nothing to migrate: o boletim já existe no save v6 |

## Relations

None - no stored-data shape change.

## Surface

None - nothing consumed outside. É um SPA estático sem API (AD-001).

## Landing

None - nenhum formato gravado, contrato ou dependência muda. «Já comprado nesta temporada» é lido do boletim que o save v6 já guarda, e a regra reverte mudando um filtro.

## Criteria

### S1: A escalação segue o próximo jogo do usuário (P1)

**Acceptance Criteria**

1. WHEN a próxima data é uma fase de copa e o clube do usuário não tem confronto nela THEN a validação da escalação do usuário SHALL usar a disciplina da liga: um titular só com suspensão de copa conta como disponível e um titular com suspensão de liga conta como indisponível
2. WHILE a próxima data é uma fase de copa em que o clube do usuário tem confronto a validação SHALL continuar pela disciplina da copa, como no copa-nacional AC 23
3. WHEN a próxima data é de copa, o usuário não joga a fase e um titular tem só suspensão de copa THEN «Jogar rodada» SHALL estar ligado nas telas Elenco e Resultados, e a tela Condição SHALL mostrar esse jogador sem a marca «Suspenso (copa)»
4. The regra dos AC 1–3 SHALL valer tanto para um clube eliminado quanto para um clube que pula a Preliminar

**Independent test:** um usuário eliminado nas Oitavas com um titular suspenso na copa chega à data das Quartas com «Jogar rodada» ligado e a data fecha direto.

### S2: A IA não compra lesionado nem revende quem acabou de comprar (P1)

**Acceptance Criteria**

5. WHEN a IA monta os candidatos de uma compra (gastos-da-ia AC 3) THEN o sistema SHALL excluir todo jogador com `injuryRounds` acima de 0
6. WHEN a IA monta os candidatos de uma compra THEN o sistema SHALL excluir todo jogador que já tem, em `market.transfers`, uma linha `kind: "buy"` cujo `toId` é um clube da IA
7. The venda do vermelho (gastos-da-ia AC 9) SHALL escolher o jogador mais valioso entre os que não têm linha `buy` com destino a um clube da IA nesta temporada, lesionado ou não
8. The sistema SHALL, em 3 seeds e 5 temporadas sem usuário, ter no boletim de cada temporada no máximo uma linha `buy` por jogador, e SHALL continuar dentro das faixas de gastos-da-ia C19, C20, C21 e C34

**Independent test:** a simulação de 5 temporadas imprime o maior número de compras da IA de um mesmo jogador numa temporada, que é 1, e as faixas de caixa, força e compras.

### S3: A sobra da compra fica travada por teste (P2)

**Acceptance Criteria**

9. WHEN um candidato tem salário atual abaixo de 1,2 × `salaryFor(força)` e preço entre a sobra calculada com o salário atual e a sobra calculada com o salário de 1,2× THEN a IA SHALL comprá-lo, porque a sobra da compra usa o salário atual (gastos-da-ia AC 1)

**Independent test:** um único teste de mercado com esse candidato mostra a compra.

## Out of scope

| Excluded | Why |
| --- | --- |
| a suspensão de copa ser cumprida por quem não joga a data | mudaria copa-nacional AC 25; com o S1, a suspensão presa não bloqueia mais nada até a virada |
| a IA vender ou dispensar lesionados | não foi pedido; a lesão já cura com as datas |
| o painel «Transferências» provar o «ao lado do aviso» (nota 2 do Verifier de gastos-da-ia) | não está nas pendências do `STATE.md`; é precisão de teste, não comportamento |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| janela de «acabou de comprar» | a temporada inteira, lida do boletim | o boletim já guarda a temporada; limitar à janela exigiria saber a janela de cada linha, e revender em meia temporada não foi pedido | n |
| o que conta como «já comprado» | só linhas `buy` com destino a um clube da IA; uma proposta aceita também conta, porque o destino é da IA | a regra é sobre a IA revender quem ela comprou | n |
| faixas depois da mudança | se C19, C20, C21 ou C34 saírem da faixa, o builder para e traz a medição; não mexe em constante nem em faixa | as faixas são obrigação aprovada | n |
| quem decide | o autor delegou: «pode planejar ... as pendencias ja registradas no state.md» (27/09/2026) e prefere as recomendações sem rodada de perguntas | user delegated | y |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen Elenco | «Jogar rodada» em data de copa sem o usuário | AC 3 |
| screen Resultados | «Jogar rodada» em data de copa sem o usuário | AC 3 |
| screen Condição | marca «Suspenso (copa)» em data sem o usuário | AC 3 |
| screen Elenco, Resultados, Condição | empty, loading, error, unauthorised | n/a - a mudança só troca a competição lida; nenhum estado novo de tela |
| screen Mercado, aba «Transferências» | ordem e densidade | existing - gastos-da-ia AC 19; só há menos linhas |

## Sources

- `.specs/STATE.md`, handoff de 27/09/2026 - as três pendências
- `.specs/features/copa-nacional/verification.md` - L-017, AC 23 × AC 44
- `.specs/features/gastos-da-ia/verification.md` - nota 1
