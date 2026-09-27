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

## Handoff

**Feature**: paises (4b) verificada (PASS, 889aa71..f29bd26, 34 checks); audio em build
**Where**: ajustes-4a e paises verificadas; AD-016 ativa. audio: plano e checks aprovados (C1–C26, ~45k)
**In progress**: build de audio com um builder
**Next step**: Verifier de audio. Pendências: as 5 faixas de música (pergunta aberta 1 do plano de audio, bloqueia o lançamento); o AC 22 do paises não tem check para a liga do usuário no Histórico nem campeões na Nova temporada (observação do Verifier)
**Blockers**: none
**Uncommitted**: none
**Branch**: main
