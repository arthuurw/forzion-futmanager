# Lançamento verification

**Verdict**: PASS
**Profile**: light
**Diff range**: b41e1d3..e2fbd88
**Round**: 3 - scoped
**Verifier**: independent sub-agent (author != verifier)

Round 2 (`b41e1d3..28b542f`, relatório em `e2fbd88`) foi FAIL só em C35: não havia remoto no GitHub, execução de workflow nem site Pages. Desde então nenhum código mudou: `git log --oneline 28b542f..HEAD` → só `e2fbd88 docs(specs): lancamento round 2 verification, AD-018, handoff`; `git diff --stat 28b542f..HEAD` → `.specs/STATE.md` e `.specs/features/lancamento/verification.md`. O que mudou foi o ambiente: `git remote -v` → `origin https://github.com/arthuurw/forzion-futmanager.git` (fetch/push); `gh api repos/arthuurw/forzion-futmanager` → `visibility: public`, `default_branch: main`; `git ls-remote origin main` → `e2fbd88644bbc0be40c4452e61d5732557fe8be3`, igual ao `HEAD` local; Pages com `build_type: workflow`.

Escopo desta rodada: o veredicto não-PASS (C35) julgado de novo com as duas provas como escritas no `checks.md`; todas as provas rodadas de novo em `e2fbd88` (uma invocação Vitest, build + dist-check, C36, `npm test`), exceto C29 (carried from 8a63d81, sem código/CSS mudado); citações carried from 28b542f (nenhum arquivo-fonte mudou, linhas inalteradas). Nenhuma escrita remota (nada de push, dispatch ou edição de repo/Pages). `git status --porcelain` vazio no início e no fim (o `dist/` gerado é ignorado).

## Binding sources

carried from 28b542f. Profile `light`: a etapa 1 não roda. Nenhuma interface ou tela mudou desde o round 2 (só docs), então nada a reabrir.

## Checks

verified at e2fbd88 (todas as provas rodadas de novo; C35 julgado de novo). Citações `file:line` carried from 28b542f - `git diff --stat 28b542f..HEAD` não toca nenhum arquivo citado.

Prova Vitest, uma invocação em `e2fbd88`: `npx vitest run src/ui/Home.test.tsx src/engine/saveFile.test.ts src/store.test.ts src/ui/ErrorBoundary.test.tsx src/app.test.tsx src/ui/About.test.tsx src/launch.test.ts -t "<alternação dos 37 nomes extraídos do checks.md, com . escapado>" --reporter=verbose` exit 0 - `Test Files 7 passed (7)`, `Tests 37 passed | 32 skipped (69)`; 37 linhas `✓`, nenhuma falha. Cada um dos 37 nomes conferido por sufixo exato (`> <nome>` no fim da linha `✓`): exatamente 1 linha para cada, incluindo os pares de prefixo comum (`JSON que não é arquivo de save` em `saveFile.test.ts` e `... mostra o aviso e mantém o save` em `Home.test.tsx`; `versão não suportada` e `... mostra o aviso`).

Prova de layout (C29): carried from 8a63d81. Nenhum código, CSS ou script de layout mudou em `8a63d81..e2fbd88` (round 2 confirmou `99b843e..28b542f` sem CSS/markup/script; `28b542f..e2fbd88` só docs). Resultado do round 1: `npm run check:layout` exit 0, `ok homeSave ...`, `ok about ...`, `layout: as 14 telas cabem em 400 × 700 px`.

Prova do dist (C32), rodada em `e2fbd88`: `npm run build && node scripts/dist-check.mjs` exit 0 - `dist-check: 3 files, no root-relative reference`. A regex citada no C32 (`scripts/dist-check.mjs:12`, fora da tabela porque contém `|`; o round 2 citava `:13` e `:35-36`, corrigido aqui para `:12` e `:32-33` pela leitura do arquivo em `e2fbd88`):

```js
const ROOT_REF = /(?:src|href)=["']\/(?!\/)|url\(\s*["']?\/(?!\/)/g;
```

Prova da URL pública (C35), rodada em `e2fbd88`, os dois comandos como escritos e só leitura:

- `gh run list --workflow deploy.yml --branch main --limit 1 --json conclusion --jq '.[0].conclusion' | grep -x success` → imprime `success`, exit 0. Execução `36503173097`, `event: push`, `headSha: e2fbd88...`, `createdAt: 2026-09-29T00:27:18Z`, `conclusion: success`.
- `curl -sf "$(gh api repos/arthuurw/forzion-futmanager/pages --jq .html_url)" | grep -q "<title>Forzion FutManager</title>"` exit 0. `html_url` = `https://arthuurw.github.io/forzion-futmanager/`; HTTP `200`; `grep -n "<title>"` no HTML servido → `6:    <title>Forzion FutManager</title>`. O HTML servido referencia os mesmos assets do build local (`./favicon.svg`, `./assets/index-DYnEKKJe.js`, `./assets/index-DeI7K7GE.css`), e `./assets/index-DYnEKKJe.js` responde `200` - a base relativa (door 3) funciona no subcaminho `/forzion-futmanager/`.

Prova do stackdump (C36), rodada em `e2fbd88`: `test -z "$(git ls-files bash.exe.stackdump)" && git check-ignore -q bash.exe.stackdump` exit 0; `git check-ignore -v` → `.gitignore:8:*.stackdump	bash.exe.stackdump`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | «Exportar jogo» só com jogo de clube escolhido; some com `game: null` e com `userClubId: null` | `Exportar jogo aparece só com clube escolhido` passed @e2fbd88 | `src/ui/Home.test.tsx:94` - `expect(screen.getByRole("button", { name: "Exportar jogo" })).toBeInTheDocument()`; `:98` (game null) e `:102` (`userClubId: null`) - `expect(screen.queryByRole("button", { name: "Exportar jogo" })).not.toBeInTheDocument()` | PASS |
| C2 | arquivo `forzion-futmanager-t2026-<apelido normalizado>.json`; «São Paulo» → `sao-paulo` | `Exportar jogo baixa o arquivo com o nome da temporada e do clube` passed; `nome do arquivo sem acento e com hífen` passed @e2fbd88 | `src/ui/Home.test.tsx:113` - `expect(files).toHaveLength(1)`; `:115` - `expect(files[0]!.name).toBe(\`forzion-futmanager-t2026-${slug}.json\`)`; `src/engine/saveFile.test.ts:42` - `expect(saveFileName(2026, "São Paulo")).toBe("forzion-futmanager-t2026-sao-paulo.json")`. O `captureDownloads` (`src/ui/test-utils.ts:109-117`) lê o blob no `click()`, antes do `revokeObjectURL` adiado em `src/ui/download.ts:20` | PASS |
| C3 | envelope com exatamente `format`, `exportedAt`, `save`; valores certos | `envelope tem só format, exportedAt e save` passed @e2fbd88 | `src/engine/saveFile.test.ts:35` - `expect(Object.keys(parsed).sort()).toEqual(["exportedAt", "format", "save"])`; `:36` - `toBe("forzion-futmanager-save")`; `:37` - `expect(parsed.exportedAt).toBe(ISO)`; `:38` - `expect(parsed.save).toEqual(game)` | PASS |
| C4 | «Importar jogo» com e sem save, `input type="file"` com `accept` contendo `.json` | `Importar jogo aparece com e sem save` passed @e2fbd88 | `src/ui/Home.test.tsx:124` e `:130` - `getByRole("button", { name: "Importar jogo" })`; `:125` - `expect(input().type).toBe("file")`; `:126` - `expect(input().accept).toContain(".json")` | PASS |
| C5 | sem save: grava, `loadGame` igual, abre `squad`; liga encerrada abre `end` | `importar sem save grava e abre o jogo` passed @e2fbd88 | `src/ui/Home.test.tsx:139` - `expect(useGame.getState().phase).toBe("squad")`; `:141` - `expect(await loadGame()).toEqual({ kind: "ok", state: game })`; `:151` - `expect(useGame.getState().phase).toBe("end")` | PASS |
| C6 | com save: confirmação, não grava antes de «Sim, substituir», depois grava; incompatível também confirma | `importar sobre save pede confirmação` passed; `importar sobre save incompatível pede confirmação` passed @e2fbd88 | `src/ui/Home.test.tsx:162` - `findByText("Isso substitui o jogo salvo. Continuar?")`; `:163` - `expect(await loadGame()).toEqual({ kind: "ok", state: saved })`; `:166` - `toEqual({ kind: "ok", state: incoming })`; `:174` - mesma confirmação com `incompatibleVersion: 9` | PASS |
| C7 | «Cancelar» mantém o slot e volta ao menu com «Importar jogo» | `cancelar a importação mantém o save` passed @e2fbd88 | `src/ui/Home.test.tsx:187` - `getByRole("button", { name: "Importar jogo" })`; `:189` - `expect(await loadGame()).toEqual({ kind: "ok", state: saved })` | PASS |
| C8 | envelope v7 → `ok` igual a `migrateSave(v7)`; v1 → `schemaVersion` 8 | `save antigo chega migrado` passed @e2fbd88 | `src/engine/saveFile.test.ts:67` - `expect(r7.state).toEqual(expected.state)` com `expected = migrateSave(v7)` (`:66`); `:72` - `expect(r1.state.schemaVersion).toBe(8)` | PASS |
| C9 | `"isto não é json"` → `invalid_json`; tela mostra o aviso e o slot fica igual | `texto que não é JSON` passed; `arquivo inválido mostra o aviso e mantém o save` passed @e2fbd88 | `src/engine/saveFile.test.ts:76` - `expect(decodeSaveFile("isto não é json")).toEqual({ kind: "invalid_json" })`; `src/ui/Home.test.tsx:205` → `:199` - `expect(await screen.findByText(message))` com `"Arquivo inválido: não é um jogo salvo"`; `:201` - `expect(await loadGame()).toEqual({ kind: "ok", state: saved })` | PASS |
| C10 | `not_a_save` para sem `format`, `format` errado, array, `null`, `GameState` cru; e (round 2) a tela mostra «Arquivo inválido: não é um jogo salvo» com o slot igual | `JSON que não é arquivo de save` passed; `JSON que não é arquivo de save mostra o aviso e mantém o save` passed @e2fbd88 | `src/engine/saveFile.test.ts:83-87` - os 5 casos; `:89` - `expect(decodeSaveFile(text), ...).toEqual({ kind: "not_a_save" })`; tela: `src/ui/Home.test.tsx:209` - `refused(JSON.stringify({ format: "outro-jogo", save: seededGame(5) }), "Arquivo inválido: não é um jogo salvo")` → `:199` - `expect(await screen.findByText(message)).toBeInTheDocument()`; `:200` - `expect(useGame.getState().phase).toBe("home")`; `:201` - `expect(await loadGame()).toEqual({ kind: "ok", state: saved })`. A entrada chega a `not_a_save` pelo ramo `parsed.format !== SAVE_FILE_FORMAT` (`src/engine/saveFile.ts:70`) e vira o aviso em `src/store.ts:473` | PASS |
| C11 | `schemaVersion` 9 → `unsupported_version` com `version: 9`; tela mostra «... (9)», slot igual | `versão não suportada` passed; `versão não suportada mostra o aviso` passed @e2fbd88 | `src/engine/saveFile.test.ts:93` - `.toEqual({ kind: "unsupported_version", version: 9 })`; `src/ui/Home.test.tsx:213` → `:199` com `"Versão do jogo salvo não suportada (9)"`; `:201` - slot `toEqual({ kind: "ok", state: saved })` | PASS |
| C12 | `malformed` para os 10 casos; `seededGame` intacto → `ok` | `save v8 sem a forma de um jogo` passed @e2fbd88 | `src/engine/saveFile.test.ts:98-107` - os 10 casos; `:109` - `expect(breaks).toHaveLength(10)`; `:113` - `.toEqual({ kind: "malformed" })`; `:115` - `expect(decodeSaveFile(envelope(withClub())).kind).toBe("ok")` | PASS |
| C13 | arquivo `malformed` mostra «Arquivo corrompido...», slot igual | `arquivo corrompido mostra o aviso e mantém o save` passed @e2fbd88 | `src/ui/Home.test.tsx:217` → `:199` com `"Arquivo corrompido: não foi possível ler o jogo"` (arquivo com `leagues: []`); `:201` - slot igual | PASS |
| C14 | gravação falhando: abre `squad` com o importado e o `Banner` avisa | `importar com gravação falhando abre o jogo e avisa` passed @e2fbd88 | `src/store.test.ts:299` - `expect(useGame.getState().phase).toBe("squad")`; `:300` - `expect(useGame.getState().game).toEqual(game)`; `:303` - `expect(screen.getByText("Não foi possível salvar")).toBeInTheDocument()` | PASS |
| C15 | ida e volta `toEqual` para jogo novo, 20 rodadas e segunda temporada | `ida e volta devolve o mesmo jogo` passed @e2fbd88 | `src/engine/saveFile.test.ts:54` - `expect(second.history.length).toBeGreaterThan(0)`; `:57` - `expect(r.kind).toBe("ok")`; `:58` - `expect(r.state).toEqual(g)` sobre `[fresh, midSeason, second]` | PASS |
| C16 | «Algo deu errado» + «Recarregar»; «Exportar jogo» só com jogo de clube | `tela de erro com Recarregar e Exportar jogo` passed @e2fbd88 | `src/ui/ErrorBoundary.test.tsx:31` - `getByText("Algo deu errado")`; `:32` - botões `toEqual(["Exportar jogo", "Recarregar"])`; `:37` - sem jogo `toEqual(["Recarregar"])` | PASS |
| C17 | «Recarregar» chama `location.reload` uma vez | `Recarregar recarrega a página` passed @e2fbd88 | `src/ui/ErrorBoundary.test.tsx:48` - `expect(reload).toHaveBeenCalledTimes(1)` | PASS |
| C18 | exportar na tela de erro baixa o mesmo nome e envelope | `Exportar jogo na tela de erro baixa o save` passed @e2fbd88 | `src/ui/ErrorBoundary.test.tsx:64` - `expect(files[0]!.name).toBe(\`forzion-futmanager-t4-${slug}.json\`)`; `:66` - chaves `toEqual(["exportedAt", "format", "save"])`; `:67` - `toBe("forzion-futmanager-save")`; `:68` - `expect(parsed.save).toEqual(game)` | PASS |
| C19 | `console.error` recebe o `Error` lançado | `registra o erro no console` passed @e2fbd88 | `src/ui/ErrorBoundary.test.tsx:74` - `expect(calls.some((args) => args.includes(boom))).toBe(true)` | PASS |
| C20 | o `App` envolve as telas no `ErrorBoundary` | `uma tela que quebra mostra a tela de erro` passed @e2fbd88 | `src/app.test.tsx:446` - `expect(await screen.findByText("Algo deu errado")).toBeInTheDocument()` via `render(<App />)`; montagem real `src/App.tsx:22-24`, `src/main.tsx:8` | PASS |
| C21 | `persist` uma vez na primeira gravação; segunda não chama | `pede armazenamento persistente uma vez por sessão` passed @e2fbd88 | `src/store.test.ts:311` - `expect(persist).toHaveBeenCalledTimes(1)`; `:315` - `expect(persist).toHaveBeenCalledTimes(1)` depois da segunda gravação | PASS |
| C22 | sem `persist` e com `persist` rejeitando: `saveStatus` `ok` sem erro | `sem persist ou com persist rejeitando segue sem erro` passed @e2fbd88 | `src/store.test.ts:321` e `:330` - `expect(useGame.getState().saveStatus).toBe("ok")`; `:329` - `expect(persist).toHaveBeenCalledTimes(1)` | PASS |
| C23 | gravação que falha não chama `persist` | `gravação que falha não pede persistência` passed @e2fbd88 | `src/store.test.ts:339` - `saveStatus` `toBe("failed")`; `:340` - `expect(persist).not.toHaveBeenCalled()`; `:345` - `toHaveBeenCalledTimes(1)` depois de gravar bem | PASS |
| C24 | menu com save: 5 botões na ordem; sem save: 3 | `ordem do menu` passed @e2fbd88 | `src/ui/Home.test.tsx:223` - `.toEqual(["Continuar", "Exportar jogo", "Importar jogo", "Novo jogo", "Sobre"])`; `:227` - `.toEqual(["Importar jogo", "Novo jogo", "Sobre"])` | PASS |
| C25 | «Sobre» → `about`; nome, «Versão 1.0.0», aviso de ficção; `package.json` 1.0.0 | `mostra nome, versão e aviso de ficção` passed @e2fbd88 | `src/ui/About.test.tsx:19` - `toBe("about")`; `:22` - heading `"Forzion FutManager"`; `:23` - `getByText("Versão 1.0.0")`; `:24` - aviso de ficção; `:26` - `expect(pkg.version).toBe("1.0.0")` | PASS |
| C26 | 5 músicas com título, autor, «CC0»; 2 fontes com OFL 1.1 | `créditos das músicas e das fontes` passed @e2fbd88 | `src/ui/About.test.tsx:32-38` - tabela das 5; `:42` - `toContain(author)`; `:43` - `toContain("CC0")`; `:47` - `toContain("SIL Open Font License 1.1")` sobre as 2 fontes | PASS |
| C27 | aviso do save local | `aviso do save local` passed @e2fbd88 | `src/ui/About.test.tsx:53` - `getByText("O jogo fica salvo só neste navegador. Use Exportar jogo para levá-lo a outro aparelho.")` | PASS |
| C28 | «Voltar» → `home` | `Voltar leva à tela inicial` passed @e2fbd88 | `src/ui/About.test.tsx:61` - `expect(useGame.getState().phase).toBe("home")` | PASS |
| C29 | `check:layout` mede Sobre e a tela inicial com 5 botões a 400 × 700 e sai 0 | carried from 8a63d81 - `npm run check:layout` exit 0 (nenhum código, CSS ou script mudou em `8a63d81..e2fbd88`) | `scripts/layout-check.mjs:294` - `wait("tela inicial com save", "__lc.enabled('Continuar') && __lc.enabled('Exportar jogo') && __lc.enabled('Sobre')")`; `:295` - `measure("homeSave")`; `:298` - `measure("about")`; `:142` - `if (m.scrollHeight > HEIGHT) out.push(...)`; saída do round 1 `ok homeSave ... ok about ...` | PASS |
| C30 | `index.html`: ícone, description, theme-color, og:title, og:description, `<noscript>` em PT | `index.html se apresenta` passed @e2fbd88 | `src/launch.test.ts:9` - `toMatch(/href="\/?favicon\.svg"/)`; `:10` - `existsSync(.../public/favicon.svg)` `toBe(true)`; `:12-15` - description, theme-color, og:title, og:description; `:17-18` - `noscript` em PT | PASS |
| C31 | fase `about` fica no título: música de abertura e faixa do título | `a tela Sobre fica no título` passed @e2fbd88 | `src/app.test.tsx:458` - `.title-audio` `not.toBeNull()`; `:459` - `.top-strip` `toBeNull()`; `:460` - `expect(trackStarts(backend.calls)).toEqual(["audio/music/abertura.mp3"])` | PASS |
| C32 | nenhum `src="/`, `href="/`, `url(/` no `dist/`; `index.html` com `./` | `npm run build && node scripts/dist-check.mjs` exit 0 @e2fbd88 | `scripts/dist-check.mjs:12` - `ROOT_REF`, a regex que casa `src=` ou `href=` seguido de aspas e `/` (não `//`), e `url(` com aspas opcionais e `/` (não `//`) - reproduzida literalmente fora da tabela, abaixo; `:32-33` - exige `src="./assets/` e `href="./assets/...css"`; saída `dist-check: 3 files, no root-relative reference`; `dist/index.html:12` `href="./favicon.svg"`, `:13` `src="./assets/index-DYnEKKJe.js"`, `:14` `href="./assets/index-DeI7K7GE.css"` | PASS |
| C33 | build roda `npm ci`, `npm test`, `npm run lint`, `npm run build` em ordem, sobe `dist`; gatilho push `main` + `workflow_dispatch` | `workflow roda test, lint e build antes de publicar` passed @e2fbd88 | `src/launch.test.ts:37` - gatilho; `:41` - cada passo `toBeGreaterThan(-1)`; `:42` - `expect([...at].sort((a, b) => a - b)).toEqual(at)`; `:43` - `upload-pages-artifact@v\d+\n\s+with:\n\s+path: dist` | PASS |
| C34 | job de publicação com `needs: build` | `publicação depende do build` passed @e2fbd88 | `src/launch.test.ts:49` - `expect(deploy).toMatch(/needs: build/)`; `:50` - `toContain("uses: actions/deploy-pages@")`; `.github/workflows/deploy.yml:37` `needs: build` | PASS |
| C35 | última execução em `main` `success`; URL do Pages `200` com o título | proof 1 exit 0 (imprime `success`); proof 2 exit 0 @e2fbd88 - os dois como escritos, só leitura | execução `36503173097` (`https://github.com/arthuurw/forzion-futmanager/actions/runs/36503173097`), `event: push`, `headSha: e2fbd88644bbc0be40c4452e61d5732557fe8be3` (= `HEAD` = `git ls-remote origin main`), `status: completed`, `conclusion: success`; jobs `build` success (passos `npm ci`, `npm test`, `npm run lint`, `npm run build`, `configure-pages`, `upload-pages-artifact` todos success) e `deploy` success (`deploy-pages` success). Pages: `gh api repos/arthuurw/forzion-futmanager/pages` → `html_url: https://arthuurw.github.io/forzion-futmanager/`, `build_type: workflow`; `curl -w %{http_code}` → `200`; linha casada no HTML servido: `6:    <title>Forzion FutManager</title>`. Estrutura do workflow: `.github/workflows/deploy.yml:4-7` gatilho `push` em `main` + `workflow_dispatch`; `:19` job `build`; `:27-30` `npm ci`/`npm test`/`npm run lint`/`npm run build`; `:32-34` `upload-pages-artifact` com `path: dist`; `:36-37` job `deploy` com `needs: build`; `:44` `actions/deploy-pages@v5` | PASS |
| C36 | `bash.exe.stackdump` não versionado e ignorado | `test -z "$(git ls-files bash.exe.stackdump)" && git check-ignore -q bash.exe.stackdump` exit 0 @e2fbd88 | `.gitignore:8` - `*.stackdump` (`git check-ignore -v` → `.gitignore:8:*.stackdump	bash.exe.stackdump`); `git ls-files bash.exe.stackdump` vazio | PASS |

## Coverage

verified at e2fbd88 para as linhas que dependem de C35 (`GET` URL pública, passos do workflow, doors); as demais carried from 28b542f. Profile `light`: o join não é recalculado membro a membro; as linhas do `checks.md` foram lidas e conferidas contra as evidências acima.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| resultado da leitura do arquivo (5) | carried from 28b542f; `DecodeResult` em `src/engine/saveFile.ts:13-18` | `ok` C8, C15 · `invalid_json` C9 · `not_a_save` C10 · `unsupported_version` C11 · `malformed` C12 | - |
| resultado recusado → aviso na tela inicial (4) | carried from 28b542f; mapeamento em `src/store.ts:473-475` | `invalid_json` C9 · `not_a_save` C10 · `unsupported_version` C11 · `malformed` C13, todos por `refused` (`Home.test.tsx:199`, `:201`) | - |
| `GET` URL pública statuses (1) | verified at e2fbd88; `curl -w %{http_code}` na URL do Pages | 200 C35 (`200`, título casado na linha 6) | - |
| falhas de forma do save v8 (10) | carried from 28b542f; `saveFile.test.ts:98-107` | C12, tabela com os 10 | - |
| entradas `not_a_save` (5) | carried from 28b542f; `saveFile.test.ts:83-87` | C10, os 5 | - |
| estado do slot ao importar (3) | carried from 28b542f | vazio C5 · com save C6 · incompatível C6 | - |
| botões do menu inicial (5) | carried from 28b542f (`Home.test.tsx:223`) | C24 com os 5 em ordem; C1, C4 | - |
| músicas creditadas (5) | carried from 28b542f | C26, tabela com as 5 | - |
| fontes creditadas (2) | carried from 28b542f | C26, as 2 | - |
| meta do `index.html` (6) | carried from 28b542f | C30, as 6 | - |
| passos do workflow (4) | verified at e2fbd88; `deploy.yml:27-30` e a execução `36503173097` (os 4 passos success, em ordem) | C33, os 4 em ordem | - |
| ramos de `phase` no `App` que `about` atravessa (2) | carried from 28b542f; `src/App.tsx:40-41` | C31 tela/faixa e música | - |
| lugares que baixam o arquivo (2) | carried from 28b542f; `src/ui/download.ts:10` | tela inicial C2 · tela de erro C18 | - |
| doors (3) | verified at e2fbd88 | formato C3, C10 · publicação C33, C34, C35 (execução `36503173097` success, Pages `200`) · base relativa C32 (e assets servidos `200` no subcaminho) | - |
| startup config: `ErrorBoundary` montado (1 assembly) | carried from 28b542f; `src/main.tsx:8`, `src/App.tsx:22-24` | `App` C20 | - |

## Test policy rows

carried from 28b542f. Nenhuma seção `Test policy` no `checks.md`; o profile `light` não exige os veredictos.

## Faults injected

Profile `light`: a injeção de falhas não roda.

## Swept existing

carried from 28b542f.

- Plano `Observable`, tela inicial / loading («Carregando…» sem botões): `src/ui/Home.test.tsx:21-22`.
- Plano `Observable`, workflow / concurrency `concurrency: pages`: `.github/workflows/deploy.yml:14-16`, `src/launch.test.ts:44`.
- `checks.md` Swept «concurrency: n/a»: confere com `src/store.ts:238-239` e `:437-438` (`saving` só em mercado e virada); `importFile` (`:471`) e `openImported` (`:252`) não consultam `saving`.

## Other observations (não reprovam)

- O cabeçalho do `checks.md` ainda diz «2 open, of which 0 block (2 block go-live)», mas as duas perguntas abertas de go-live (repositório e Pages) agora estão resolvidas no ambiente. É texto de planejamento desatualizado; não afeta nenhum check.
- As observações do round 2 sobre `captureDownloads` (`src/ui/test-utils.ts:109`, `:114`), door 1 (indentação sem check) e `.about { overflow-y: auto }` seguem como estavam (carried from 28b542f); nenhum arquivo foi tocado.
- A execução `36503173097` rodou no `headSha` `e2fbd88`, o mesmo `HEAD` verificado aqui, então o site publicado corresponde à árvore verificada.

## Gate

`npm test` @e2fbd88 - 472 passed, 0 failed (41 arquivos, exit 0)
