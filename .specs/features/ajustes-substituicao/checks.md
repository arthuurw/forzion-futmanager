# Ajustes da substituição - checks

Profile: light
Plan: none - bounded change (live engine, live screen, layout script), no one-way door; intent below.

## Intent

O Verifier do round 2 de posicao-na-substituicao (01/10/2026) deixou quatro pontos fracos, e o autor pediu para fechá-los antes da próxima feature:

1. A prova de C9 passava também no código de antes: o fixture punha «Sai» na própria vaga do expulso, e não numa vaga de lesão com um expulso em outra vaga, que era o caso do achado (L-029).
2. Com o gol vazio por expulsão e um goleiro em «Entra», o campo «Posição» oferecia «no lugar de <jogador de linha>», mas a regra da parada obrigatória põe o goleiro no gol de qualquer jeito, e o select voltava sozinho para o gol. Com esta mudança, a opção que mente sai: nesse caso o campo oferece só as vagas de expulso, a do gol primeiro e já escolhida.
3. Os dois movimentos da regra do goleiro (a troca do usuário e o preenchimento automático) moviam o buraco do expulso sem gravar o setor. Uma troca de formação depois da troca do usuário devolvia o buraco ao gol e tirava o goleiro reserva do gol. Com esta mudança, todo buraco movido grava o setor da vaga que recebeu, como a troca para a vaga do expulso já faz.
4. O layout não media a tela ao vivo com o campo «Posição» à vista. Com esta mudança, o `check:layout` deixa a primeira partida da temporada correr até a primeira expulsão do usuário (seed 1) e mede essa tela parada.

5 checks in 2 slices · 0 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`); layout `npm run check:layout`.

Lições aplicadas: L-003 (pela tela), L-005 (formações em tabela), L-018 (o setor gravado e o setor do expulso diferem no fixture), L-027 (a tela nova é medida com o campo à vista), L-028 (a troca de formação depois do movimento), L-029 (cada prova falha no código de antes).

## Checks

### S1 - Tela e motor · 4 files · ~110 KB · ~28k

**C1** - Na tela ao vivo parada com o zagueiro da vaga 2 expulso e o jogador da vaga 5 fora por lesão (vaga vazia de lesão), «Sai» na vaga 5 deixa o campo «Posição» com exatamente uma opção, «no lugar de <lesionado> (<setor da vaga 5>)», sem «na vaga de <expulso>». No código de 86e3475 a mesma tela oferecia também a vaga do expulso.
Proof: `npx vitest run src/ui/Live.test.tsx -t "posição com sai lesionado"`

**C2** - Na tela ao vivo parada com o goleiro expulso e nenhum outro expulso, «Sai» = o jogador de linha da vaga 2 e «Entra» = o goleiro reserva deixam o campo «Posição» com exatamente uma opção, «na vaga de <goleiro expulso> (GOL, expulso)», já escolhida; não há opção «no lugar de <jogador da vaga 2>».
Proof: `npx vitest run src/ui/Live.test.tsx -t "goleiro reserva só no gol"`

**C3** - `substitute(live, clubId, 2, <goleiro reserva>)` sem `target`, com o goleiro expulso, grava `vacancy[2]` = `{ why: "red", playerId: <goleiro expulso>, pos: "DF" }`. Depois, `changeFormation` para 4-4-2, 4-5-1, 4-3-3 e 3-5-2 (tabela) deixa, em cada uma, o goleiro reserva na vaga GOL e o buraco vermelho numa vaga DF, com 10 em campo.
Proof: `npx vitest run src/engine/live.test.ts -t "regra do goleiro grava o setor"`

**C4** - `runToEnd(live, { fillUserVacancies: true })` a partir do minuto 10 com o goleiro do usuário expulso põe o goleiro reserva na vaga GOL, e a vaga deixada pelo jogador de linha que saiu fica com `{ why: "red", playerId: <goleiro expulso>, pos: <setor dessa vaga> }`.
Proof: `npx vitest run src/engine/live.test.ts -t "preenchimento do gol grava o setor"`

### S2 - Layout · 1 file · ~20 KB · ~5k

**C5** - `npm run check:layout` (seed 1) sai 0 e mede 17 telas, entre elas `liveRed`: a tela ao vivo parada pela primeira expulsão do usuário, com o campo «Posição» à vista e dentro da janela de 400 × 700, sem rolagem. A última linha é «layout: as 17 telas cabem em 400 × 700 px».
Proof: `npm run check:layout`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| achados do Verifier round 2 (4) | prova de posição sem precisão C1 · goleiro e «no lugar de» C2 · movimentos sem setor C3, C4 · layout sem o campo C5 | - |
| movimentos da regra do goleiro (2) | troca do usuário C3 · preenchimento automático C4 | - |
| formações depois da regra do goleiro (4) | C3, table-driven over all 4 | - |

- O terceiro movimento do buraco vermelho, a troca para a vaga do expulso, já grava o setor e é provado por posicao-na-substituicao (C1, C8).

## Superseded

| Old assertion | New | Why |
| --- | --- | --- |
| correcoes-validacao «IA repõe goleiro expulso» (`src/engine/live.test.ts`): `vacancy[1]` = `{ why: "red", playerId: "a0" }` | `{ why: "red", playerId: "a0", pos: "DF" }` | C4: o buraco movido grava o setor; a asserção fica mais estrita |
| parada-obrigatoria C3 «goleiro expulso: reserva entra no gol»: `vacancy[outSlot]` = `{ why: "red", playerId: <expulso> }` | `{ why: "red", playerId: <expulso>, pos: "DF" }` | C3: idem |

## Swept

- validation: existing - recusas de posicao-na-substituicao C3
- failure modes: C5 - o script falha se a temporada acabar sem a tela `liveRed`
- idempotency: n/a - cada substituição é uma decisão nova
- authorization: n/a - jogo local de um jogador só
- concurrency: existing - decisões só com o relógio parado
- data lifecycle: n/a - o `live` não é gravado (AD-019)
- dependency failure: n/a - nada externo
- state transitions: C3, C4
- observability: n/a - jogo offline sem telemetria

## Handoff

- S1 ≈ `live.ts` 30 KB + `Live.tsx` 16 KB + `live.test.ts` 36 KB + `Live.test.tsx` 32 KB ≈ 114 KB / 4 ≈ 29k; S2 ≈ `layout-check.mjs` 20 KB / 4 ≈ 5k; total ≈ 34k, abaixo do budget de 150k - one builder
- Mechanism: one builder
