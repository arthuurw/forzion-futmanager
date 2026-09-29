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
| AD-013 | Competições além da liga vivem em `GameState.cups[]` (a copa nacional é `cups[0]`, id `"cup-nat"`); a disciplina de copa fica em `Player.cupDiscipline[cupId]`, e `yellowCards`/`suspendedRounds` de topo são só da liga | a copa continental (4c) entra como mais um elemento sem save novo; plano de copa-nacional (doors 1 e 6) | active | 2026-09-26 |
| AD-014 | O calendário não é gravado: a próxima data sai de `League.currentRound` e de `CupPhase.afterLeagueRound` (`engine/calendar.nextDate`) | um ponteiro próprio duplicaria o estado e poderia divergir; plano de copa-nacional (door 4) | active | 2026-09-26 |
| AD-015 | Nome do produto é «Forzion FutManager» (marca do autor); o banco IndexedDB passa de `brasfoot` para `forzion-futmanager`, sem cópia do banco antigo. Substitui só o nome do banco na door 1 de nucleo-liga-partida (C15); store, chave e documento continuam iguais | «Brasfoot» é marca de terceiros; antes do lançamento não há save de usuário real a preservar | active | 2026-09-27 |
| AD-016 | Cada `League` tem `country` (`"BR"`, `"AR"`, `"PT"`) e `tier` (0 = primeira divisão); `leagues` continua plano, com a Série A e a Série B em 0 e 1 e os países novos depois; clube só muda de divisão dentro do país; a copa nacional é só `BR` | o 4c escolhe os classificados da copa continental por país; mantém AD-003 e a door 4 de multiplas-temporadas; plano de paises (door 1) | active | 2026-09-27 |
| AD-017 | Cada copa tem um formato fixo pelo id em `engine/cup` (nomes das fases, datas, prêmios, fase preliminar, sais das sementes); o save guarda só nomes e âncoras. A continental é `cups[1]`, id `"cup-cont"`, com sais próprios (`0xd1`, `0xc1`); save v8 | uma terceira copa entra como mais um formato sem mudar o motor; a nacional mantém as sementes; plano de copa-continental (doors 1 e 2) | active | 2026-09-28 |
| AD-018 | O arquivo exportado é o envelope `{ "format": "forzion-futmanager-save", "exportedAt", "save" }` e a importação só aceita esse envelope; o build usa `base: "./"` e publica no GitHub Pages por Actions só com test, lint e build verdes | o arquivo fica no disco do usuário para sempre; caminho relativo serve em qualquer host; plano de lancamento (doors 1, 2 e 3) | active | 2026-09-28 |

## Handoff

**Feature**: lancamento verificada (PASS round 3, 36/36, b41e1d3..e2fbd88, profile light); sub-projeto 5 completo - o roteiro de 26/09/2026 terminou
**Where**: no ar em https://arthuurw.github.io/forzion-futmanager/ (repositório público `arthuurw/forzion-futmanager`, Pages por Actions, cada push em `main` publica se test, lint e build passarem)
**In progress**: nada
**Next step**: nenhum sub-projeto planejado. Achados antigos ainda abertos: L-023 (`check:layout` sorteia a seed), L-024, L-025; observação do Verifier: o adiamento do `revokeObjectURL` não tem teste
**Blockers**: none
**Uncommitted**: nenhum
**Branch**: main
