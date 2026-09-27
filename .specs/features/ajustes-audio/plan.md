# Ajustes do áudio e das telas de temporada

## Problem

Os Verifiers de audio e de paises deixaram quatro pendências registradas no `STATE.md` (27/09/2026). O autor pediu para corrigir todas.

1. **Botões de som no celular.** Numa janela de até 900 px, os botões «Música» e «Efeitos» descem para uma segunda linha do top strip. A área do jogo perde ~26 px de altura. Nenhum teste prova que as telas ainda cabem sem rolagem de página (AD-010). Na tela inicial, os botões ficam fixos no canto superior direito e podem cobrir o título. Hoje o AD-010 só é provado pela classe `fill`, em jsdom, que não calcula layout.
2. **«Pular para o fim» no minuto 89.** A tela ao vivo só reconhece o pulo quando o minuto avança mais de 1. Apertado aos 89', o pulo avança 1 minuto e toca os efeitos do minuto 90 junto com o apito final (audio AC 12).
3. **Pênaltis todos juntos.** Todas as cobranças de uma disputa chegam num mesmo tick, com o apito final. Os efeitos soam empilhados, e só o limite de 400 ms corta alguns. Pela regra do audio AC 7, cada gol do usuário na disputa ainda toca a vinheta de gol.
4. **Liga e campeões nas telas de temporada.** O paises AC 22 diz que as telas Histórico, Fim e Nova temporada mostram a liga do usuário e os campeões das 4 ligas. A Nova temporada não mostra campeões. O Histórico não tem teste para a liga de um usuário de Portugal.

Evidência: `.specs/features/audio/verification.md` (notas 1 e 2 e follow-up do builder), `.specs/features/paises/verification.md` (observação sobre o C22), handoff do `STATE.md` de 27/09/2026. Não há métrica de uso.

Quando isto for entregue:
- toda tela cabe numa janela de celular de 400 × 700 px sem rolagem, com os botões de som visíveis, e isso tem uma prova num navegador de verdade;
- «Pular para o fim» toca só o apito final em qualquer minuto;
- uma disputa de pênaltis soa cobrança por cobrança;
- a Nova temporada mostra os campeões das 4 ligas.

## Flow

Reutiliza a tela `Live` e o módulo `src/audio`, que já recebem os eventos da partida do usuário. O mapa de efeitos do audio C7 continua valendo fora da disputa. A tabela de campeões da tela Histórico serve de modelo para a Nova temporada.

1. `npm run check:layout` → `scripts/layout-check.mjs` (door 1) - faz o build, sobe `vite preview` por `node`, abre o Chrome instalado sem janela pelo DevTools Protocol, percorre as telas a 400 × 700 px clicando na interface de um jogo novo (cada partida da temporada pulada com «Pular para o fim» até o Fim e a Nova temporada) e mede a rolagem e as sobreposições; sai com 1 se alguma tela rola
2. top strip e tela inicial (exist) - os botões de som cabem na mesma linha do top strip no celular e ficam fora do título na tela inicial
3. «Pular para o fim» → store `skipToEnd` (exists) → tela `Live` (exists) - a tela sabe que o pulo aconteceu por um sinal explícito (`skipped` no store, ligado por `skipToEnd` na mesma mudança que leva a partida ao 90), não pelo tamanho do avanço do minuto, e só repassa `fulltime` a `src/audio`
4. tela `Live` (exists) → `src/audio` (exists) - eventos de disputa de pênaltis viram uma sequência agendada: apito final, depois uma cobrança por vez
5. tela `NewSeason` (exists) - lê o registro da temporada fechada, que a tela Histórico já lê, e mostra os campeões das 4 ligas

## Impact

| Front | What changes |
| --- | --- |
| domain | existing criterion: audio AC 7 para `penalty_scored` do usuário («explosão da torcida e vinheta de gol») passa a valer «explosão da torcida» por cobrança, e a vinheta toca uma vez só, quando o usuário vence a disputa. `penalty_scored` e `penalty_missed` só existem em disputa (`PENALTY_EVENT_TYPES`), então o gol de jogo não muda. O teste de audio C7 muda nas linhas de pênalti |
| domain | existing criterion: audio AC 12 passa a valer em qualquer minuto, incluindo o 89 |
| domain | existing criterion: AD-010 ganha uma prova de navegador (door 1) além da classe `fill` |
| domain | existing criterion: audio AC 1 - os botões continuam com os nomes acessíveis «Música» e «Efeitos», então o audio C1 e o C2 não mudam |
| stored data | nothing to migrate: nada do save muda |

## Relations

None - no stored-data shape change.

## Surface

None - nothing consumed outside. É um SPA estático sem API (AD-001).

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. prova de layout em navegador | `scripts/layout-check.mjs`, rodado por `npm run check:layout`. Node 24 (WebSocket nativo) fala o Chrome DevTools Protocol com o Chrome ou o Edge instalado (`CHROME_PATH` ou o caminho padrão do Windows), sem dependência nova. Sobe `vite preview` por `node node_modules/vite/bin/vite.js` numa porta fixa e confere que a porta fica livre no fim. Sai com 0 só se toda tela medida cabe | Playwright ou Puppeteer como devDependency: baixa um navegador de ~150 MB e soma uma dependência para um script; medir em jsdom: não calcula layout, e é por isso que o AD-010 nunca teve prova de rolagem |

- Nothing else in this change is hard to reverse. O arranjo dos botões, os tempos da sequência de pênaltis e a tabela da Nova temporada mudam com CSS ou com uma constante.

## Criteria

### S1: As telas cabem no celular com os botões de som (P1)

**Acceptance Criteria**

1. WHILE a janela tem 400 × 700 px, cada uma das telas `home`, `chooseClub`, `squad`, `market`, `finance`, `live`, `round`, `cup`, `history`, `end` e `newSeason` SHALL ter a altura e a largura de rolagem do documento no máximo iguais às da janela
2. WHILE a janela tem 400 × 700 px, os botões «Música» e «Efeitos» SHALL estar inteiros dentro da janela em toda tela da lista do AC 1
3. WHILE a janela tem 400 × 700 px, na tela inicial os botões de som SHALL não se sobrepor ao título, ao subtítulo nem a nenhum botão do menu
4. The script de layout SHALL sair com código 1 e o nome da tela quando alguma tela quebra o AC 1, 2 ou 3, e SHALL deixar a porta do `vite preview` livre ao terminar, com sucesso ou falha

**Independent test:** `npm run check:layout` passa; com um elemento de 800 px de altura injetado numa tela, falha com o nome dela.

### S2: «Pular para o fim» em qualquer minuto (P1)

**Acceptance Criteria**

5. WHEN o usuário aperta «Pular para o fim» em qualquer minuto de 1 a 89 THEN o sistema SHALL tocar só `whistle-long`
6. WHILE a partida corre sem pulo, o tick do minuto 90 SHALL tocar os efeitos de todos os eventos novos desse minuto, como o audio AC 7

**Independent test:** pular aos 89' com um gol do usuário no minuto 90: só o apito final soa.

### S3: Pênaltis um a um (P2)

**Acceptance Criteria**

7. WHEN a partida do usuário termina em disputa de pênaltis THEN o sistema SHALL tocar `whistle-long` e, a partir de 1,5 s depois dele, um efeito por cobrança, na ordem das cobranças, com 1,2 s entre elas: gol do usuário → `crowd-roar`; gol do adversário → `crowd-groan`; `penalty_missed` de qualquer lado → `crowd-ooh`
8. WHEN o usuário vence a disputa THEN o sistema SHALL tocar `goal-jingle` uma vez, 1,2 s depois da última cobrança; WHEN perde THEN nenhum efeito a mais
9. The cobranças da disputa SHALL não tocar `goal-jingle`

**Independent test:** uma disputa de 5 × 4 soa cobrança por cobrança e termina com a vinheta quando o usuário vence.

### S4: Liga e campeões nas telas de temporada (P2)

**Acceptance Criteria**

10. WHEN a tela Nova temporada abre THEN ela SHALL mostrar o campeão de cada uma das 4 ligas da temporada que fechou, com o nome da liga, dentro de um elemento com a classe `fill` (AD-010)
11. The tela Histórico SHALL mostrar «Liga Portuguesa» como a liga do usuário numa temporada fechada em que ele treinava um clube de Portugal

**Independent test:** fechar uma temporada com um clube português: a Nova temporada lista os 4 campeões, e o Histórico mostra «Liga Portuguesa» na linha dela.

## Out of scope

| Excluded | Why |
| --- | --- |
| baixar a faixa quando o primeiro gesto é o clique que desliga a música | permitido pelo audio AC 20; é um download a mais, sem som |
| cobrir outras larguras além de 400 px | o commit 77a3c43 já usou 400 px como a janela de celular; o script aceita outras medidas depois |
| mostrar a disputa de pênaltis cobrança por cobrança na tela | não foi pedido; só o som vira sequência |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| quem decide | o autor pediu «pode commitar as músicas e corrigir as pendências» (27/09/2026) e prefere as recomendações sem rodada de perguntas | user delegated | y |
| altura da janela | 700 px | celular comum em pé, descontada a barra do navegador | n |
| tempos da disputa | 1,5 s depois do apito e 1,2 s entre cobranças | dá tempo de cada reação da torcida terminar (0,7 a 3,5 s) sem arrastar uma disputa de 10 cobranças além de ~14 s | n |
| sequência depois que a tela muda | as cobranças agendadas continuam tocando se a tela de resultados abrir antes do fim | a disputa é o fim da partida; cortar no meio soaria como erro | n |
| a vinheta só na vitória | uma vez, no fim | cinco vinhetas numa disputa é o «forçado» que o autor pediu para evitar | n |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| top strip no celular | densidade e ordem | AC 1, AC 2 - uma linha, sem rolagem |
| tela inicial no celular | sobreposição | AC 3 |
| tela Nova temporada | empty state | n/a - a tela só abre depois de uma temporada fechada, que sempre tem 4 campeões |
| tela Nova temporada, Histórico | loading, error, unauthorised | n/a - leem o estado já carregado; jogo local sem conta |
| script de layout | saída e código de saída | AC 4 |
| script de layout | falha no meio | AC 4 - porta livre mesmo com falha |

## Sources

- `.specs/STATE.md`, handoff de 27/09/2026 - as quatro pendências
- `.specs/features/audio/verification.md` - notas 1 e 2 e o follow-up dos pênaltis
- `.specs/features/paises/verification.md` - observação sobre o C22
