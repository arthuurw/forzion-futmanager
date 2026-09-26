# Núcleo: liga + partida - checks

Profile: light
Plan: `.specs/features/nucleo-liga-partida/plan.md`

## Intent

40 checks in 3 slices · 7 one-way doors · 0 open

Comandos reais: o repositório ainda não tem manifesto. O runner será Vitest (AD-001, Vite), invocado como `npx vitest run <arquivo> -t "<nome do teste>"`. Telas testadas com `@testing-library/react` em `jsdom`; IndexedDB em teste via `fake-indexeddb`. Tudo isso é dependência de desenvolvimento, fora da porta 5 (runtime).

## Checks

### S1 - Novo jogo até o elenco · ~16 files · ~45 KB · ~11k

**C1** - Uma liga gerada tem exatamente 20 clubes, cada um com 22 jogadores: 3 GK, 7 DF, 7 MF, 5 FW (AC 1)
Proof: `npx vitest run src/engine/generate.test.ts -t "20 clubes com 22 jogadores 3-7-7-5"`

**C2** - Todo jogador gerado tem `rating` inteiro em [40, 95] e `age` inteiro em [17, 36] (AC 2, door 4)
Proof: `npx vitest run src/engine/generate.test.ts -t "rating e age dentro dos limites"`

**C3** - A média de `rating` dos 11 melhores varia pelo menos 15 pontos entre o clube mais forte e o mais fraco (AC 3)
Proof: `npx vitest run src/engine/generate.test.ts -t "diferença de força entre clubes"`

**C4** - Nomes de clube e nomes de jogador são únicos dentro do save (AC 4)
Proof: `npx vitest run src/engine/generate.test.ts -t "nomes únicos"`

**C5** - O calendário tem 38 rodadas de 10 partidas; cada par de clubes se enfrenta duas vezes, uma em cada mando; cada clube joga uma partida por rodada (AC 5)
Proof: `npx vitest run src/engine/generate.test.ts -t "calendário turno e returno"`

**C6** - Duas gerações com a mesma `seed` produzem ligas deep-equal (AC 6)
Proof: `npx vitest run src/engine/generate.test.ts -t "mesma seed gera liga idêntica"`

**C7** - A tela «Escolher clube» lista os 20 clubes em ordem alfabética, cada um com a média dos 11 melhores (AC 7)
Proof: `npx vitest run src/ui/ChooseClub.test.tsx -t "lista 20 clubes em ordem alfabética com força"`

**C8** - Ao selecionar um clube, o save está gravado em IndexedDB com `userClubId` antes da tela «Elenco» aparecer (AC 8)
Proof: `npx vitest run src/app.test.tsx -t "seleção do clube grava save antes do elenco"`

**C9** - A tela «Elenco» lista os 22 jogadores ordenados por posição GK, DF, MF, FW e, dentro da posição, por `rating` decrescente (AC 9)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "22 jogadores ordenados por posição e força"`

**C10** - «Novo jogo» com save existente mostra «Isso apaga o jogo salvo. Continuar?»; cancelar mantém o save, confirmar sobrescreve (AC 10)
Proof: `npx vitest run src/ui/Home.test.tsx -t "novo jogo sobre save pede confirmação"`

**C11** - Enquanto o save está sendo lido, a tela «Início» mostra «Carregando…» e nenhum botão (AC 11)
Proof: `npx vitest run src/ui/Home.test.tsx -t "mostra Carregando enquanto lê o save"`

**C12** - Sem save, a tela «Início» mostra só o botão «Novo jogo» (AC 12)
Proof: `npx vitest run src/ui/Home.test.tsx -t "sem save mostra só Novo jogo"`

**C13** - Com save válido, a tela «Início» mostra «Continuar» e «Novo jogo» (AC 13)
Proof: `npx vitest run src/ui/Home.test.tsx -t "com save mostra Continuar e Novo jogo"`

**C14** - `Rng` com a mesma seed produz a mesma sequência, e restaurar por `getState()` continua a sequência no mesmo ponto (door 2)
Proof: `npx vitest run src/engine/rng.test.ts -t "mesma seed mesma sequência"`
Proof: `npx vitest run src/engine/rng.test.ts -t "getState restaura sequência"`

**C15** - O documento gravado em `brasfoot`/`saves`/`slot-1` tem `schemaVersion: 1`, `seed`, `rngState`, `season: 1`, `userClubId` e `leagues` como array (door 1)
Proof: `npx vitest run src/persistence/save.test.ts -t "documento tem schemaVersion 1 e leagues array"`

**C16** - `src/engine/**` compila sem `lib` DOM e o lint rejeita import de `react`, `react-dom`, `zustand`, `idb` e uso de `Math.random` dentro dele; identificadores são ASCII (door 3, door 6)
Proof: `npx tsc -p tsconfig.engine.json --noEmit && npx eslint src/engine`

### S2 - Escalar e jogar uma rodada · ~10 files · ~40 KB · ~10k

**C17** - A tela «Elenco» oferece exatamente as formações 4-4-2, 4-3-3, 3-5-2 e 4-5-1 (AC 14)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "oferece 4-4-2 4-3-3 3-5-2 4-5-1"`

**C18** - Escolher uma formação preenche os 11 slots com o jogador de maior `rating` ainda disponível para a posição de cada slot, para cada uma das 4 formações (AC 15)
Proof: `npx vitest run src/engine/lineup.test.ts -t "auto preenche melhor por slot"`

**C19** - Um slot aceita apenas jogador cuja `position` é igual à do slot; outro é rejeitado (AC 16)
Proof: `npx vitest run src/engine/lineup.test.ts -t "slot rejeita posição diferente"`

**C20** - Escalação sem exatamente 11 titulares distintos, 1 GK e as contagens da formação deixa «Jogar rodada» desabilitado com «Faltam N titulares», N correto (AC 17)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "escalação incompleta desabilita Jogar rodada"`

**C21** - Após «Jogar rodada», a tela mostra os eventos da partida do jogador em ordem de minuto, o placar final dela e os 9 outros placares (AC 18)
Proof: `npx vitest run src/ui/Round.test.tsx -t "mostra eventos placar e outros 9 resultados"`

**C22** - O log de uma partida começa com `kickoff` no minuto 1, contém `halftime` no 45, termina com `fulltime` no 90; todo evento tem minuto em [1, 90] e `clubId` de um dos dois clubes (AC 19)
Proof: `npx vitest run src/engine/match.test.ts -t "log tem kickoff halftime fulltime e minutos válidos"`

**C23** - O placar é igual à contagem de `goal` por clube, e cada `goal` aponta um `playerId` titular do clube que marcou (AC 20)
Proof: `npx vitest run src/engine/match.test.ts -t "placar bate com gols e artilheiro é titular"`

**C24** - Simular as mesmas escalações duas vezes a partir do mesmo estado de `Rng` produz logs deep-equal (AC 21)
Proof: `npx vitest run src/engine/match.test.ts -t "mesmo estado de Rng gera log idêntico"`

**C25** - 2000 partidas entre escalações idênticas (`rating` 70, 4-4-2), seeds 1–2000: média de gols em [2.3, 3.1] e vitória do mandante em [40%, 52%] (AC 22)
Proof: `npx vitest run src/engine/balance.test.ts -t "times iguais"`

**C26** - 2000 partidas mandante `rating` 85 contra visitante `rating` 55, seeds 1–2000: vitória do mandante ≥ 75% (AC 23)
Proof: `npx vitest run src/engine/balance.test.ts -t "forte contra fraco"`

**C27** - Cada clube de IA escala seus 11 de maior `rating` por slot em 4-4-2 (AC 24)
Proof: `npx vitest run src/engine/lineup.test.ts -t "IA escala melhores 11 em 4-4-2"`

**C28** - A tabela dá 3/1/0 pontos, expõe P, J, V, E, D, GP, GC, SG e ordena por P, V, SG, GP decrescentes e nome crescente, com um caso por critério de desempate (AC 25)
Proof: `npx vitest run src/engine/table.test.ts -t "pontos e desempate"`

**C29** - Ao terminar a rodada, o save em IndexedDB já contém a rodada avançada quando os resultados aparecem (AC 26)
Proof: `npx vitest run src/app.test.tsx -t "rodada grava save antes de mostrar resultados"`

**C30** - Se o `put` falhar, os resultados aparecem mesmo assim e a tela mostra «Não foi possível salvar» (AC 27)
Proof: `npx vitest run src/ui/Round.test.tsx -t "falha de save mostra aviso e resultados"`

**C31** - Após a rodada, a tela mostra «Rodada N de 38» com N igual à próxima rodada a jogar (AC 28)
Proof: `npx vitest run src/ui/Round.test.tsx -t "mostra Rodada N de 38"`

**C32** - O `MatchResult` persistido contém `homeGoals`, `awayGoals` e `goals[{minute, clubId, playerId}]`, e nenhum evento de outro tipo (door 7)
Proof: `npx vitest run src/persistence/save.test.ts -t "resultado persistido tem só placar e gols"`

**C33** - Cada um dos 6 tipos de `MatchEvent` ocorre ao menos uma vez em 100 partidas com seeds 1–100, e cada tipo tem uma linha de narração em PT-BR distinta (AC 18, AC 19)
Proof: `npx vitest run src/engine/match.test.ts -t "todos os 6 tipos de evento ocorrem e têm narração"`

### S3 - Temporada completa e retomada · ~4 files · ~12 KB · ~3k

**C34** - Ao terminar a rodada 38, a tela «Fim» mostra o campeão (1º da tabela) e a tabela final, sem «Jogar rodada» (AC 29)
Proof: `npx vitest run src/ui/End.test.tsx -t "fim mostra campeão sem Jogar rodada"`

**C35** - Recarregar com save válido e clicar «Continuar» restaura a mesma rodada atual, a mesma tabela e a mesma escalação (AC 30)
Proof: `npx vitest run src/app.test.tsx -t "Continuar restaura rodada tabela e escalação"`

**C36** - Save com `schemaVersion` diferente de 1 faz «Início» mostrar «Jogo salvo incompatível (versão X)» e só «Novo jogo» (AC 31)
Proof: `npx vitest run src/ui/Home.test.tsx -t "save incompatível"`

**C37** - Sem IndexedDB, o jogo segue jogável e mostra o aviso fixo «Salvamento indisponível neste navegador» (AC 32)
Proof: `npx vitest run src/app.test.tsx -t "sem IndexedDB joga com aviso"`

**C38** - Gravar duas vezes o mesmo estado e ler devolve documento deep-equal ao gravado (AC 33)
Proof: `npx vitest run src/persistence/save.test.ts -t "gravar duas vezes mesmo estado lê idêntico"`

**C39** - Recarregar antes da rodada N e jogá-la com a mesma escalação produz os mesmos resultados que sem reload (AC 34)
Proof: `npx vitest run src/app.test.tsx -t "reload antes da rodada não muda resultado"`

**C40** - `package.json` declara em `dependencies` exatamente `react`, `react-dom`, `zustand`, `idb` (door 5)
Proof: `npx vitest run src/deps.test.ts -t "dependências de runtime"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| `Player.position` (4) | GK C1 · DF C1 · MF C1 · FW C1 | - |
| formações (4) | 4-4-2 C18 · 4-3-3 C18 · 3-5-2 C18 · 4-5-1 C18; C18 table-driven over all 4; a tela em C17 | - |
| `MatchEvent` tipos (6) | kickoff C22 · halftime C22 · fulltime C22 · goal C23 · shot_saved C33 · shot_missed C33; C33 table-driven over all 6 com narração | - |
| estados da tela «Início» (5) | carregando C11 · sem save C12 · com save C13 · incompatível C36 · sem IndexedDB C37 | - |
| desempate da tabela (5) | P C28 · V C28 · SG C28 · GP C28 · nome C28; C28 table-driven over all 5 | - |
| regras de escalação válida (4) | 11 distintos C20 · 1 GK C20 · contagens da formação C20 · posição do slot C19 | - |
| restrições do calendário (3) | 38 rodadas de 10 C5 · cada par em ambos os mandos C5 · uma partida por clube por rodada C5 | - |
| portas de mão única (7) | door 1 C15 · door 2 C14 · door 3 C16 · door 4 C2 · door 5 C40 · door 6 C16 · door 7 C32 | - |
| entidades de `Relations` (8) | Save C15 · League C1 · Club C1 · Player C2 · Round C5 · Match C5 · MatchResult C32 · Lineup C18 | - |
| gravação do save por ação (2) | seleção do clube C8 · fim de rodada C29 | - |

- `Surface` do plano é `None`; nenhuma rota, logo nenhuma linha de status.
- Claims que cruzam a fronteira da persistência (IndexedDB real via `fake-indexeddb`): C8, C15, C29, C32, C35, C38, C39.
- Nenhum outro check afirma mais que o caso único que sua prova exercita.

## Swept

- validation: C2, C19, C20
- failure modes: C30, C37
- idempotency: C38
- authorization: n/a - sem contas nem chamada externa; tudo roda na máquina do jogador
- concurrency: n/a - app single-thread sem worker; duas abas no mesmo `slot-1` é última escrita vence, aceito na v1
- data lifecycle: C10, C36
- dependency failure: C37, C30
- state transitions: C31, C34
- observability: n/a - sem requisito de log; os dois erros possíveis aparecem na tela (C30, C37)

## Handoff

- S1 ≈ 16 arquivos (scaffold Vite, `engine/rng`, `engine/generate` + dados de nomes, `persistence`, `store`, 3 telas), ~45 KB → ~11k
- S2 ≈ 10 arquivos (`engine/lineup`, `engine/match`, `engine/table`, `engine/narration`, 2 telas), ~40 KB → ~10k
- S3 ≈ 4 arquivos (tela «Fim», versão do save, fluxo do app), ~12 KB → ~3k
- Total ≈ 24k, abaixo do budget de 150k - one builder
