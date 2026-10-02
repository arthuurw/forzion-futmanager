# Ajustes dos saves - checks

Profile: light
Plan: none - bounded change (store, título, testes da vários-saves, layout script), no one-way door; intent below.

## Intent

O Verifier do round 1 de varios-saves (02/10/2026) deixou oito pontos fracos, e o autor pediu para fechá-los antes da próxima feature:

1. C6 só via «sem Continuar» e o espaço 2 depois de «Novo jogo», que escolhe o espaço vazio sozinho; a escolha do espaço na abertura, sem jogo legível, não tinha prova.
2. C10 observava a marca `pendingLive` do começo da data, não o save que fecha a data.
3. C11/C12 punham o clube do usuário sempre na primeira liga, e um resumo preso a `leagues[0]` passaria (L-018).
4. As provas nomeadas de C21 não afirmavam o texto «Isso apaga o jogo salvo. Continuar?», e a prova do foco montava a falha de leitura à mão.
5. C22 não afirmava que o espaço 3 continua vazio.
6. As provas de C23 montavam a store à mão, com os espaços vazios em memória, e só olhavam o espaço 1.
7. O `check:layout` não exigia o botão «Jogos salvos» na tela `homeSave`.
8. O título mostrava «Jogo salvo incompatível (versão N)» sempre que algum espaço tinha save incompatível, mesmo com «Continuar» abrindo um jogo bom de outro espaço. Com esta mudança (default recomendado; o autor pediu para fechar os pontos sem rodada de perguntas), o aviso do título só aparece quando nenhum espaço tem jogo legível; o espaço incompatível continua listado em «Jogos salvos» com «Apagar».

8 checks in 2 slices · 0 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`); layout `npm run check:layout`.

Lições aplicadas: L-001 (estado vindo do IndexedDB), L-003 (pela store e pela tela), L-005 (casos em tabela), L-008 (texto exato), L-018 (fixture em que a liga do clube não é a primeira), L-026 (espera o estado depois do save), L-029 (cada prova nova falha no código de antes, ou, nos casos 1, 5 e 6, prende um comportamento que já existe e não tinha prova).

## Checks

### S1 - Store, título e provas da vários-saves · 5 files · ~118 KB · ~30k

**C1** - Ao abrir o app do IndexedDB, sem nenhum jogo legível, antes de qualquer clique, o título não tem «Continuar» e o espaço ativo é o menor vazio, em tabela:
- `slot-1` = `{ schemaVersion: 9 }`, os outros vazios → espaço 2;
- `slot-2` = `{ schemaVersion: 9 }`, os outros vazios → espaço 1;
- `slot-1` e `slot-2` = `{ schemaVersion: 9 }`, `slot-3` vazio → espaço 3.
Proof: `npx vitest run src/store.test.ts -t "abertura sem jogo legível escolhe o menor vazio"`

**C2** - Com os jogos A em `slot-1` e B em `slot-2` (ativo) e `Date.now()` fixado em 1700000000000, jogar a data ao vivo pela store grava `pendingLive: true` em `"slot-2"` ao começar e, depois de «Pular para o fim», grava em `"slot-2"` o jogo com a liga do clube uma rodada adiante, sem `pendingLive` e com `savedAt` 1700000000000; `"slot-1"` continua igual e `"slot-3"` continua ausente.
Proof: `npx vitest run src/store.test.ts -t "fim da data grava só no espaço ativo"`

**C3** - Na tela «Jogos salvos», a linha de um jogo cujo clube está fora da primeira liga mostra «<clube> · <liga do clube> · Temporada <n>», em tabela: clube na Série B (`leagues[1]`) e clube em `leagues[2]`; nos dois casos o nome de `leagues[0]` não aparece na linha.
Proof: `npx vitest run src/ui/Saves.test.tsx -t "resumo com a liga do clube"`

**C4** - Com um jogo gravado em `slot-1` e a leitura dos espaços falhando de verdade na abertura (`init` com o IndexedDB recusando abrir), «Novo jogo» abre «Confirmar novo jogo» com o texto «Isso apaga o jogo salvo. Continuar?» e o foco em «Sim, apagar».
Proof: `npx vitest run src/ui/Home.test.tsx -t "falha real de leitura pede confirmação com foco"`

**C5** - No caso de C22 de varios-saves (A em `slot-1`, B em `slot-2` ativo, «Menu principal», «Continuar», formação mudada), `"slot-3"` continua ausente, além de `"slot-2"` gravado e `"slot-1"` igual.
Proof: `npx vitest run src/ui/Saves.test.tsx -t "menu principal mantém o espaço"`

**C6** - As quatro importações recusadas de C23 de varios-saves partem do app aberto do IndexedDB com um jogo em `slot-1` (store lida por `init`, não montada à mão); depois da recusa, a mensagem é a mesma de antes, `"slot-1"` continua igual e `"slot-2"` e `"slot-3"` continuam ausentes.
Proof: `npx vitest run src/ui/Home.test.tsx -t "arquivo inválido mostra o aviso e mantém o save|JSON que não é arquivo de save mostra o aviso e mantém o save|versão não suportada mostra o aviso|arquivo corrompido mostra o aviso e mantém o save"`

**C7** - O aviso «Jogo salvo incompatível (versão N)» do título, aberto do IndexedDB, em tabela:
- `slot-1` legível e `slot-2` = `{ schemaVersion: 9 }` → sem o aviso, com «Continuar» e «Jogos salvos»;
- só `slot-2` = `{ schemaVersion: 9 }` → «Jogo salvo incompatível (versão 9)», sem «Continuar»;
- `slot-1` legível (ativo) e `slot-2` = `{ schemaVersion: 9 }`, depois «Apagar» e «Sim, apagar» no Jogo 1 em «Jogos salvos» e «Voltar» → o título mostra «Jogo salvo incompatível (versão 9)».
Proof: `npx vitest run src/ui/Home.test.tsx -t "aviso de incompatível só sem jogo legível"`

### S2 - A tela cabe · 1 file · ~24 KB · ~6k

**C8** - `npm run check:layout` (seed 1) sai 0, e a medição de `homeSave` falha com «sem o botão «Jogos salvos»» quando o menu do título não tem esse botão dentro de 400 × 700; a última linha continua «layout: as 19 telas cabem em 400 × 700 px».
Proof: `npm run check:layout`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| espaço ativo na abertura sem jogo legível (3) | só 1 incompatível C1 · só 2 incompatível C1 · 1 e 2 incompatíveis C1 | - |
| gravações da data no espaço ativo (2) | começo da data (`pendingLive`) C2 · fim da data C2 | - |
| liga do resumo fora da primeira (2) | `leagues[1]` C3 · `leagues[2]` C3 | - |
| espaços que a recusa não toca (3) | `slot-1` C6 · `slot-2` C6 · `slot-3` C6 | - |
| espaços que «Menu principal» não toca (2) | `slot-1` C5 · `slot-3` C5 | - |
| aviso de incompatível no título (3 estados) | com jogo legível C7 · sem jogo legível C7 · depois de apagar o legível C7 | - |
| importações recusadas (4) | inválido C6 · outro jogo C6 · versão C6 · corrompido C6 | - |

- No check names a status code, route or response shape.
- No other check claims more than the cases its proof exercises.

## Swept

- validation: existing - as recusas da importação (`src/store.ts` `importFile`), agora provadas com os 3 espaços em C6
- failure modes: C4
- idempotency: n/a - nenhuma operação nova; as gravações seguem a fila de varios-saves
- authorization: n/a - jogo local, sem usuário
- concurrency: existing - fila de gravação (`src/store.ts` `persist`, `writeQueue`) que C2 atravessa
- data lifecycle: C7 (apagar o jogo legível traz o aviso de volta)
- dependency failure: C4 (IndexedDB recusando abrir)
- state transitions: C1, C2, C7
- observability: n/a - sem log

## Out of scope

- As 20 linhas `ok` do `check:layout` contra 19 telas exigidas - convenção que vem de antes (`roundOffer`), anotada nos relatórios anteriores.
- Reescrever as provas antigas de C10, C21 e C23 de varios-saves - continuam como estão; os checks novos acrescentam o que faltava.

## Handoff

- S1 = 118 KB / 4 ≈ 30k (store.ts 35 KB, Home.tsx 4 KB, store.test.ts 49 KB, Saves.test.tsx 11 KB, Home.test.tsx 19 KB); S2 entra no script de layout (24 KB) a ~36k no total, abaixo do budget de 150k - one builder
