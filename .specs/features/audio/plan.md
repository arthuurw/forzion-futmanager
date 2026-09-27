# Música e efeitos sonoros

## Problem

O jogo é mudo. Não há música em nenhuma tela, e a partida ao vivo não tem apito, torcida nem som de gol. O gol só aparece como um placar piscando por 2 s. Os managers dos anos 90 que o jogo imita tinham trilha e efeitos no estilo de 16 bits, e o autor quer essa nostalgia.

O risco que o autor apontou vem junto: som de jogo antigo cansa rápido quando toca sem parar ou sempre igual. Numa temporada o usuário passa pelas telas de gestão dezenas de vezes e joga 38 rodadas mais a copa.

Evidência: pedido do autor em 27/09/2026, «algo nostalgico, mas que nao fique forçado e repetitivo». Decisões do autor na mesma data: efeitos gerados no navegador e músicas em arquivo; música nas telas de gestão, e na partida só efeitos. Não há métrica de uso.

Quando isto for entregue:
- as telas de abertura, de gestão e de fim de temporada têm música que muda de faixa, respeita silêncios entre as faixas e continua tocando quando o usuário troca de tela;
- a partida do usuário tem apito, torcida e som de gol, com variação a cada vez;
- o usuário liga e desliga a música e os efeitos, e a escolha fica gravada no navegador.

## Flow

Reutiliza a `phase` da store para escolher a música e os `events` da partida do usuário, que a tela ao vivo já lê para a narração. O motor não muda, e nenhum evento novo é criado.

1. qualquer clique ou tecla → `src/audio` (door 2) - cria o `AudioContext` no primeiro gesto e lê as preferências (door 1)
2. `App` (exists) - repassa a `phase` a `src/audio`, que a traduz num contexto de música (abertura, gestão, fim de temporada ou nenhum) e troca de faixa só quando o contexto muda
3. `src/audio` (door 2) - baixa a faixa do contexto de `public/audio/music/` (door 3) na primeira vez que o contexto toca e alterna entre faixa e silêncio
4. tela `Live` (exists) - a cada minuto, repassa a `src/audio` os eventos novos da partida do usuário e o estado do relógio; `src/audio` sintetiza o efeito de cada evento e o som ambiente da torcida
5. top strip e tela inicial (exist) - os botões «Música» e «Efeitos» gravam as preferências (door 1) e ligam ou desligam o áudio na hora

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: contexto de música - abertura, gestão, fim de temporada ou nenhum; vive em `src/audio` e é derivado da `phase` |
| domain | existing term: evento da partida (`MatchEvent`) - hoje só a narração o lê; passa a ser lido também pelo áudio na tela `Live`. O motor e o save continuam iguais |
| domain | existing criterion: AD-002 e `AGENTS.md` («nenhum `Math.random` fora do `Rng` injetado»). A variação dos efeitos e a ordem das faixas usam um `Rng` do motor (`createRng`), semeado com a hora. Esse `Rng` é só do áudio e nunca toca o `rngState` do jogo |
| domain | existing criterion: os testes de tela rodam em jsdom, que não tem `AudioContext`. O áudio tem de ser silencioso quando não há `AudioContext`, para nenhum teste existente mudar |
| stored data | nothing to migrate: o save não muda. As preferências são uma chave nova no `localStorage` (door 1) |

## Relations

None - no stored-data shape change in the save.

## Surface

None - nothing consumed outside. É um SPA estático sem API (AD-001).

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. preferências de áudio | chave `localStorage` `"forzion-futmanager:audio"` com o valor `{"music":true,"sfx":true}`. Valor ausente ou inválido vale os dois ligados | dentro do save (AD-003): exigiria o schema v8 com o v7 do paises em build, mudaria a cada jogo salvo, e a tela inicial toca antes de haver save; um store novo no IndexedDB: subiria `DB_VERSION` por dois booleanos |
| 2. módulo de áudio sem dependência | `src/audio/` com Web Audio API nativa, fora de `src/engine/` (AD-002). Toda chamada ao navegador passa por uma interface `AudioBackend` injetável; o backend padrão é mudo quando `window.AudioContext` não existe | Howler.js ou Tone.js: dependência e bundle a mais para o que cabe em algumas centenas de linhas sobre a API nativa; `HTMLAudioElement` para os efeitos: sem fade preciso nem síntese, e o iOS limita os elementos tocando ao mesmo tempo |
| 3. arquivos de música | MP3 estéreo de 128 kbps em `public/audio/music/<id>.mp3`, com 5 ids fixos no código: `abertura`, `gestao-1`, `gestao-2`, `gestao-3`, `fim-de-temporada` | Ogg Vorbis: o Safari não o toca de forma confiável em todas as versões ainda em uso, e o MP3 toca em todo navegador; tracker (SPC, IT) com um player próprio: um formato a mais para manter, e o som de 16 bits pode ser gravado no próprio MP3 |

- Nothing else in this change is hard to reverse. Quais sons, volumes, tempos de silêncio e o mapa de telas para contextos mudam com uma constante.

## Criteria

### S1: O usuário controla o som (P1)

O usuário liga e desliga a música e os efeitos, e o jogo nunca toca som antes de ele interagir.

**Acceptance Criteria**

1. The tela inicial e o top strip de toda outra tela SHALL mostrar dois botões, «Música» e «Efeitos», cada um com `aria-pressed` igual ao seu estado ligado ou desligado
2. WHEN o usuário aperta «Música» ou «Efeitos» THEN o sistema SHALL gravar os dois estados na chave `forzion-futmanager:audio` e SHALL aplicar a mudança no mesmo clique: a música desligada some em até 1 s, e nenhum efeito novo toca com os efeitos desligados
3. WHEN o jogo abre e a chave não existe THEN o sistema SHALL tratar música e efeitos como ligados
4. IF o `localStorage` não está disponível ou a chave tem um valor inválido THEN o sistema SHALL tratar os dois como ligados, e o jogo SHALL funcionar normalmente, sem mensagem de erro
5. The sistema SHALL não emitir som antes do primeiro clique ou tecla na página; WHEN esse gesto acontece THEN a música do contexto atual SHALL começar
6. WHILE a aba do jogo está escondida o sistema SHALL suspender todo o áudio, e WHEN ela volta a ficar visível THEN SHALL retomar do ponto onde parou

**Independent test:** abrir o jogo, clicar em «Novo jogo»: a música de abertura começa; desligar «Música», recarregar a página: o botão continua desligado e nada toca.

### S2: A partida do usuário tem som (P1)

A partida do usuário tem apito, torcida e som de gol, sem se repetir igual e sem virar barulho na velocidade 4×.

**Acceptance Criteria**

7. WHEN um evento da partida do usuário aparece na tela ao vivo THEN o sistema SHALL tocar o efeito do tipo do evento: `kickoff` → apito curto; `halftime` → apito duplo; `fulltime` → apito triplo longo; `goal` ou `penalty_scored` do clube do usuário → explosão da torcida e vinheta de gol; `goal` ou `penalty_scored` do adversário → lamento da torcida; `shot_saved`, `shot_missed` e `penalty_missed` → «uuh» da torcida; `yellow` → apito curto; `red` → apito e vaia; `injury` e `substitution` → nenhum som
8. The eventos das outras partidas da rodada SHALL não tocar som
9. WHILE o relógio da partida está `running` o sistema SHALL tocar o som ambiente da torcida; WHILE está `halftime` SHALL tocá-lo a 40% do volume; WHILE está `paused` SHALL silenciá-lo; WHEN a partida chega ao fim THEN SHALL encerrá-lo com fade de 2 s
10. The explosão da torcida, o lamento e o «uuh» SHALL ter pelo menos 2 variantes cada, e cada efeito tocado SHALL sortear a variante e um fator de afinação entre 0,94 e 1,06 com o `Rng` do áudio
11. IF um efeito do mesmo tipo tocou há menos de 400 ms THEN o sistema SHALL não tocar o novo
12. WHEN o usuário aperta «Pular para o fim» THEN o sistema SHALL tocar só o apito final, e nenhum efeito dos minutos pulados
13. WHEN a tela ao vivo abre THEN a música SHALL sumir com fade de 1 s, e não SHALL haver música durante a partida

**Independent test:** jogar uma rodada em 1×: apito no início, «uuh» nas finalizações, explosão e vinheta no gol do usuário, apito duplo no intervalo e triplo no fim; em 4× os «uuh» não se amontoam.

### S3: A música acompanha as telas sem cansar (P1)

As telas de abertura, gestão e fim de temporada têm música que alterna faixas e silêncio e não recomeça a cada troca de tela.

**Acceptance Criteria**

14. The sistema SHALL mapear as telas em contextos: `home` e `chooseClub` → abertura (`abertura`); `squad`, `market`, `finance`, `round`, `history` e `cup` → gestão (`gestao-1`, `gestao-2`, `gestao-3`); `end` e `newSeason` → fim de temporada (`fim-de-temporada`); `loading` e `live` → nenhum
15. WHEN a tela muda para outra do mesmo contexto THEN a faixa que está tocando SHALL continuar, sem recomeçar
16. WHEN o contexto muda THEN a faixa atual SHALL sumir com fade de 1 s, e a primeira faixa do novo contexto SHALL começar depois do fade
17. WHEN uma faixa termina THEN o sistema SHALL esperar um silêncio sorteado entre 30 e 90 s antes da próxima faixa do mesmo contexto
18. WHEN o sistema escolhe a próxima faixa de um contexto com 2 ou mais faixas THEN SHALL escolher uma diferente da última tocada nesse contexto
19. The volume da música SHALL ser metade do volume dos efeitos
20. The sistema SHALL baixar a faixa de um contexto só quando ele toca pela primeira vez, e nenhuma faixa SHALL ser baixada antes do primeiro gesto do usuário
21. IF uma faixa não carrega ou não decodifica THEN o sistema SHALL tratá-la como terminada (silêncio e próxima faixa, pelo AC 17), sem mensagem de erro e sem afetar o jogo

**Independent test:** na tela Elenco, a faixa de gestão toca; ir ao Mercado e voltar: a faixa não recomeça; ao terminar, vem silêncio e depois outra faixa de gestão.

## Out of scope

| Excluded | Why |
| --- | --- |
| som em clique de botão comum | é o som que mais se repete; o autor pediu que não fique forçado |
| som das outras partidas da rodada | o placar já pisca; dez partidas com som viram barulho |
| controle de volume por deslizador | liga e desliga cobre o pedido; o volume do sistema já regula o resto |
| música durante a partida | decisão do autor em 27/09/2026 |
| narração falada | não foi pedida; exige vozes gravadas |
| compor ou licenciar as faixas | é trabalho do autor, não do build; ver a pergunta aberta 1 |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| origem do som | efeitos sintetizados na Web Audio API com timbre de 16 bits e eco curto; música em arquivo | escolha do autor em 27/09/2026 | y |
| onde toca música | abertura, gestão e fim de temporada; na partida só efeitos | escolha do autor em 27/09/2026 | y |
| estado inicial | música e efeitos ligados | é o padrão dos jogos; o botão fica sempre visível no top strip | n |
| quantidade de faixas | 5: 1 de abertura, 3 de gestão, 1 de fim de temporada | a gestão é onde o usuário passa mais tempo; 3 faixas e o silêncio do AC 17 bastam para não cansar | n |
| silêncio entre faixas | de 30 a 90 s, sorteado | o silêncio é o que tira o «forçado»; é a mesma técnica de jogos que tocam por horas | n |
| aba escondida | suspende todo o áudio | ninguém quer música de uma aba esquecida | n |
| variação dos efeitos | `Rng` do motor semeado com `Date.now()`, só para o áudio | cumpre a regra do `Math.random` sem tocar o `rngState` do jogo | n |

**Open questions:**

| # | Kind | Question | Until answered |
| --- | --- | --- | --- |
| 1 | blocks go-live | quem fornece as 5 faixas: o autor compõe (num tracker, com instrumentos no estilo do Super Nintendo) ou elas vêm de bancos com licença CC0? | o build entrega o sistema com as 5 vagas; sem os arquivos, o AC 21 deixa as telas em silêncio e só os efeitos tocam. Os testes usam arquivos falsos |

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| top strip e tela inicial, botões «Música» e «Efeitos» | ordem e densidade | AC 1 - dois botões, «Música» antes de «Efeitos» |
| top strip e tela inicial | empty state | AC 3 - sem preferência gravada, os dois ligados |
| top strip e tela inicial | error state | AC 4 - `localStorage` indisponível ou inválido |
| top strip e tela inicial | loading state | n/a - as preferências são lidas de forma síncrona no carregamento |
| top strip e tela inicial | unauthorised state | n/a - jogo local de um jogador, sem conta |
| top strip e tela inicial | destructive action confirms | n/a - desligar o som se desfaz com um clique |
| música de cada contexto | loading state | AC 20, AC 21 - enquanto a faixa baixa, silêncio; falha vira silêncio |
| tela ao vivo, efeitos | density | AC 11, AC 12 - limite de 400 ms e «Pular para o fim» |
| tela ao vivo, efeitos | error state | AC 4 do backend mudo (door 2) - sem `AudioContext`, nenhum som e nenhum erro |

## Sources

- pedido do autor em 27/09/2026 - música e sons no estilo dos videogames antigos, sem ficar forçado nem repetitivo
- respostas do autor em 27/09/2026 - efeitos sintetizados e música em arquivo; música nos menus e partida só com efeitos
