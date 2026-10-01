# Lançamento checks

Profile: light
Plan: `.specs/features/lancamento/plan.md`

36 checks in 6 slices · 3 one-way doors · 2 open at approval, both resolved 2026-09-28 (repositório criado e tornado público pelo autor)

Comando base: `npx vitest run <arquivo> -t "<nome>"` (vitest 5, `npm test` = `vitest run`).

## Checks

### S1 - Exportar · 5 files · 34 KB · ~9k

**C1** - A tela inicial com um jogo de clube escolhido mostra «Exportar jogo»; sem jogo (`game: null`) e com jogo sem clube (`userClubId: null`) não mostra (AC 1, AC 4)
Proof: `npx vitest run src/ui/Home.test.tsx -t "Exportar jogo aparece só com clube escolhido"`

**C2** - Tocar «Exportar jogo» com o Flamengo-like `seededGame(1, 0)` na temporada 2026 baixa um arquivo cujo nome é `forzion-futmanager-t2026-<apelido normalizado>.json`; um apelido com acento e espaço («São Paulo» → `sao-paulo`) sai sem acento e com hífen (AC 2)
Proof: `npx vitest run src/ui/Home.test.tsx -t "Exportar jogo baixa o arquivo com o nome da temporada e do clube"`
Proof: `npx vitest run src/engine/saveFile.test.ts -t "nome do arquivo sem acento e com hífen"`

**C3** - `encodeSaveFile(game, "2026-09-28T12:00:00.000Z")` devolve JSON com exatamente as chaves `format`, `exportedAt`, `save`, com `format === "forzion-futmanager-save"`, `exportedAt` igual ao ISO recebido e `save` `toEqual` ao `game` (AC 3, door 1)
Proof: `npx vitest run src/engine/saveFile.test.ts -t "envelope tem só format, exportedAt e save"`

### S2 - Importar · 6 files · 45 KB · ~12k

**C4** - A tela inicial mostra «Importar jogo» com e sem save, ligado a um `input type="file"` com `accept` contendo `.json` (AC 5)
Proof: `npx vitest run src/ui/Home.test.tsx -t "Importar jogo aparece com e sem save"`

**C5** - Sem save gravado, importar um arquivo válido grava o documento no slot (lido de volta com `loadGame` igual ao `save`) e abre a tela `squad` (temporada em andamento); um save com a liga encerrada abre `end` (AC 6)
Proof: `npx vitest run src/ui/Home.test.tsx -t "importar sem save grava e abre o jogo"`

**C6** - Com save gravado, importar um arquivo válido mostra «Isso substitui o jogo salvo. Continuar?» e não grava antes de «Sim, substituir»; depois dele o slot tem o importado. Com save incompatível a confirmação também aparece (AC 7) - Superseded por varios-saves C19
Proof: `npx vitest run src/ui/Home.test.tsx -t "importar sobre save pede confirmação"`
Proof: `npx vitest run src/ui/Home.test.tsx -t "importar sobre save incompatível pede confirmação"`

**C7** - «Cancelar» na confirmação deixa o slot igual ao save anterior e volta ao menu com «Importar jogo» visível (AC 8)
Proof: `npx vitest run src/ui/Home.test.tsx -t "cancelar a importação mantém o save"`

**C8** - `decodeSaveFile` de um envelope com save v7 devolve `ok` com o estado igual a `migrateSave(v7)`; de um save v1 devolve `ok` com `schemaVersion` 8 (AC 9)
Proof: `npx vitest run src/engine/saveFile.test.ts -t "save antigo chega migrado"`

**C9** - `decodeSaveFile("isto não é json")` devolve `invalid_json`; a tela inicial mostra «Arquivo inválido: não é um jogo salvo» e o slot continua igual (AC 10)
Proof: `npx vitest run src/engine/saveFile.test.ts -t "texto que não é JSON"`
Proof: `npx vitest run src/ui/Home.test.tsx -t "arquivo inválido mostra o aviso e mantém o save"`

**C10** - `decodeSaveFile` devolve `not_a_save` para: JSON sem `format`, `format` diferente (`"outro-jogo"`), um array, `null`, e um `GameState` cru sem envelope (AC 11)
Proof: `npx vitest run src/engine/saveFile.test.ts -t "JSON que não é arquivo de save"`
Proof: `npx vitest run src/ui/Home.test.tsx -t "JSON que não é arquivo de save mostra o aviso e mantém o save"` (round 2: a tela mostra «Arquivo inválido: não é um jogo salvo» e o slot continua igual - lacuna do Verifier, round 1)

**C11** - `decodeSaveFile` com `save.schemaVersion` 9 devolve `unsupported_version` com `version: 9`; a tela inicial mostra «Versão do jogo salvo não suportada (9)» e o slot continua igual (AC 12)
Proof: `npx vitest run src/engine/saveFile.test.ts -t "versão não suportada"`
Proof: `npx vitest run src/ui/Home.test.tsx -t "versão não suportada mostra o aviso"`

**C12** - `decodeSaveFile` devolve `malformed` para cada save v8 com uma falha, tabela sobre as 9 falhas: `leagues` ausente, `leagues` vazio, uma liga sem `clubs` em lista, `market` ausente, `history` não lista, `cups` não lista, `seed` não inteiro, `rngState` não inteiro, `season` não inteiro, e `userClubId` que não é clube de nenhuma liga (10 casos); o `seededGame(1)` sem alteração devolve `ok` (AC 13)
Proof: `npx vitest run src/engine/saveFile.test.ts -t "save v8 sem a forma de um jogo"`

**C13** - Na tela inicial, um arquivo `malformed` mostra «Arquivo corrompido: não foi possível ler o jogo» e o slot continua igual (AC 13)
Proof: `npx vitest run src/ui/Home.test.tsx -t "arquivo corrompido mostra o aviso e mantém o save"`

**C14** - Com a gravação falhando (`saveGame` rejeita), importar abre o jogo importado (`phase` `squad`, `game` igual ao importado) e o `Banner` mostra «Não foi possível salvar» (AC 14)
Proof: `npx vitest run src/store.test.ts -t "importar com gravação falhando abre o jogo e avisa"`

**C15** - Ida e volta: `decodeSaveFile(encodeSaveFile(g, iso))` devolve `ok` com estado `toEqual` a `g`, para um jogo novo com clube, um jogo com 20 rodadas jogadas e um jogo na segunda temporada (histórico não vazio) (AC 15)
Proof: `npx vitest run src/engine/saveFile.test.ts -t "ida e volta devolve o mesmo jogo"`

### S3 - Tela de erro · 4 files · 8 KB · ~2k

**C16** - Um filho que lança no render faz aparecer «Algo deu errado» com «Recarregar»; com jogo de clube escolhido no store aparece também «Exportar jogo», e sem jogo não aparece (AC 16)
Proof: `npx vitest run src/ui/ErrorBoundary.test.tsx -t "tela de erro com Recarregar e Exportar jogo"`

**C17** - «Recarregar» chama `window.location.reload` uma vez (AC 17)
Proof: `npx vitest run src/ui/ErrorBoundary.test.tsx -t "Recarregar recarrega a página"`

**C18** - «Exportar jogo» na tela de erro baixa um arquivo com o mesmo nome e o mesmo envelope da tela inicial (AC 18)
Proof: `npx vitest run src/ui/ErrorBoundary.test.tsx -t "Exportar jogo na tela de erro baixa o save"`

**C19** - O erro do filho é passado a `console.error` (espião recebe o `Error` lançado) (AC 19)
Proof: `npx vitest run src/ui/ErrorBoundary.test.tsx -t "registra o erro no console"`

**C20** - O `App` envolve as telas no `ErrorBoundary`: uma tela do `App` que lança mostra «Algo deu errado» (L-003: pela entrada, não só o componente isolado) (AC 16)
Proof: `npx vitest run src/app.test.tsx -t "uma tela que quebra mostra a tela de erro"`

### S4 - Armazenamento persistente · 2 files · 30 KB · ~8k

**C21** - Escolher um clube (primeira gravação) chama `navigator.storage.persist` uma vez; jogar uma rodada depois (segunda gravação) não chama de novo (AC 20)
Proof: `npx vitest run src/store.test.ts -t "pede armazenamento persistente uma vez por sessão"`

**C22** - Sem `navigator.storage.persist`, e com `persist` rejeitando, escolher um clube termina com `saveStatus` `ok` e sem erro não tratado (AC 21)
Proof: `npx vitest run src/store.test.ts -t "sem persist ou com persist rejeitando segue sem erro"`

**C23** - Uma gravação que falha não conta como a primeira: `persist` não é chamado enquanto `saveGame` rejeita (AC 20)
Proof: `npx vitest run src/store.test.ts -t "gravação que falha não pede persistência"`

### S5 - Sobre e apresentação · 8 files · 75 KB · ~19k

**C24** - O menu da tela inicial, com save e jogo de clube, tem exatamente os botões «Continuar», «Exportar jogo», «Importar jogo», «Novo jogo», «Sobre», nessa ordem; sem save, «Importar jogo», «Novo jogo», «Sobre» (AC 22)
Proof: `npx vitest run src/ui/Home.test.tsx -t "ordem do menu"`

**C25** - «Sobre» leva à fase `about`; a tela mostra «Forzion FutManager», «Versão 1.0.0» e «Clubes, jogadores e competições são fictícios.»; `package.json` tem `version` `1.0.0` (AC 23)
Proof: `npx vitest run src/ui/About.test.tsx -t "mostra nome, versão e aviso de ficção"`

**C26** - A tela Sobre lista as 5 músicas, cada uma com título, autor e «CC0» (tabela sobre as 5: Old Tricks/Zane Little Music, Hush Hamlet/Zane Little Music, Apple Cider/Zane Little Music, Aura Horizon/Zane Little Music, Summer Memories/Juhani Junkala), e as 2 fontes com «SIL Open Font License 1.1» (AC 24)
Proof: `npx vitest run src/ui/About.test.tsx -t "créditos das músicas e das fontes"`

**C27** - A tela Sobre mostra «O jogo fica salvo só neste navegador. Use Exportar jogo para levá-lo a outro aparelho.» (AC 25)
Proof: `npx vitest run src/ui/About.test.tsx -t "aviso do save local"`

**C28** - «Voltar» na tela Sobre leva à fase `home` e ao menu (AC 26)
Proof: `npx vitest run src/ui/About.test.tsx -t "Voltar leva à tela inicial"`

**C29** - `npm run check:layout` mede a tela Sobre e a tela inicial com os 5 botões a 400 × 700 e sai 0 (AC 27, AD-010)
Proof: `npm run check:layout`

**C30** - `index.html` tem `link rel="icon"` para `favicon.svg` (que existe em `public/`), `meta name="description"` não vazia, `meta name="theme-color"`, `meta property="og:title"`, `meta property="og:description"` e `<noscript>` com texto em português (AC 28)
Proof: `npx vitest run src/launch.test.ts -t "index.html se apresenta"`

**C31** - O `App` na fase `about` toca a música da tela inicial e mostra a faixa do título, não a faixa do jogo (a fase nova é tratada nos dois ramos de `phase`) (AC 23)
Proof: `npx vitest run src/app.test.tsx -t "a tela Sobre fica no título"`

### S6 - Publicação · 5 files · 20 KB · ~5k

**C32** - Depois de `npm run build`, nenhum arquivo `.html`, `.css` ou `.js` de `dist/` contém `src="/`, `href="/` ou `url(/` (nem com aspas), e `dist/index.html` referencia os assets com `./` (AC 29, door 3)
Proof: `npm run build && node scripts/dist-check.mjs`

**C33** - `.github/workflows/deploy.yml` roda, no job de build, os passos `npm ci`, `npm test`, `npm run lint`, `npm run build` nessa ordem e sobe `dist` com `actions/upload-pages-artifact`; o gatilho é `push` em `main` mais `workflow_dispatch` (AC 30, door 2)
Proof: `npx vitest run src/launch.test.ts -t "workflow roda test, lint e build antes de publicar"`

**C34** - O job de publicação (`actions/deploy-pages`) declara `needs` do job de build, então um passo vermelho não publica (AC 31)
Proof: `npx vitest run src/launch.test.ts -t "publicação depende do build"`

**C35** - A última execução do workflow em `main` termina `success` e a URL do Pages responde `200` com `<title>Forzion FutManager</title>` (AC 32)
Proof: `gh run list --workflow deploy.yml --branch main --limit 1 --json conclusion --jq '.[0].conclusion' | grep -x success`
Proof: `curl -sf "$(gh api repos/arthuurw/forzion-futmanager/pages --jq .html_url)" | grep -q "<title>Forzion FutManager</title>"`

**C36** - `git ls-files bash.exe.stackdump` não imprime nada e `git check-ignore -q bash.exe.stackdump` sai 0 (AC 33)
Proof: `test -z "$(git ls-files bash.exe.stackdump)" && git check-ignore -q bash.exe.stackdump`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| resultado da leitura do arquivo (5) | `ok` C8, C15 · `invalid_json` C9 · `not_a_save` C10 · `unsupported_version` C11 · `malformed` C12 | - |
| `GET` URL pública statuses (1) | 200 C35 | - |
| falhas de forma do save v8 (10) | C12, table-driven over all 10 | - |
| resultado recusado -> aviso na tela (4) | `invalid_json` C9 · `not_a_save` C10 · `unsupported_version` C11 · `malformed` C13 | - |
| entradas `not_a_save` (5) | sem format C10 · format errado C10 · array C10 · null C10 · GameState cru C10 | - |
| estado do slot ao importar (3) | vazio C5 · com save C6 · incompatível C6 | - |
| botões do menu inicial (5) | Continuar C24 · Exportar jogo C1, C24 · Importar jogo C4, C24 · Novo jogo C24 · Sobre C24 | - |
| músicas creditadas (5) | C26, table-driven over all 5 | - |
| fontes creditadas (2) | Exo 2 C26 · Barlow Semi Condensed C26 | - |
| meta do `index.html` (6) | icon C30 · description C30 · theme-color C30 · og:title C30 · og:description C30 · noscript C30 | - |
| passos do workflow (4) | npm ci C33 · npm test C33 · npm run lint C33 · npm run build C33 | - |
| ramos de `phase` no `App` que a fase `about` atravessa (2) | tela/faixa do título C31 · música C31 | - |
| lugares que baixam o arquivo (2) | tela inicial C2 · tela de erro C18 | - |
| doors (3) | formato do arquivo C3, C10 · publicação C33, C34, C35 · base relativa C32 | - |
| startup config: `ErrorBoundary` montado (1 assembly) | `App` C20 | - |

- Claims naming a response or file shape: C3, C10, C32, C35 - each proof reads the real output (the encoded text, the built `dist/`, the live URL)
- No other check claims more than the single case its proof exercises

## Swept

- validation: C9, C10, C11, C12
- failure modes: C14 (gravação do importado falha), C16 (erro de render), C22 (persist ausente ou rejeitando)
- idempotency: C6 - importar de novo passa pela mesma confirmação e só substitui o slot único
- authorization: n/a - jogo local sem contas; publicar exige o token do autor no GitHub
- concurrency: n/a - a importação acontece só na tela inicial, onde nenhuma outra gravação está em curso (sem partida ao vivo, mercado ou virada abertos); o `saving` do store guarda só mercado e virada, não a importação. Publicações simultâneas: `concurrency` do workflow (C33 lê o arquivo)
- data lifecycle: C21 (pedido de armazenamento persistente contra despejo), C15 (o arquivo exportado guarda a carreira fora do navegador)
- dependency failure: C22 (Storage API ausente), C14 (IndexedDB falhando); GitHub Pages fora do ar: n/a - sem fallback, o jogo já carregado segue rodando
- state transitions: C5 (home → squad/end), C25, C28 (home ↔ about), C7 (confirmação → menu)
- observability: C19 (`console.error` na tela de erro); sem telemetria (Out of scope do plano)

## Handoff

- S1-S6 ≈ 150 KB lidos/tocados (store.ts 16 KB, styles.css 51 KB, layout-check.mjs 16 KB, app.test.tsx 22 KB, store.test.ts 14 KB, migrate.ts 10 KB, types.ts 10 KB, Home 5 KB, save.ts 1 KB, index.html/vite.config 1 KB) + ~25 KB novos (saveFile, About, ErrorBoundary, testes, workflow, dist-check) ≈ 175 KB / 4 ≈ 44k, sob o budget de 150k - um builder
- Mechanism: one builder (cabe no budget, sem pergunta)
