# Parada obrigatória - checks

Profile: light
Plan: none - change under three source files (`src/engine/live.ts`, `src/store.ts`, `src/ui/Live.tsx`), no one-way door; design approved in chat on 2026-09-29

## Intent

Na partida ao vivo, quando um jogador do time do usuário se lesiona ou é expulso, o relógio continua correndo. O time joga com um a menos até o usuário pausar por conta própria, e um goleiro expulso não tem como ser trocado: a vaga do gol recusa a troca (`sent_off`) e a regra do goleiro reserva (AC 40 de correcoes-validacao) só vale para a IA.

Com esta mudança, a lesão ou a expulsão de um jogador do usuário para o jogo e mostra um aviso. A lesão e o goleiro expulso **obrigam** a troca enquanto houver substituição e reserva que sirva: «Continuar» fica bloqueado. Na expulsão de jogador de linha, o usuário mexe no time ou toca «Seguir com N». Para trocar o goleiro expulso, basta tirar um jogador de linha e colocar o goleiro reserva, que vai para o gol. «Pular para o fim» e a reabertura com `pendingLive` preenchem as vagas do usuário pela regra da IA (AD-022, que amplia AD-019).

11 checks in 3 slices · 0 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`). Telas usam `@testing-library/react` em jsdom.

Regras dos testes:
- Todo valor esperado é literal ou calculado no próprio teste, nunca pela função de produção sob teste (L-004).
- Toda tabela cobre o conjunto inteiro (L-005).
- Fixtures de lesão e expulsão são montadas à mão na `LiveRound` (vaga, `vacancy`, evento do minuto), como o teste «mensagem expulso» já faz, ou achadas por busca determinística de seed.

Lições aplicadas:
- L-003: a parada e o bloqueio são provados pela store (`tick`, `resume`), não só pelas funções do motor.
- L-005: `forcedVacancy` é provado por tabela sobre todos os casos.
- L-007: cada fixture de «obrigatório» tem o caso excluído ao lado (sem substituição, banco vazio, sem goleiro reserva, jogador de linha expulso).
- L-008: cada aviso de tela é afirmado com o texto exato na tela.

## Checks

### S1 - Motor · 2 files · 55 KB · ~14k

**C1** - ✓ `userStops(live)` devolve os eventos `injury` e `red` do time do usuário no minuto `live.minute`, na ordem da narração. Não devolve eventos de outros clubes, eventos de minutos anteriores nem `yellow`. Com `userClubId` nulo, devolve `[]`.
Proof: `npx vitest run src/engine/live.test.ts -t "parada só do usuário no minuto"`

**C2** - ✓ `forcedVacancy(live)` devolve a vaga que obriga a troca, ou `null`. Tabela com todos os casos:
- lesão, com substituição e banco não vazio → `{ slot, why: "injury" }`;
- lesão, com `subsUsed = 5` → `null`;
- lesão, com banco vazio → `null`;
- goleiro expulso, com goleiro no banco e substituição → `{ slot: <vaga do GK>, why: "red" }`;
- goleiro expulso, sem goleiro no banco → `null`;
- goleiro expulso, com `subsUsed = 5` → `null`;
- jogador de linha expulso → `null`;
- sem vaga → `null`.
Proof: `npx vitest run src/engine/live.test.ts -t "troca obrigatória: tabela"`

**C3** - ✓ Com a vaga do GK vazia por expulsão, `substitute(live, clubId, slotDeLinha, goleiroReserva)` faz o seguinte:
- põe o goleiro reserva na vaga do GK;
- o jogador de linha de `slotDeLinha` sai (entra em `subbedOff`);
- a vaga passa a ser `slotDeLinha`, com `{ why: "red", playerId: <goleiro expulso> }`;
- `subsUsed` sobe 1;
- a narração ganha `substitution` com `playerId` do jogador de linha e `playerInId` do goleiro reserva.
Um reserva que não é goleiro na mesma situação faz a troca comum, no próprio `slotDeLinha`, e a vaga do GK continua vazia.
Proof: `npx vitest run src/engine/live.test.ts -t "goleiro expulso: reserva entra no gol"`

**C4** - ✓ `runToEnd(live, { fillUserVacancies: true })` preenche as vagas do usuário pela regra da IA:
- lesão: o melhor reserva da mesma posição, ou qualquer reserva se não houver;
- goleiro expulso: goleiro reserva no gol e o pior jogador de linha sai.
No fim, o lado do usuário não tem vaga por lesão enquanto `subsUsed < 5` e houver reserva. `runToEnd(live)` sem a opção continua igual a `step` até o 90.
Proof: `npx vitest run src/engine/live.test.ts -t "pular preenche as vagas do usuário"`
Proof: `npx vitest run src/engine/live.test.ts -t "playRound equivale a rodada ao vivo sem decisões"`

### S2 - Store · 2 files · 60 KB · ~15k

**C5** - `tick()` que produz lesão ou expulsão do usuário num minuto de 1 a 89 deixa `clock = "paused"` e `liveStop` com esses eventos. No minuto 45, o relógio fica `"halftime"` e `liveStop` também é preenchido. Uma lesão do adversário no mesmo tipo de fixture deixa `clock = "running"` e `liveStop = null`.
Proof: `npx vitest run src/store.test.ts -t "lesão do usuário para o relógio"`

**C6** - Com `forcedVacancy` não nulo, `resume()` mantém `clock = "paused"`. Depois de `substitute` na vaga, `resume()` deixa `clock = "running"` e `liveStop = null`. Com só um jogador de linha expulso, `resume()` retoma de primeira.
Proof: `npx vitest run src/store.test.ts -t "continuar bloqueado até a troca"`

**C7** - `skipToEnd()` com uma vaga por lesão do usuário e reserva no banco fecha a data com o lado do usuário sem vaga por lesão aos 90. A reabertura com `pendingLive` fecha a data como `runToEnd(startRound(save), { fillUserVacancies: true })`.
Proof: `npx vitest run src/store.test.ts -t "pular para o fim preenche a lesão"`
Proof: `npx vitest run src/store.test.ts -t "reload no ao vivo fecha a rodada"`

### S3 - Tela · 2 files · 43 KB · ~11k

**C8** - Na parada, a tela mostra o aviso (`role="status"`, nome «Parada»), uma linha por evento, com o texto exato:
- lesão com troca obrigatória: «Lesão: {nome} saiu. Faça a substituição.»;
- lesão sem troca possível: «Lesão: {nome} saiu.»;
- goleiro expulso com troca obrigatória: «Goleiro expulso: {nome}. Coloque o goleiro reserva.»;
- jogador de linha expulso: «{nome} expulso.».
Proof: `npx vitest run src/ui/Live.test.tsx -t "aviso da parada"`

**C9** - Com a troca obrigatória, o botão «Continuar» fica desabilitado, e o seletor «Sai» vem com a vaga da lesão selecionada. Depois de «Substituir», «Continuar» fica habilitado e o aviso some ao retomar.
Proof: `npx vitest run src/ui/Live.test.tsx -t "continuar desabilitado até substituir"`

**C10** - Parado por expulsão de jogador de linha, sem troca obrigatória, o botão lê «Seguir com 10» (os jogadores em campo; «Seguir com 9» com dois expulsos), e tocá-lo retoma o relógio.
Proof: `npx vitest run src/ui/Live.test.tsx -t "seguir com 10"`

**C11** - Na parada, a aba «Seu time» fica selecionada (`aria-selected="true"`), então as decisões aparecem no celular sem tocar na aba.
Proof: `npx vitest run src/ui/Live.test.tsx -t "parada abre seu time"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| eventos que param (2) | `injury` C1 · `red` C1 | - |
| eventos que não param (3) | `yellow` C1 · outro clube C1 · minuto anterior C1 | - |
| `forcedVacancy` casos (8) | C2, table-driven over all 8 | - |
| relógio após a parada (3) | minuto 1-89 `paused` C5 · minuto 45 `halftime` C5 · adversário `running` C5 | - |
| caminhos sem decisão (2) | «Pular para o fim» C7 · reabertura `pendingLive` C7 | - |
| avisos (4) | lesão obrigatória C8 · lesão sem troca C8 · goleiro obrigatório C8 · linha expulso C8 | - |
| rótulo do botão (3) | «Continuar» desabilitado C9 · «Continuar» habilitado C9 · «Seguir com N» C10 | - |

- Nenhum check afirma mais do que o caso que a prova exercita.

## Swept

- validation: C3 - troca do goleiro só com reserva goleiro; outro reserva faz a troca comum
- failure modes: C2 - sem substituição, banco vazio ou sem goleiro reserva, o jogo não trava
- idempotency: n/a - a parada é por minuto; um mesmo minuto não é jogado duas vezes
- authorization: n/a - jogo local sem conta
- concurrency: n/a - o relógio é um só `setInterval`, e `resume`/`tick` já ignoram chamadas fora do estado certo
- data lifecycle: n/a - o save não muda; `liveStop` fica só em memória
- dependency failure: n/a - sem dependência externa
- state transitions: C5, C6, C10
- observability: C8 - o aviso na tela é o sinal para o usuário

## Out of scope

- Parar em lance do adversário - o usuário pediu a parada para o próprio time.
- Treino e evolução - próxima feature, com a intensidade Leve/Normal/Forte já escolhida.

## Handoff

- S1 = 14k, S2 entra na store com 29k, S3 entra na tela com 40k no total, abaixo do budget de 150k - one builder
