# Lançamento verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: b41e1d3..28b542f
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 1 (`b41e1d3..8a63d81`, relatório em `99b843e`) foi FAIL por dois motivos: C35 sem prova (sem remoto no GitHub - bloqueio de ambiente, pergunta aberta 2 do plano) e uma lacuna de cobertura (AC 11: o aviso na tela para `not_a_save` sem prova). A correção é `28b542f` (`git diff 99b843e..28b542f`): 3 arquivos - `src/ui/Home.test.tsx` (+4, teste novo `JSON que não é arquivo de save mostra o aviso e mantém o save`), `src/ui/download.ts` (`URL.revokeObjectURL` adiado com `setTimeout(..., 0)`), `.specs/features/lancamento/checks.md` (segunda prova no C10, linha de cobertura `resultado recusado -> aviso na tela (4)`, cabeçalho «2 open ... (2 block go-live)», linha Swept de concorrência reescrita). Nenhum arquivo de engine, store, CSS, markup de tela, workflow ou config foi tocado.

Escopo desta rodada: todas as provas rodadas de novo em `28b542f`; citações renovadas nos arquivos que a correção tocou; os veredictos não-PASS do round 1 (C35, a linha de cobertura) julgados de novo; o resto marcado `carried from 8a63d81`. `git status --porcelain` vazio no início e no fim (o `dist/` gerado é ignorado).

## Binding sources

carried from 8a63d81. Profile `light`: a etapa 1 não roda. A correção não tocou interface nem telas (só um teste, um detalhe interno do download e o `checks.md`), então nada a reabrir. No diff da correção: nenhum `Math.random`, nenhum «Brasfoot», `src/engine/**` intocado (AD-002, AD-015).

## Checks

verified at 28b542f (provas e citações de `Home.test.tsx`; citações em arquivos que a correção não tocou - `saveFile.test.ts`, `store.test.ts`, `ErrorBoundary.test.tsx`, `About.test.tsx`, `app.test.tsx`, `launch.test.ts`, `layout-check.mjs`, `dist-check.mjs`, `deploy.yml` - carried from 8a63d81, linhas inalteradas).

Prova Vitest, uma invocação em `28b542f`: `npx vitest run src/ui/Home.test.tsx src/engine/saveFile.test.ts src/store.test.ts src/ui/ErrorBoundary.test.tsx src/app.test.tsx src/ui/About.test.tsx src/launch.test.ts -t "<alternação dos 37 nomes extraídos do checks.md>" --reporter=verbose` exit 0 - `Tests 37 passed | 32 skipped (69)`; 37 linhas `✓`, nenhuma falha. Cada um dos 37 nomes conferido por sufixo exato: exatamente 1 linha `✓` para cada. O teste novo aparece como `✓ src/ui/Home.test.tsx > exportar e importar (lancamento) > JSON que não é arquivo de save mostra o aviso e mantém o save 99ms`; ele foi adicionado em `28b542f`.

Prova de layout (C29): carried from 8a63d81. A correção não tocou `styles.css`, markup de tela nem `scripts/layout-check.mjs` (`git diff 99b843e..28b542f --stat`: só `checks.md`, `Home.test.tsx`, `download.ts`). Resultado do round 1: `npm run check:layout` exit 0, `ok homeSave ...`, `ok about ...`, `layout: as 14 telas cabem em 400 × 700 px`.

Prova do dist (C32), rodada em `28b542f`: `npm run build && node scripts/dist-check.mjs` exit 0 - `dist-check: 3 files, no root-relative reference`; `dist/index.html:12` `href="./favicon.svg"`, `:13` `src="./assets/index-DYnEKKJe.js"`, `:14` `href="./assets/index-DeI7K7GE.css"` (o hash do JS mudou por causa de `download.ts`).

Prova da URL pública (C35), rodada em `28b542f`, os dois comandos como escritos e só leitura: `gh run list --workflow deploy.yml --branch main --limit 1 --json conclusion --jq '.[0].conclusion' | grep -x success` exit 1 (`failed to determine base repo: no git remotes found`); `curl -sf "$(gh api repos/arthuurw/forzion-futmanager/pages --jq .html_url)" | grep -q "<title>Forzion FutManager</title>"` exit 1 (`gh: Not Found (HTTP 404)`). `git remote -v` vazio; `gh api repos/arthuurw/forzion-futmanager` → `{"message":"Not Found",...,"status":"404"}`.

Prova do stackdump (C36), rodada em `28b542f`: `test -z "$(git ls-files bash.exe.stackdump)" && git check-ignore -q bash.exe.stackdump` exit 0; `git check-ignore -v` → `.gitignore:8:*.stackdump	bash.exe.stackdump`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | «Exportar jogo» só com jogo de clube escolhido; some com `game: null` e com `userClubId: null` | `Exportar jogo aparece só com clube escolhido` passed @28b542f | `src/ui/Home.test.tsx:94` - `expect(screen.getByRole("button", { name: "Exportar jogo" })).toBeInTheDocument()`; `:98` (game null) e `:102` (`userClubId: null`) - `expect(screen.queryByRole("button", { name: "Exportar jogo" })).not.toBeInTheDocument()` | PASS |
| C2 | arquivo `forzion-futmanager-t2026-<apelido normalizado>.json`; «São Paulo» → `sao-paulo` | `Exportar jogo baixa o arquivo com o nome da temporada e do clube` passed; `nome do arquivo sem acento e com hífen` passed @28b542f | `src/ui/Home.test.tsx:113` - `expect(files).toHaveLength(1)`; `:115` - `expect(files[0]!.name).toBe(\`forzion-futmanager-t2026-${slug}.json\`)`; `src/engine/saveFile.test.ts:42` - `expect(saveFileName(2026, "São Paulo")).toBe("forzion-futmanager-t2026-sao-paulo.json")`. O `captureDownloads` (`src/ui/test-utils.ts:109-117`) lê o blob no `click()`, antes do `revokeObjectURL` adiado em `src/ui/download.ts:20` | PASS |
| C3 | envelope com exatamente `format`, `exportedAt`, `save`; valores certos | `envelope tem só format, exportedAt e save` passed @28b542f | `src/engine/saveFile.test.ts:35` - `expect(Object.keys(parsed).sort()).toEqual(["exportedAt", "format", "save"])`; `:36` - `toBe("forzion-futmanager-save")`; `:37` - `expect(parsed.exportedAt).toBe(ISO)`; `:38` - `expect(parsed.save).toEqual(game)` | PASS |
| C4 | «Importar jogo» com e sem save, `input type="file"` com `accept` contendo `.json` | `Importar jogo aparece com e sem save` passed @28b542f | `src/ui/Home.test.tsx:124` e `:130` - `getByRole("button", { name: "Importar jogo" })`; `:125` - `expect(input().type).toBe("file")`; `:126` - `expect(input().accept).toContain(".json")` | PASS |
| C5 | sem save: grava, `loadGame` igual, abre `squad`; liga encerrada abre `end` | `importar sem save grava e abre o jogo` passed @28b542f | `src/ui/Home.test.tsx:139` - `expect(useGame.getState().phase).toBe("squad")`; `:141` - `expect(await loadGame()).toEqual({ kind: "ok", state: game })`; `:151` - `expect(useGame.getState().phase).toBe("end")` | PASS |
| C6 | com save: confirmação, não grava antes de «Sim, substituir», depois grava; incompatível também confirma | `importar sobre save pede confirmação` passed; `importar sobre save incompatível pede confirmação` passed @28b542f | `src/ui/Home.test.tsx:162` - `findByText("Isso substitui o jogo salvo. Continuar?")`; `:163` - `expect(await loadGame()).toEqual({ kind: "ok", state: saved })`; `:166` - `toEqual({ kind: "ok", state: incoming })`; `:174` - mesma confirmação com `incompatibleVersion: 9` | PASS |
| C7 | «Cancelar» mantém o slot e volta ao menu com «Importar jogo» | `cancelar a importação mantém o save` passed @28b542f | `src/ui/Home.test.tsx:187` - `getByRole("button", { name: "Importar jogo" })`; `:189` - `expect(await loadGame()).toEqual({ kind: "ok", state: saved })` | PASS |
| C8 | envelope v7 → `ok` igual a `migrateSave(v7)`; v1 → `schemaVersion` 8 | `save antigo chega migrado` passed @28b542f | `src/engine/saveFile.test.ts:67` - `expect(r7.state).toEqual(expected.state)` com `expected = migrateSave(v7)` (`:66`); `:72` - `expect(r1.state.schemaVersion).toBe(8)` | PASS |
| C9 | `"isto não é json"` → `invalid_json`; tela mostra o aviso e o slot fica igual | `texto que não é JSON` passed; `arquivo inválido mostra o aviso e mantém o save` passed @28b542f | `src/engine/saveFile.test.ts:76` - `expect(decodeSaveFile("isto não é json")).toEqual({ kind: "invalid_json" })`; `src/ui/Home.test.tsx:205` → `:199` - `expect(await screen.findByText(message))` com `"Arquivo inválido: não é um jogo salvo"`; `:201` - `expect(await loadGame()).toEqual({ kind: "ok", state: saved })` | PASS |
| C10 | `not_a_save` para sem `format`, `format` errado, array, `null`, `GameState` cru; e (round 2) a tela mostra «Arquivo inválido: não é um jogo salvo» com o slot igual | `JSON que não é arquivo de save` passed; `JSON que não é arquivo de save mostra o aviso e mantém o save` passed @28b542f | `src/engine/saveFile.test.ts:83-87` - os 5 casos; `:89` - `expect(decodeSaveFile(text), ...).toEqual({ kind: "not_a_save" })`; tela: `src/ui/Home.test.tsx:209` - `refused(JSON.stringify({ format: "outro-jogo", save: seededGame(5) }), "Arquivo inválido: não é um jogo salvo")` → `:199` - `expect(await screen.findByText(message)).toBeInTheDocument()`; `:200` - `expect(useGame.getState().phase).toBe("home")`; `:201` - `expect(await loadGame()).toEqual({ kind: "ok", state: saved })`. A entrada chega a `not_a_save` pelo ramo `parsed.format !== SAVE_FILE_FORMAT` (`src/engine/saveFile.ts:70`) e vira o aviso em `src/store.ts:473` | PASS |
| C11 | `schemaVersion` 9 → `unsupported_version` com `version: 9`; tela mostra «... (9)», slot igual | `versão não suportada` passed; `versão não suportada mostra o aviso` passed @28b542f | `src/engine/saveFile.test.ts:93` - `.toEqual({ kind: "unsupported_version", version: 9 })`; `src/ui/Home.test.tsx:213` → `:199` com `"Versão do jogo salvo não suportada (9)"`; `:201` - slot `toEqual({ kind: "ok", state: saved })` | PASS |
| C12 | `malformed` para os 10 casos; `seededGame` intacto → `ok` | `save v8 sem a forma de um jogo` passed @28b542f | `src/engine/saveFile.test.ts:98-107` - os 10 casos; `:109` - `expect(breaks).toHaveLength(10)`; `:113` - `.toEqual({ kind: "malformed" })`; `:115` - `expect(decodeSaveFile(envelope(withClub())).kind).toBe("ok")` | PASS |
| C13 | arquivo `malformed` mostra «Arquivo corrompido...», slot igual | `arquivo corrompido mostra o aviso e mantém o save` passed @28b542f | `src/ui/Home.test.tsx:217` → `:199` com `"Arquivo corrompido: não foi possível ler o jogo"` (arquivo com `leagues: []`); `:201` - slot igual | PASS |
| C14 | gravação falhando: abre `squad` com o importado e o `Banner` avisa | `importar com gravação falhando abre o jogo e avisa` passed @28b542f | `src/store.test.ts:299` - `expect(useGame.getState().phase).toBe("squad")`; `:300` - `expect(useGame.getState().game).toEqual(game)`; `:303` - `expect(screen.getByText("Não foi possível salvar")).toBeInTheDocument()` | PASS |
| C15 | ida e volta `toEqual` para jogo novo, 20 rodadas e segunda temporada | `ida e volta devolve o mesmo jogo` passed @28b542f | `src/engine/saveFile.test.ts:54` - `expect(second.history.length).toBeGreaterThan(0)`; `:57` - `expect(r.kind).toBe("ok")`; `:58` - `expect(r.state).toEqual(g)` sobre `[fresh, midSeason, second]` | PASS |
| C16 | «Algo deu errado» + «Recarregar»; «Exportar jogo» só com jogo de clube | `tela de erro com Recarregar e Exportar jogo` passed @28b542f | `src/ui/ErrorBoundary.test.tsx:31` - `getByText("Algo deu errado")`; `:32` - botões `toEqual(["Exportar jogo", "Recarregar"])`; `:37` - sem jogo `toEqual(["Recarregar"])` | PASS |
| C17 | «Recarregar» chama `location.reload` uma vez | `Recarregar recarrega a página` passed @28b542f | `src/ui/ErrorBoundary.test.tsx:48` - `expect(reload).toHaveBeenCalledTimes(1)` | PASS |
| C18 | exportar na tela de erro baixa o mesmo nome e envelope | `Exportar jogo na tela de erro baixa o save` passed @28b542f | `src/ui/ErrorBoundary.test.tsx:64` - `expect(files[0]!.name).toBe(\`forzion-futmanager-t4-${slug}.json\`)`; `:66` - chaves `toEqual(["exportedAt", "format", "save"])`; `:67` - `toBe("forzion-futmanager-save")`; `:68` - `expect(parsed.save).toEqual(game)` | PASS |
| C19 | `console.error` recebe o `Error` lançado | `registra o erro no console` passed @28b542f | `src/ui/ErrorBoundary.test.tsx:74` - `expect(calls.some((args) => args.includes(boom))).toBe(true)` | PASS |
| C20 | o `App` envolve as telas no `ErrorBoundary` | `uma tela que quebra mostra a tela de erro` passed @28b542f | `src/app.test.tsx:446` - `expect(await screen.findByText("Algo deu errado")).toBeInTheDocument()` via `render(<App />)`; montagem real `src/App.tsx:22-24`, `src/main.tsx:8` | PASS |
| C21 | `persist` uma vez na primeira gravação; segunda não chama | `pede armazenamento persistente uma vez por sessão` passed @28b542f | `src/store.test.ts:311` - `expect(persist).toHaveBeenCalledTimes(1)`; `:315` - `expect(persist).toHaveBeenCalledTimes(1)` depois da segunda gravação | PASS |
| C22 | sem `persist` e com `persist` rejeitando: `saveStatus` `ok` sem erro | `sem persist ou com persist rejeitando segue sem erro` passed @28b542f | `src/store.test.ts:321` e `:330` - `expect(useGame.getState().saveStatus).toBe("ok")`; `:329` - `expect(persist).toHaveBeenCalledTimes(1)` | PASS |
| C23 | gravação que falha não chama `persist` | `gravação que falha não pede persistência` passed @28b542f | `src/store.test.ts:339` - `saveStatus` `toBe("failed")`; `:340` - `expect(persist).not.toHaveBeenCalled()`; `:345` - `toHaveBeenCalledTimes(1)` depois de gravar bem | PASS |
| C24 | menu com save: 5 botões na ordem; sem save: 3 | `ordem do menu` passed @28b542f | `src/ui/Home.test.tsx:223` - `.toEqual(["Continuar", "Exportar jogo", "Importar jogo", "Novo jogo", "Sobre"])`; `:227` - `.toEqual(["Importar jogo", "Novo jogo", "Sobre"])` | PASS |
| C25 | «Sobre» → `about`; nome, «Versão 1.0.0», aviso de ficção; `package.json` 1.0.0 | `mostra nome, versão e aviso de ficção` passed @28b542f | `src/ui/About.test.tsx:19` - `toBe("about")`; `:22` - heading `"Forzion FutManager"`; `:23` - `getByText("Versão 1.0.0")`; `:24` - aviso de ficção; `:26` - `expect(pkg.version).toBe("1.0.0")` | PASS |
| C26 | 5 músicas com título, autor, «CC0»; 2 fontes com OFL 1.1 | `créditos das músicas e das fontes` passed @28b542f | `src/ui/About.test.tsx:32-38` - tabela das 5; `:42` - `toContain(author)`; `:43` - `toContain("CC0")`; `:47` - `toContain("SIL Open Font License 1.1")` sobre as 2 fontes | PASS |
| C27 | aviso do save local | `aviso do save local` passed @28b542f | `src/ui/About.test.tsx:53` - `getByText("O jogo fica salvo só neste navegador. Use Exportar jogo para levá-lo a outro aparelho.")` | PASS |
| C28 | «Voltar» → `home` | `Voltar leva à tela inicial` passed @28b542f | `src/ui/About.test.tsx:61` - `expect(useGame.getState().phase).toBe("home")` | PASS |
| C29 | `check:layout` mede Sobre e a tela inicial com 5 botões a 400 × 700 e sai 0 | carried from 8a63d81 - `npm run check:layout` exit 0 (correção sem CSS/markup/script de layout) | `scripts/layout-check.mjs:294` - `wait("tela inicial com save", "__lc.enabled('Continuar') && __lc.enabled('Exportar jogo') && __lc.enabled('Sobre')")`; `:295` - `measure("homeSave")`; `:298` - `measure("about")`; `:142` - `if (m.scrollHeight > HEIGHT) out.push(...)`; saída do round 1 `ok homeSave ... ok about ...` | PASS |
| C30 | `index.html`: ícone, description, theme-color, og:title, og:description, `<noscript>` em PT | `index.html se apresenta` passed @28b542f | `src/launch.test.ts:9` - `toMatch(/href="\/?favicon\.svg"/)`; `:10` - `existsSync(.../public/favicon.svg)` `toBe(true)`; `:12-15` - description, theme-color, og:title, og:description; `:17-18` - `noscript` em PT | PASS |
| C31 | fase `about` fica no título: música de abertura e faixa do título | `a tela Sobre fica no título` passed @28b542f | `src/app.test.tsx:458` - `.title-audio` `not.toBeNull()`; `:459` - `.top-strip` `toBeNull()`; `:460` - `expect(trackStarts(backend.calls)).toEqual(["audio/music/abertura.mp3"])` | PASS |
| C32 | nenhum `src="/`, `href="/`, `url(/` no `dist/`; `index.html` com `./` | `npm run build && node scripts/dist-check.mjs` exit 0 @28b542f | `scripts/dist-check.mjs:13` - `ROOT_REF = /(?:src\|href)=["']\/(?!\/)\|url\(\s*["']?\/(?!\/)/g`; `:35-36` - exige `src="./assets/` e `href="./assets/...css"`; saída `dist-check: 3 files, no root-relative reference`; `dist/index.html:13` `src="./assets/index-DYnEKKJe.js"` | PASS |
| C33 | build roda `npm ci`, `npm test`, `npm run lint`, `npm run build` em ordem, sobe `dist`; gatilho push `main` + `workflow_dispatch` | `workflow roda test, lint e build antes de publicar` passed @28b542f | `src/launch.test.ts:37` - gatilho; `:41` - cada passo `toBeGreaterThan(-1)`; `:42` - `expect([...at].sort((a, b) => a - b)).toEqual(at)`; `:43` - `upload-pages-artifact@v\d+\n\s+with:\n\s+path: dist` | PASS |
| C34 | job de publicação com `needs: build` | `publicação depende do build` passed @28b542f | `src/launch.test.ts:49` - `expect(deploy).toMatch(/needs: build/)`; `:50` - `toContain("uses: actions/deploy-pages@")`; `.github/workflows/deploy.yml:37` `needs: build` | PASS |
| C35 | última execução em `main` `success`; URL do Pages `200` com o título | proof 1 exit 1 (`no git remotes found`); proof 2 exit 1 (`gh: Not Found (HTTP 404)`) @28b542f | no evidence - não há remoto, execução de workflow nem site Pages; `git remote -v` vazio; `gh api repos/arthuurw/forzion-futmanager` → 404. Bloqueio de ambiente (plano, pergunta aberta 2: criar o repositório foi negado pela permissão da sessão), não defeito de código; continua sem prova | FAIL |
| C36 | `bash.exe.stackdump` não versionado e ignorado | `test -z "$(git ls-files bash.exe.stackdump)" && git check-ignore -q bash.exe.stackdump` exit 0 @28b542f | `.gitignore:8` - `*.stackdump` (`git check-ignore -v` → `.gitignore:8:*.stackdump	bash.exe.stackdump`); `git ls-files bash.exe.stackdump` vazio | PASS |

## Coverage

verified at 28b542f para as linhas cuja autoridade a correção tocou (`resultado recusado -> aviso na tela`, a lacuna do round 1) e para as que dependem de C35; as demais carried from 8a63d81. Profile `light`: o join não é recalculado membro a membro; as linhas do `checks.md` foram lidas e conferidas contra as evidências acima.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| resultado da leitura do arquivo (5) | carried from 8a63d81; `DecodeResult` em `src/engine/saveFile.ts:13-18` | `ok` C8, C15 · `invalid_json` C9 · `not_a_save` C10 · `unsupported_version` C11 · `malformed` C12 | - |
| resultado recusado → aviso na tela inicial (4) | verified at 28b542f; AC 10-13 do plano; mapeamento em `src/store.ts:473-475`; agora com linha no `checks.md` | `invalid_json` C9 (`Home.test.tsx:205`) · `not_a_save` C10 (`Home.test.tsx:209`, `format: "outro-jogo"`) · `unsupported_version` C11 (`:213`) · `malformed` C13 (`:217`), todos por `refused` com aviso em `:199` e slot igual em `:201` | - |
| `GET` URL pública statuses (1) | verified at 28b542f | 200 C35 | 200 - C35 FAIL (sem remoto, `gh` 404) |
| falhas de forma do save v8 (10) | carried from 8a63d81; `saveFile.test.ts:98-107` | C12, tabela com os 10 | - |
| entradas `not_a_save` (5) | carried from 8a63d81; `saveFile.test.ts:83-87` | C10, os 5 | - |
| estado do slot ao importar (3) | carried from 8a63d81 | vazio C5 · com save C6 · incompatível C6 | - |
| botões do menu inicial (5) | verified at 28b542f (`Home.test.tsx:223`) | C24 com os 5 em ordem; C1, C4 | - |
| músicas creditadas (5) | carried from 8a63d81 | C26, tabela com as 5 | - |
| fontes creditadas (2) | carried from 8a63d81 | C26, as 2 | - |
| meta do `index.html` (6) | carried from 8a63d81 | C30, as 6 | - |
| passos do workflow (4) | carried from 8a63d81 | C33, os 4 em ordem | - |
| ramos de `phase` no `App` que `about` atravessa (2) | carried from 8a63d81; `src/App.tsx:40-41` | C31 tela/faixa e música | - |
| lugares que baixam o arquivo (2) | verified at 28b542f; os dois chamam `downloadSave` (`src/ui/download.ts:10`), que a correção tocou | tela inicial C2 · tela de erro C18, ambos passaram em 28b542f | - |
| doors (3) | verified at 28b542f | formato C3, C10 · publicação C33, C34, C35 · base relativa C32 | publicação ao vivo - C35 FAIL |
| startup config: `ErrorBoundary` montado (1 assembly) | carried from 8a63d81; `src/main.tsx:8`, `src/App.tsx:22-24` | `App` C20 | - |

## Test policy rows

carried from 8a63d81. Nenhuma seção `Test policy` no `checks.md`; o profile `light` não exige os veredictos.

## Faults injected

Profile `light`: a injeção de falhas não roda.

## Swept existing

- Plano `Observable`, tela inicial / loading («Carregando…» sem botões): carried from 8a63d81 - `src/ui/Home.test.tsx:21-22` (inalterado).
- Plano `Observable`, workflow / concurrency `concurrency: pages`: carried from 8a63d81 - `.github/workflows/deploy.yml:14-16`, `src/launch.test.ts:44`.
- `checks.md` Swept «concurrency: n/a», reescrita em `28b542f`: verified at 28b542f. A observação do round 1 (a linha citava `saving` como serializador de todas as gravações) foi resolvida: a linha agora diz que `saving` guarda só mercado e virada, e isso confere com o código - `src/store.ts:238-239` (`if (!game || saving) return false` no mercado) e `:437-438` (virada); `importFile` (`:471`) e `openImported` (`:252`) não consultam `saving`. O argumento que sustenta o `n/a` (importação só na tela inicial) é o que a linha agora apresenta.

## Other observations (não reprovam)

- `src/ui/download.ts:20` agora adia a revogação (`setTimeout(() => URL.revokeObjectURL(url), 0)`), resolvendo a observação do round 1. Nenhum teste afirma o momento da revogação: `captureDownloads` troca `URL.revokeObjectURL` por um `vi.fn()` (`src/ui/test-utils.ts:114`) e nunca o consulta. Nenhum check afirma isso, então não é lacuna.
- `captureDownloads` atribui `URL.createObjectURL`/`URL.revokeObjectURL` direto (`src/ui/test-utils.ts:109`, `:114`), e `vi.restoreAllMocks()` não desfaz uma atribuição; o `setTimeout` adiado pode disparar depois do fim do teste contra o `vi.fn()` que ficou. Hoje é inofensivo (suíte inteira verde).
- Cabeçalho do `checks.md` agora diz «2 open, of which 0 block (2 block go-live)», igual às 2 perguntas abertas do plano (`plan.md`, «Open questions»). A nota de texto desatualizado do round 1 foi resolvida.
- Os pontos do round 1 sobre door 1 (indentação de 2 espaços sem check) e `.about { overflow-y: auto }` continuam como estavam (carried from 8a63d81); a correção não tocou esses arquivos.

## Gate

`npm test` @28b542f - 472 passed, 0 failed (41 arquivos, exit 0)
