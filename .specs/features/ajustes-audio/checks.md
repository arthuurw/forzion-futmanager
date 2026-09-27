# Ajustes do áudio e das telas de temporada - checks

Profile: light
Plan: `.specs/features/ajustes-audio/plan.md`

12 checks in 4 slices · 1 one-way door · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`) e, para o layout, o script do door 1 (`npm run check:layout`), cujo código de saída decide. Todo valor esperado é literal ou calculado no próprio teste, nunca pela função de produção sob teste (L-004). Tabelas cobrem o conjunto inteiro (L-005). Lições aplicadas: L-003 (fiação pela tela), L-007 (fixture com o membro que deve ser excluído), L-009 (a door tem check próprio).

## Checks

### S1 - As telas cabem no celular com os botões de som · ~5 files · ~75 KB · ~19k

**C1** - `npm run check:layout` sai com 0 e imprime, para cada uma das 11 telas (`home`, `chooseClub`, `squad`, `market`, `finance`, `live`, `round`, `cup`, `history`, `end`, `newSeason`), `scrollHeight` ≤ 700 e `scrollWidth` ≤ 400 do documento, medidos numa janela de 400 × 700 px (AC 1, door 1)
Proof: `npm run check:layout`

**C2** - Na mesma execução, em cada uma das 11 telas, o retângulo de cada botão «Música» e «Efeitos» fica inteiro dentro de 0..400 × 0..700 (AC 2)
Proof: `npm run check:layout`

**C3** - ✓ Na mesma execução, na tela inicial, o retângulo dos botões de som não cruza o do título (`.logo-big`), o do subtítulo (`.tagline`) nem o de nenhum botão de `.menu` (AC 3)
Proof: `npm run check:layout`

**C4** - ✓ `npm run check:layout:selftest` sai com 0 só se: o script, rodado com um elemento de 800 px de altura injetado na tela `squad`, sai com 1 e imprime `squad`; e, depois dessa execução e de uma execução normal, a porta do `vite preview` está livre (AC 4, door 1)
Proof: `npm run check:layout:selftest`

### S2 - «Pular para o fim» em qualquer minuto · ~2 files · ~40 KB · ~10k

**C5** - ✓ Tabela pela tela ao vivo, com uma partida do usuário que tem um `goal` do usuário no minuto 90: apertar «Pular para o fim» no minuto 1 → só `whistle-long` registrado; no minuto 89 → só `whistle-long` registrado (AC 5, L-007)
Proof: `npx vitest run src/ui/Live.test.tsx -t "pular para o fim em qualquer minuto toca só o apito final"`

**C6** - ✓ Na mesma partida, deixando o relógio correr do minuto 89 ao 90 sem pulo, o tick do minuto 90 registra `crowd-roar` e `goal-jingle` pelo gol do usuário (AC 6)
Proof: `npx vitest run src/ui/Live.test.tsx -t "tick do minuto 90 toca os eventos do minuto"`

### S3 - Pênaltis um a um · ~3 files · ~35 KB · ~9k

**C7** - ✓ Dado um `fulltime` e uma disputa de 4 cobranças que chegam no mesmo tick (usuário marca, adversário marca, usuário perde, adversário perde), o backend falso registra, com o relógio falso: `whistle-long` em 0 s; `crowd-roar` em 1,5 s; `crowd-groan` em 2,7 s; `crowd-ooh` em 3,9 s; `crowd-ooh` em 5,1 s; e nada entre esses instantes (AC 7)
Proof: `npx vitest run src/audio/sfx.test.ts -t "disputa de pênaltis cobrança por cobrança"`

**C8** - ✓ Uma disputa em que o usuário vence registra `goal-jingle` exatamente uma vez, 1,2 s depois da última cobrança; uma em que ele perde não registra `goal-jingle`; em nenhuma das duas uma cobrança registra `goal-jingle` (AC 8, AC 9)
Proof: `npx vitest run src/audio/sfx.test.ts -t "vinheta só na vitória da disputa"`

**C9** - ✓ Pela tela ao vivo, numa partida de mata-mata da copa do usuário empatada aos 90' que vai à disputa: os efeitos registrados depois do apito final são um por cobrança, na ordem das cobranças da partida (lidas no teste do evento, não recalculadas), sem `goal-jingle` entre elas (AC 7, AC 9, L-003)
Proof: `npx vitest run src/ui/Live.test.tsx -t "disputa de pênaltis soa pela tela ao vivo"`

**C10** - ✓ A tabela do audio C7 continua cobrindo os 12 tipos de evento, com as linhas de `penalty_scored` e `penalty_missed` agora pela sequência da disputa: `penalty_scored` do usuário → `crowd-roar` sem `goal-jingle`; do adversário → `crowd-groan`; `penalty_missed` → `crowd-ooh` (AC 7, AC 9)
Proof: `npx vitest run src/audio/sfx.test.ts -t "efeito de cada tipo de evento"`

### S4 - Liga e campeões nas telas de temporada · ~4 files · ~40 KB · ~10k

**C11** - ✓ Tabela das 4 ligas: na tela Nova temporada, depois de uma temporada fechada, aparecem «Série A», «Série B», «Liga Argentina» e «Liga Portuguesa», cada uma com o nome do seu campeão, que o teste lê da tabela final de cada liga. Tudo fica dentro de um elemento com a classe `fill` (AC 10, AD-010)
Proof: `npx vitest run src/ui/NewSeason.test.tsx -t "campeões das 4 ligas na nova temporada"`

**C12** - ✓ Com um usuário de um clube da Liga Portuguesa e uma temporada fechada, a linha dessa temporada na tela Histórico mostra «Liga Portuguesa» como a liga do usuário, e não «Série A» (AC 11, L-007)
Proof: `npx vitest run src/ui/History.test.tsx -t "liga do usuário de Portugal no histórico"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| telas medidas (11) | C1, table-driven sobre as 11 · C2, table-driven sobre as 11 | - |
| regras de layout (3) | rolagem C1 · botões dentro C2 · sem sobreposição C3 | - |
| minuto do pulo (2) | 1 C5 · 89 C5 | - |
| tick sem pulo (1) | minuto 90 C6 | - |
| tipos de cobrança (4) | gol do usuário C7 · gol do adversário C7 · perdido do usuário C7 · perdido do adversário C7 | - |
| resultado da disputa (2) | vitória C8 · derrota C8 | - |
| ligas na Nova temporada (4) | C11, table-driven sobre as 4 | - |
| doors (1) | door 1 C1 · C4 | - |

- Nenhum check afirma mais do que o caso que a prova exercita.

## Superseded checks of earlier features

| Check | What changes | Now proven by |
| --- | --- | --- |
| audio C7, linhas de `penalty_scored` e `penalty_missed` | `penalty_scored` do usuário perde a `goal-jingle`, e as cobranças soam na sequência da disputa; as outras 10 linhas não mudam | C10 |

Regra para os outros testes existentes: mudar um valor esperado fora da linha acima é parada e pergunta.

## Swept

- validation: n/a - nenhuma entrada nova do usuário
- failure modes: C4 - o script falha com o nome da tela e libera a porta mesmo falhando
- idempotency: n/a - nada é gravado
- authorization: n/a - jogo local de um jogador, sem conta
- concurrency: C7 - cobranças que chegam no mesmo tick viram uma sequência
- data lifecycle: n/a - nada novo guardado
- dependency failure: n/a - o script só roda em máquina de desenvolvimento com Chrome ou Edge; sem nenhum dos dois ele sai com erro, o que é falha visível, não silêncio
- state transitions: C5, C6 - pulo e tick normal
- observability: C1 - o script imprime a medida de cada tela

## Handoff

- Arquivos existentes lidos e mudados: `Live.tsx`, `Live.test.tsx`, `src/audio` (efeitos, entrada e teste de efeitos), `styles.css` (top strip e tela inicial), `App.tsx`, `AudioToggles.tsx`, `NewSeason.tsx` e teste, `History.test.tsx`, `package.json`: ~140 KB → ~35k
- Código novo (`scripts/layout-check.mjs` e o autoteste) ≈ 15 KB → ~4k
- Por fatia: S1 ≈ 19k; S2 em 29k acumulado; S3 em 38k; S4 em 48k (S2 a S4 dividem arquivos, então o total real fica perto de ~40k). Abaixo do budget de 150k: one builder
- Risco anotado: se alguma tela além do top strip já rolar a 400 × 700 px por motivo anterior ao áudio, o builder para e traz a medida; não muda o critério
