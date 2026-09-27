# Ajustes da copa e do mercado da IA - checks

Profile: light
Plan: `.specs/features/ajustes-4a/plan.md`

## Intent

12 checks in 3 slices · 0 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`). Telas usam `@testing-library/react` em jsdom. Todo valor esperado é literal ou calculado no próprio teste, nunca pela função de produção sob teste (L-004). Tabelas cobrem o conjunto inteiro (L-005). Lições aplicadas: L-003 (fiação pelo ponto de entrada), L-007 (fixture com o membro excluído), L-017 (AC 23 × AC 44), L-018 (fixture em que os dois valores candidatos diferem).

Na derivação, o AC 7 e o AC 8 do plano foram reescritos antes de qualquer check (commit destes checks) para o AC 8 ser medível: a venda do vermelho também exclui quem já foi comprado pela IA na temporada, então «no máximo uma linha `buy` por jogador por temporada» vale sem exceção numa simulação sem usuário.

## Checks

### S1 - A escalação segue o próximo jogo do usuário · ~7 files · ~95 KB · ~24k

**C1** ✓ - Tabela sobre a competição usada na validação da escalação do usuário, com um titular só com suspensão de copa (A) e outro só com suspensão de liga (B): próxima data é de copa e o usuário não tem confronto na fase → a validação falha só por B; próxima data é de copa e o usuário tem confronto → falha só por A; próxima data é de liga → falha só por B (AC 1, AC 2)
Proof: `npx vitest run src/engine/calendar.test.ts -t "competição do próximo jogo do usuário"`

**C2** ✓ - A regra do C1 vale para um clube eliminado numa fase anterior e para um clube entre os 24 que pulam a Preliminar, na data da Preliminar: nos dois casos a competição do próximo jogo é a liga (AC 4)
Proof: `npx vitest run src/engine/calendar.test.ts -t "eliminado e isento da preliminar"`

**C3** ✓ - Numa data de copa sem o usuário e com um titular só com suspensão de copa: na tela Elenco, «Jogar rodada» está ligado e não aparece «Faltam»; na tela de Resultados, «Jogar rodada» está ligado; na tela Condição, esse jogador não tem a marca «Suspenso (copa)». Com o usuário na fase, as três telas bloqueiam e marcam como hoje (AC 3, L-007)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "data de copa sem o usuário libera o suspenso de copa"`
Proof: `npx vitest run src/ui/Round.test.tsx -t "data de copa sem o usuário libera o suspenso de copa"`

**C4** ✓ - Pela store: um usuário eliminado com um titular suspenso na copa aperta «Jogar rodada» na data de copa seguinte; a data fecha direto, sem a tela «Ao vivo», e a tela de resultados dela aparece (AC 3 com copa-nacional AC 44, L-003)
Proof: `npx vitest run src/store.test.ts -t "eliminado com suspenso de copa joga a data"`

### S2 - A IA não compra lesionado nem revende quem acabou de comprar · ~3 files · ~70 KB · ~18k

**C5** - Numa compra da IA, o candidato mais forte tem `injuryRounds` 1 e o segundo tem 0: a IA compra o segundo. Com o mais forte em `injuryRounds` 0, compra o mais forte (AC 5, L-007)
Proof: `npx vitest run src/engine/market.test.ts -t "IA não compra lesionado"`

**C6** - Tabela de candidatos para uma compra da IA, todos elegíveis fora isto: com linha `buy` para um clube da IA nesta temporada → fora; com linha `buy` de proposta aceita (destino clube da IA) → fora; com linha `free` → dentro; com linha `release` → dentro; sem linha → dentro (AC 6)
Proof: `npx vitest run src/engine/market.test.ts -t "IA não revende quem comprou na temporada"`

**C7** - Um clube da IA no vermelho cujo jogador mais valioso está lesionado vende esse jogador. Se o mais valioso já tem linha `buy` para um clube da IA nesta temporada, vende o segundo mais valioso (AC 7, L-007)
Proof: `npx vitest run src/engine/market.test.ts -t "venda do vermelho com lesionado e com comprado"`

**C8** - Em 3 seeds (1, 2, 3) e 5 temporadas sem usuário, nenhum jogador tem mais de uma linha `buy` no boletim de uma mesma temporada, contado antes de cada virada (AC 8)
Proof: `npx vitest run src/engine/balance.test.ts -t "uma compra por jogador por temporada"`

**C9** - As faixas de gastos-da-ia continuam valendo depois dos filtros novos: caixa em 5 temporadas (C19), compras em 5 temporadas (C20), força estável (C21) e resultado corrente de uma temporada (C34), sem mudar nenhum limite (AC 8)
Proof: `npx vitest run src/engine/balance.test.ts -t "caixa em 5 temporadas"`
Proof: `npx vitest run src/engine/balance.test.ts -t "compras da IA em 5 temporadas"`
Proof: `npx vitest run src/engine/balance.test.ts -t "força estável em 5 temporadas"`
Proof: `npx vitest run src/engine/balance.test.ts -t "caixa equilibrado em uma temporada"`

**C10** - Os proofs de gastos-da-ia C1–C24 continuam verdes; nenhum valor esperado deles muda (Impact)
Proof: `npx vitest run src/engine/market.test.ts -t "sobra da IA|compra no limite da sobra|chance de compra pelo fluxo da door 3|candidatos da compra da IA|escolha do reforço da IA|vermelho vende o mais valioso|boletim registra cada movimento da IA"`

### S3 - A sobra da compra fica travada por teste · ~1 file · ~20 KB · ~5k

**C11** - Um candidato de força 70 com salário atual R$ 20.000 (abaixo de 1,2 × `salaryFor(70)`, valor literal da tabela no teste) tem preço maior que a sobra do comprador calculada com o salário de 1,2× e menor ou igual à calculada com o salário atual: a IA compra (AC 9)
Proof: `npx vitest run src/engine/market.test.ts -t "sobra da compra usa o salário atual"`

**C12** - O mesmo candidato do C11 com preço R$ 10.000 acima da sobra calculada com o salário atual não é comprado (AC 9)
Proof: `npx vitest run src/engine/market.test.ts -t "sobra da compra usa o salário atual"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| competição do próximo jogo (3) | copa sem o usuário C1 · copa com o usuário C1 · liga C1 | - |
| motivos de ficar fora da fase (2) | eliminado C2 · isento da Preliminar C2 | - |
| telas que decidem «Jogar rodada» ou a marca (3) | Elenco C3 · Resultados C3 · Condição C3 | - |
| filtros novos da compra (2) | lesão C5 · comprado na temporada C6 | - |
| tipos de linha no boletim vs filtro (4) | `buy` IA C6 · `buy` de proposta C6 · `free` C6 · `release` C6 | - |
| venda do vermelho (2) | lesionado vende C7 · comprado pula C7 | - |
| borda da sobra (2) | dentro C11 · acima C12 | - |
| faixas de gastos-da-ia (4) | caixa em 5 temporadas C9 · compras em 5 temporadas C9 · força estável C9 · uma temporada C9 | - |

- Nenhum check afirma mais do que o caso que a prova exercita.

## Superseded checks of earlier features

| Check | What changes | Now proven by |
| --- | --- | --- |
| copa-nacional AC 23 na validação do usuário | vale só quando o usuário tem confronto na fase; os testes de copa-nacional C29 usam uma data que o usuário joga e não mudam | C1 |

Regra para os outros testes existentes: um teste antigo de mercado cuja fixture tinha um candidato lesionado ou já comprado na temporada pode ter a **fixture** ajustada para tirar a lesão ou a linha do boletim, sem mudar nenhum valor esperado. Mudar um valor esperado de um teste antigo é parada e pergunta.

## Swept

- validation: C5, C6 - os filtros novos de candidato
- failure modes: n/a - nenhuma operação nova pode falhar pela metade; a escolha de competição e os filtros são puros
- idempotency: n/a - a competição é recalculada do estado a cada leitura, sem gravar nada; os filtros leem o boletim
- authorization: n/a - jogo local de um jogador; o clube do usuário continua fora das compras da IA (teste «IA nunca compra do usuário» de gastos-da-ia)
- concurrency: n/a - o motor roda numa thread só; a ordem da rodada não muda
- data lifecycle: existing - o boletim é esvaziado na virada (teste «virada esvazia o boletim» de gastos-da-ia), então «nesta temporada» é o boletim inteiro
- dependency failure: n/a - nada novo de fora
- state transitions: C1, C2 - a competição do próximo jogo muda com a fase e com o clube estar vivo
- observability: C8 - o boletim fica sem voltas do mesmo jogador

## Handoff

- Arquivos existentes: `calendar`, `market`, `lineup`, `market.test`, `cup.test`, `balance.test`, telas `Squad`, `Round`, `Condition` e seus testes, `store.test`: 177 KB → ~44k. Código e testes novos ≈ 12 KB → ~3k
- S1 ≈ 24k; S2 fica em 42k acumulado; S3 em 47k. Total ≈ 47k, abaixo do budget de 150k: one builder
- Risco anotado: os filtros mudam as compras da IA. Se alguma faixa de C9 sair do limite, o builder para e traz a medição; não mexe em constante nem em faixa
