# Project state

## Decisions

| ID | Decision | Rationale | Status | Date |
| --- | --- | --- | --- | --- |
| AD-001 | Stack: TypeScript + React + Vite, SPA estático sem backend | maior ecossistema web; deploy estático grátis; dev solo | active | 2026-09-26 |
| AD-002 | Motor de jogo em `src/engine/**`, TypeScript puro sem DOM/React, determinístico via `Rng` injetado e semeado; nenhum `Math.random` fora dele | bugs reproduzíveis, testes de balanceamento determinísticos, porta pra mobile/nuvem sem reescrever | active | 2026-09-26 |
| AD-003 | Save = um único documento JSON versionado (`schemaVersion` inteiro) em IndexedDB; migrações só pra frente; `leagues` é array desde a v1 | localStorage tem ~5 MB; várias ligas (sub-projeto 4) e nuvem (sub-projeto 5) precisam de formato estável | active | 2026-09-26 |
| AD-004 | Identificadores de código e chaves do save em inglês; texto de UI em PT-BR | evita acento em identificador e save bilíngue; UI é o produto e é brasileiro | active | 2026-09-26 |
| AD-005 | Jogador tem um único `rating` inteiro (40–95) e `position` em {GK, DF, MF, FW} | fidelidade ao Brasfoot (um número de força); balanceamento 5× mais barato que multi-atributo | active | 2026-09-26 |
| AD-006 | Dinheiro em inteiro de reais, nunca float | default proposto no brainstorm, sem objeção; entra em uso no sub-projeto 2 | active | 2026-09-26 |
| AD-007 | Simulação de partida por eventos minuto a minuto (90 ticks): posse por meio-campo, chance por ataque vs defesa, gol por finalização vs goleiro; cada evento vira linha de narração | fiel ao Brasfoot; substituição e cartão entram sem mudar o modelo | active | 2026-09-26 |
| AD-008 | Times e jogadores fictícios, gerados por seed; nenhum nome real | lançar publicamente sem risco de licença (CBF, clubes, FIFPro) | active | 2026-09-26 |

## Handoff

**Feature**: nucleo-liga-partida
**Where**: plan.md escrito, aguardando revisão humana - checks.md não existe
**In progress**: nada
**Next step**: usuário revisa `.specs/features/nucleo-liga-partida/plan.md`; depois derivar checks.md
**Blockers**: none
**Uncommitted**: none
**Branch**: main
