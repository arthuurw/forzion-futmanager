# Vários saves - checks

Profile: light
Plan: `.specs/features/varios-saves/plan.md`

24 checks in 4 slices · 2 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`); layout `npm run check:layout`. `Date.now` fixado com `vi.spyOn(Date, "now")` onde o check cita um `savedAt`.

Lições aplicadas: L-001 (estado da tela vindo do IndexedDB: grava o documento e abre o app), L-003 (pela store e pela tela), L-005 (regras e estados em tabela), L-008 (textos exatos), L-012 (o mesmo estado em cada tela que o mostra), L-018 (fixtures em que o menor número e o maior `savedAt` diferem), L-026 (espera o estado depois do save), L-027 (as telas novas medidas com o conteúdo à vista), L-029 (cada prova falha no código de antes).

## Checks

### S1 - Três espaços, o mais recente aberto · 6 files · ~150 KB · ~38k

**C1** - `saveGame(jogo, 2)` com `Date.now()` = 1700000000000 grava na chave `"slot-2"` do store `saves` o documento igual a `{ ...jogo, savedAt: 1700000000000 }`; o documento que já estava em `"slot-1"` continua igual e `"slot-3"` continua ausente (door 1, door 2; AC 1, AC 2).
Proof: `npx vitest run src/persistence/save.test.ts -t "grava no espaço com savedAt"`

**C2** - `loadGame(2)` depois de C1 devolve `{ kind: "ok", state }` com `state` igual ao jogo gravado e sem a chave `savedAt`; `loadGame()` sem número lê `"slot-1"` (AC 3).
Proof: `npx vitest run src/persistence/save.test.ts -t "leitura tira o savedAt"`

**C3** - `listSaves()` com `"slot-1"` = jogo de `savedAt` 100, `"slot-2"` ausente e `"slot-3"` = `{ schemaVersion: 9 }` devolve, na ordem, `{ slot: 1, kind: "ok", state: <jogo sem savedAt>, savedAt: 100 }`, `{ slot: 2, kind: "empty" }` e `{ slot: 3, kind: "incompatible", version: 9 }`; um documento sem `savedAt` sai com `savedAt: 0` (tabela dos 3 tipos mais o sem data).
Proof: `npx vitest run src/persistence/save.test.ts -t "lista dos espaços"`

**C4** - `deleteGame(2)` remove a chave `"slot-2"`; `"slot-1"` e `"slot-3"` continuam iguais.
Proof: `npx vitest run src/persistence/save.test.ts -t "apaga um espaço"`

**C5** - Ao abrir o app com documentos gravados no IndexedDB, o espaço ativo é o do jogo legível de maior `savedAt`, e «Continuar» abre o elenco do clube desse jogo (AC 4), em tabela:
- `slot-1` `savedAt` 300, `slot-3` `savedAt` 200 → espaço 1;
- `slot-1` `savedAt` 100, `slot-3` `savedAt` 200 → espaço 3;
- `slot-2` e `slot-3` com `savedAt` 200 → espaço 2 (empate, o menor);
- `slot-1` sem `savedAt`, `slot-2` com `savedAt` 1 → espaço 2.
Proof: `npx vitest run src/store.test.ts -t "espaço ativo na abertura"`

**C6** - Com `slot-1` = `{ schemaVersion: 9 }` e os outros vazios, o app abre sem «Continuar», o espaço ativo é o 2, e «Novo jogo» seguido da escolha de clube grava o jogo novo em `"slot-2"`, com `"slot-1"` ainda igual a `{ schemaVersion: 9 }` (AC 5).
Proof: `npx vitest run src/store.test.ts -t "sem jogo legível usa o menor vazio"`

**C7** - Com `slot-1` (`savedAt` 100) e `slot-2` (`savedAt` 200, com `pendingLive: true` e a liga na rodada 0), o app abre na tela Rodada; `"slot-2"` passa a ter a liga na rodada 1 e não tem mais `pendingLive`; `"slot-1"` continua igual (AC 6).
Proof: `npx vitest run src/store.test.ts -t "data pendente do espaço ativo"`

**C8** - Um documento v8 gravado direto em `"slot-1"` sem `savedAt` (o save de antes da feature) abre com «Continuar», que leva ao elenco do mesmo clube com a liga na mesma rodada; o espaço ativo é o 1 (AC 7).
Proof: `npx vitest run src/store.test.ts -t "save de antes abre como Jogo 1"`

**C9** - O menu da tela de título, aberto do IndexedDB (AC 8), em tabela:
- um jogo legível → «Continuar», «Jogos salvos», «Exportar jogo», «Importar jogo», «Novo jogo», «Sobre»;
- só um jogo incompatível → «Jogos salvos», «Importar jogo», «Novo jogo», «Sobre»;
- nenhum espaço ocupado → «Importar jogo», «Novo jogo», «Sobre».
Proof: `npx vitest run src/ui/Home.test.tsx -t "menu com espaços"`

**C10** - Com os jogos A em `slot-1` e B em `slot-2` (ativo), jogar uma rodada pela store grava só `"slot-2"`, com `savedAt` = `Date.now()` fixado; `"slot-1"` e `"slot-3"` continuam iguais (AC 2, L-003).
Proof: `npx vitest run src/store.test.ts -t "gravação só no espaço ativo"`

### S2 - Tela «Jogos salvos» · 5 files · ~90 KB · ~23k

**C11** - «Jogos salvos» no título abre a tela «Jogos salvos» com 3 linhas na ordem «Jogo 1», «Jogo 2», «Jogo 3» e o botão «Voltar»; com `slot-1` legível (`savedAt` fixo), `slot-2` vazio e `slot-3` = `{ schemaVersion: 9 }` (AC 9-12):
- linha 1: «<clube> · <liga> · Temporada <n>» e «Salvo em <dd/mm/aaaa> às <hh:mm>», com o dia e a hora locais desse `savedAt`, e os botões «Abrir» e «Apagar»;
- linha 2: «Vazio», sem botões;
- linha 3: «Jogo salvo incompatível (versão 9)», só com «Apagar».
Proof: `npx vitest run src/ui/Saves.test.tsx -t "lista dos espaços na tela"`

**C12** - A linha de um jogo legível sem `savedAt` (save de antes da feature) mostra o resumo e não mostra «Salvo em» (AC 10).
Proof: `npx vitest run src/ui/Saves.test.tsx -t "jogo sem data"`

**C13** - «Abrir» numa linha que não é a do espaço ativo torna esse espaço ativo e abre o jogo dele (AC 13), em tabela:
- `slot-3` sem marca → tela do elenco com o nome do clube de `slot-3`; a próxima gravação vai para `"slot-3"`;
- `slot-2` com `pendingLive` → tela Rodada; `"slot-2"` sem `pendingLive` e com a liga uma rodada adiante.
Proof: `npx vitest run src/ui/Saves.test.tsx -t "abrir um espaço"`

**C14** - «Apagar» na linha 2 mostra a confirmação «Confirmar apagar» com o texto «Apagar o Jogo 2? Isso não pode ser desfeito.», o foco em «Sim, apagar», e `"slot-2"` ainda gravado; «Cancelar» fecha sem apagar; «Sim, apagar» remove `"slot-2"` e a linha 2 passa a «Vazio» (AC 14, AC 15).
Proof: `npx vitest run src/ui/Saves.test.tsx -t "apagar com confirmação"`

**C15** - Apagar o espaço ativo (AC 16), em tabela:
- `slot-1` (`savedAt` 100) e `slot-3` (`savedAt` 200, ativo): apagar o 3 deixa o 1 ativo, e «Voltar» seguido de «Continuar» abre o elenco do clube de `slot-1`;
- só `slot-2`: apagá-lo deixa o título sem «Continuar» e sem «Jogos salvos» («Importar jogo», «Novo jogo», «Sobre»).
Proof: `npx vitest run src/ui/Saves.test.tsx -t "apagar o espaço ativo"`

**C16** - «Voltar» em «Jogos salvos» leva à tela de título (AC 17).
Proof: `npx vitest run src/ui/Saves.test.tsx -t "voltar ao título"`

### S3 - Novo jogo e importação sem apagar nada · 4 files · ~100 KB · ~25k

**C17** - Com `slot-1` e `slot-3` legíveis e `slot-2` vazio, «Novo jogo» vai direto à escolha de clube, sem confirmação; escolhido o clube, `"slot-2"` tem o jogo novo com esse `userClubId`, e `"slot-1"` e `"slot-3"` continuam iguais (AC 18).
Proof: `npx vitest run src/ui/Saves.test.tsx -t "novo jogo no espaço vazio"`

**C18** - Com os 3 espaços ocupados (dois legíveis e um incompatível), «Novo jogo» abre «Jogos salvos» com o aviso «Os 3 espaços estão ocupados. Apague um jogo para começar outro.», não abre a escolha de clube e não grava nada (AC 19).
Proof: `npx vitest run src/ui/Saves.test.tsx -t "novo jogo com os espaços cheios"`

**C19** - Com `slot-1` legível e `slot-2` vazio, importar um arquivo válido grava o jogo em `"slot-2"` sem confirmação, torna o espaço 2 ativo e abre o elenco do clube importado; `"slot-1"` continua igual (AC 20).
Proof: `npx vitest run src/ui/Home.test.tsx -t "importar no espaço vazio"`

**C20** - Com os 3 espaços ocupados, importar um arquivo válido abre «Jogos salvos» com o aviso «Os 3 espaços estão ocupados. Apague um jogo para importar outro.» e não grava nada (AC 21).
Proof: `npx vitest run src/ui/Home.test.tsx -t "importar com os espaços cheios"`

**C21** - Com a leitura dos espaços falhando na abertura, «Novo jogo» mostra «Confirmar novo jogo» com «Isso apaga o jogo salvo. Continuar?» e o foco em «Sim, apagar»; a importação de um arquivo válido mostra «Confirmar importação» com «Isso substitui o jogo salvo. Continuar?», e «Sim, substituir» grava o jogo em `"slot-1"` (AC 22, correcoes-validacao AC 2 e AC 50).
Proof: `npx vitest run src/store.test.ts -t "falha de leitura exige confirmação"`
Proof: `npx vitest run src/ui/Home.test.tsx -t "foco na confirmação"`
Proof: `npx vitest run src/ui/Home.test.tsx -t "falha de leitura importa no Jogo 1"`

**C22** - Com `slot-1` e `slot-2` (ativo), «Menu principal» no elenco seguido de «Continuar» volta ao mesmo clube, e mudar a formação em seguida grava só `"slot-2"` (AC 23).
Proof: `npx vitest run src/ui/Saves.test.tsx -t "menu principal mantém o espaço"`

**C23** - As mensagens de importação recusada (arquivo inválido, de outro jogo, versão não suportada, corrompido) continuam iguais e não gravam em espaço nenhum, com um jogo salvo e espaço vazio disponível.
Proof: `npx vitest run src/ui/Home.test.tsx -t "arquivo inválido mostra o aviso e mantém o save|JSON que não é arquivo de save mostra o aviso e mantém o save|versão não suportada mostra o aviso|arquivo corrompido mostra o aviso e mantém o save"`

### S4 - As telas cabem · 1 file · ~22 KB · ~6k

**C24** - `npm run check:layout` (seed 1) sai 0 e mede 19 telas: as 17 de hoje, `saves` («Jogos salvos» com os 3 espaços ocupados) e `savesConfirm` (a mesma tela com a confirmação de apagar aberta), cada uma em 400 × 700 sem rolagem; `homeSave` passa com o botão «Jogos salvos» no menu e sem sobrepor os botões de som. A última linha é «layout: as 19 telas cabem em 400 × 700 px» (AC 24).
Proof: `npm run check:layout`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| doors (2) | chave `slot-<n>` C1 · `savedAt` no documento C1, C2 | - |
| tipos de espaço lidos (4) | legível C3 · vazio C3 · incompatível C3 · legível sem data C3 | - |
| regra do espaço ativo (4) | maior `savedAt` C5 · menor número em empate C5 · sem data = 0 C5 · nenhum legível C6 | - |
| menu do título (3) | com jogo C9 · só incompatível C9 · vazio C9 | - |
| linhas da tela (4) | legível com data C11 · legível sem data C12 · vazio C11 · incompatível C11 | - |
| abrir (2) | sem marca C13 · com data pendente C13 | - |
| apagar (4) | confirma e cancela C14 · apaga outro C14 · apaga o ativo com outro jogo C15 · apaga o último C15 | - |
| novo jogo (3) | espaço vazio C17 · cheio C18 · leitura falhou C21 | - |
| importar (4) | espaço vazio C19 · cheio C20 · leitura falhou C21 · arquivo recusado C23 | - |
| gravações (3) | `saveGame` C1 · rodada pela store C10 · edição do elenco C22 | - |
| telas medidas novas (3) | `saves` C24 · `savesConfirm` C24 · `homeSave` com o botão C24 | - |

- C24 é a única prova sem seletor de teste; o script já é a prova de layout das features anteriores (AD-010)

## Swept

- validation: C3 - documento de versão não suportada vira linha incompatível; C23 - arquivo recusado não grava
- failure modes: C21 - leitura que falha mantém as confirmações e grava no Jogo 1
- idempotency: n/a - cada gravação substitui o documento inteiro da chave; repetir é o mesmo `put`
- authorization: n/a - jogo local, sem contas
- concurrency: existing - uma aba por vez (AD-020) e a fila de gravação da store (`writeQueue`); C10 prova que a gravação vai só para o espaço ativo
- data lifecycle: C14, C15 - apagar remove a chave; C8 - o save de antes continua sem migração
- dependency failure: existing - IndexedDB indisponível mantém o jogo sem save (lancamento); C21 para a leitura que falha
- state transitions: C5, C13, C15 - qual espaço é o ativo depois de abrir, escolher e apagar
- observability: n/a - jogo offline sem telemetria

## Handoff

- S1 ≈ `save.ts` 1,4 KB + `save.test.ts` 10 KB + `store.ts` 30 KB + `store.test.ts` 44 KB + `Home.tsx` 3 KB + `Home.test.tsx` 14 KB ≈ 102 KB; S2 ≈ `Saves.tsx` (novo, ~5 KB) + `Saves.test.tsx` (novo, ~15 KB) + `App.tsx` 4 KB + `styles.css` ~30 KB + store já lida ≈ 54 KB; S3 ≈ `NewGameButton.tsx` 2 KB + testes já lidos ≈ 2 KB; S4 ≈ `layout-check.mjs` 22 KB. Total ≈ 180 KB / 4 ≈ 45k, abaixo do budget de 150k - one builder
- Mechanism: one builder
