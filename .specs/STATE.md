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
| AD-009 | A liga tem 20 identidades fixas inspiradas na Série A (apelido + cidade/estado + cores), definidas em `CLUB_IDENTITIES`; a seed só embaralha ordem e força | pedido do autor por nomes fiéis à Série A, mantendo AD-008 (nenhum nome ou escudo real) | active | 2026-09-26 |
| AD-010 | Toda tela cabe na janela sem rolagem de página; em telas estreitas (≤ 900 px) um painel por vez via abas | pedido do autor; visual estilo PS2 | active | 2026-09-26 |
| AD-011 | A Série B tem 20 identidades fixas inspiradas na Série B (apelido + cidade/estado + cores), em `SERIE_B_IDENTITIES`; clubes mudam de divisão mantendo id e identidade | mesmo padrão da AD-009, sem nome ou escudo real (AD-008); plano de multiplas-temporadas | active | 2026-09-26 |
| AD-012 | O valor de mercado segue a força atual (`salaryFor(força) × 50 × fator de idade`), não o salário guardado; o salário só muda na contratação ou na renovação | com evolução por idade, um jovem que cresce precisa valer mais; plano de multiplas-temporadas (AC 21) | active | 2026-09-26 |

## Handoff

**Feature**: elenco-mercado-financas
**Where**: concluída - C1–C59 PASS (round 2 scoped, `validate_verification.py` 0). Save v3 com finanças e mercado
**In progress**: nada
**Next step**: sub-projeto 3 (múltiplas temporadas). Opcional: C7 ganhar a prova `público da rodada usa a fase antes da rodada`; mensagem de recusa na tela Elenco sem teste de tela
**Blockers**: none
**Uncommitted**: none
**Branch**: main
