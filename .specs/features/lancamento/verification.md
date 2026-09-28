# Lançamento verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: b41e1d3..8a63d81
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Commits no intervalo: `8598ee0` docs(specs) plano e checks, `52790de` feat(engine) arquivo de save, `967fd8d` feat(ui) exportar/importar/Sobre/tela de erro, `79fff32` build(deploy) Pages com caminhos relativos, `8a63d81` docs(specs) repositório bloqueado. Conjunto verificado: todo check C1-C36 de `checks.md`. `git status --porcelain` vazio no início e no fim (o `dist/` gerado é ignorado). Desde `8598ee0`, o `checks.md` não mudou; o `plan.md` mudou só na linha `repo` do `Impact` e na pergunta aberta 2 (repositório não criado). O cabeçalho do `checks.md` ainda diz «1 open ... (1 blocks go-live)», e o plano agora tem 2 perguntas abertas que bloqueiam go-live - texto desatualizado, sem efeito nos checks.

Profile `light`: o recálculo de `Coverage`, os veredictos de `Test policy` e a injeção de falhas não rodam (ver as seções abaixo).

## Binding sources

Profile `light`: a etapa 1 (comparação com as fontes binding) não roda. AD-001, AD-003, AD-010 e AD-015 (`.specs/STATE.md`, tabela Decisions) foram lidas como contexto: o build é estático (`vite.config.ts:6` `base: "./"`, AD-001); o arquivo exportado carrega o documento versionado e a leitura passa por `migrateSave` (`src/engine/saveFile.ts:74`, AD-003); a tela Sobre e a tela inicial com save são medidas a 400 × 700 (C29, AD-010); nenhum «Brasfoot» no diff, o nome é «Forzion FutManager» em `index.html`, `About.tsx:21` e no nome do arquivo (AD-015). No diff, nenhum `Math.random`; `src/engine/saveFile.ts` importa só `./migrate` e `./types` (AD-002).

## Checks

Prova Vitest, uma invocação: `npx vitest run src/ui/Home.test.tsx src/engine/saveFile.test.ts src/store.test.ts src/ui/ErrorBoundary.test.tsx src/app.test.tsx src/ui/About.test.tsx src/launch.test.ts -t "<alternação dos 36 nomes>" --reporter=verbose` exit 0 - `Test Files 7 passed (7)`, `Tests 36 passed | 32 skipped (68)`; cada um dos 36 nomes aparece exatamente uma vez como linha `✓` (conferido nome a nome por sufixo exato). Todos os testes citados foram adicionados no diff (`saveFile.test.ts`, `ErrorBoundary.test.tsx`, `About.test.tsx`, `launch.test.ts` são arquivos novos; os blocos `exportar e importar (lancamento)`, `importar e armazenamento persistente (lancamento)` e `lançamento no app (lancamento)` são novos).

Prova de layout em HEAD: `npm run check:layout` exit 0 (build, `vite preview` na porta 4179, Chrome headless a 400 × 700); 14 linhas `ok`, entre elas `ok    homeSave   scrollHeight 700 scrollWidth 400 · Música 272,12-325,33 · Efeitos 329,12-384,33` e `ok    about      scrollHeight 700 scrollWidth 400 · Música 272,12-325,33 · Efeitos 329,12-384,33`; última linha `layout: as 14 telas cabem em 400 × 700 px`. Depois, `netstat -ano | grep :4179` só com `TIME_WAIT`, nenhum `LISTENING`.

Prova do dist: `npm run build && node scripts/dist-check.mjs` exit 0 - `dist-check: 3 files, no root-relative reference`; `dist/index.html:12-14` com `href="./favicon.svg"`, `src="./assets/index-CnsplQTV.js"`, `href="./assets/index-DeI7K7GE.css"`; o CSS usa `url(../fonts/...)` e o JS monta as músicas como `` `audio/music/${e}.mp3` `` (relativo).

Prova da URL pública (C35), os dois comandos como escritos, só leitura: `gh run list --workflow deploy.yml --branch main --limit 1 --json conclusion --jq '.[0].conclusion' | grep -x success` exit 1 (`failed to determine base repo: no git remotes found`); `curl -sf "$(gh api repos/arthuurw/forzion-futmanager/pages --jq .html_url)" | grep -q "<title>Forzion FutManager</title>"` exit 1 (`gh: Not Found (HTTP 404)`). `git remote -v` vazio.

Prova do stackdump (C36): `test -z "$(git ls-files bash.exe.stackdump)" && git check-ignore -q bash.exe.stackdump` exit 0; `git check-ignore -v` → `.gitignore:8:*.stackdump`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | «Exportar jogo» só com jogo de clube escolhido; some com `game: null` e com `userClubId: null` | `Exportar jogo aparece só com clube escolhido` passed | `src/ui/Home.test.tsx:94` - `expect(screen.getByRole("button", { name: "Exportar jogo" })).toBeInTheDocument()`; `:98` (game null) e `:102` (`userClubId: null`) - `expect(screen.queryByRole("button", { name: "Exportar jogo" })).not.toBeInTheDocument()` | PASS |
| C2 | arquivo `forzion-futmanager-t2026-<apelido normalizado>.json`; «São Paulo» → `sao-paulo` | `Exportar jogo baixa o arquivo com o nome da temporada e do clube` passed; `nome do arquivo sem acento e com hífen` passed | `src/ui/Home.test.tsx:113` - `expect(files).toHaveLength(1)`; `:115` - `expect(files[0]!.name).toBe(\`forzion-futmanager-t2026-${slug}.json\`)` (slug derivado em `:114` do nome do clube, sem literal); `src/engine/saveFile.test.ts:42` - `expect(saveFileName(2026, "São Paulo")).toBe("forzion-futmanager-t2026-sao-paulo.json")` | PASS |
| C3 | envelope com exatamente `format`, `exportedAt`, `save`; valores certos | `envelope tem só format, exportedAt e save` passed | `src/engine/saveFile.test.ts:35` - `expect(Object.keys(parsed).sort()).toEqual(["exportedAt", "format", "save"])`; `:36` - `expect(parsed.format).toBe("forzion-futmanager-save")`; `:37` - `expect(parsed.exportedAt).toBe(ISO)`; `:38` - `expect(parsed.save).toEqual(game)` | PASS |
| C4 | «Importar jogo» com e sem save, `input type="file"` com `accept` contendo `.json` | `Importar jogo aparece com e sem save` passed | `src/ui/Home.test.tsx:124` e `:130` - `expect(screen.getByRole("button", { name: "Importar jogo" })).toBeInTheDocument()`; `:125` - `expect(input().type).toBe("file")`; `:126` - `expect(input().accept).toContain(".json")` | PASS |
| C5 | sem save: grava, `loadGame` igual, abre `squad`; liga encerrada abre `end` | `importar sem save grava e abre o jogo` passed | `src/ui/Home.test.tsx:139` - `expect(useGame.getState().phase).toBe("squad")`; `:141` - `expect(await loadGame()).toEqual({ kind: "ok", state: game })`; `:151` - `expect(useGame.getState().phase).toBe("end")` | PASS |
| C6 | com save: confirmação, não grava antes de «Sim, substituir», depois grava; incompatível também confirma | `importar sobre save pede confirmação` passed; `importar sobre save incompatível pede confirmação` passed | `src/ui/Home.test.tsx:162` - `expect(await screen.findByText("Isso substitui o jogo salvo. Continuar?")).toBeInTheDocument()`; `:163` - `expect(await loadGame()).toEqual({ kind: "ok", state: saved })`; `:166` - `expect(await loadGame()).toEqual({ kind: "ok", state: incoming })`; `:174` - mesma confirmação com `incompatibleVersion: 9` | PASS |
| C7 | «Cancelar» mantém o slot e volta ao menu com «Importar jogo» | `cancelar a importação mantém o save` passed | `src/ui/Home.test.tsx:187` - `expect(screen.getByRole("button", { name: "Importar jogo" })).toBeInTheDocument()`; `:189` - `expect(await loadGame()).toEqual({ kind: "ok", state: saved })` | PASS |
| C8 | envelope v7 → `ok` igual a `migrateSave(v7)`; v1 → `schemaVersion` 8 | `save antigo chega migrado` passed | `src/engine/saveFile.test.ts:67` - `expect(r7.state).toEqual(expected.state)` com `expected = migrateSave(v7)` (`:66`), e `else throw` em `:68`; `:72` - `expect(r1.state.schemaVersion).toBe(8)` | PASS |
| C9 | `"isto não é json"` → `invalid_json`; tela mostra o aviso e o slot fica igual | `texto que não é JSON` passed; `arquivo inválido mostra o aviso e mantém o save` passed | `src/engine/saveFile.test.ts:76` - `expect(decodeSaveFile("isto não é json")).toEqual({ kind: "invalid_json" })`; `src/ui/Home.test.tsx:205` → `:199` - `expect(await screen.findByText(message))` com `"Arquivo inválido: não é um jogo salvo"`; `:201` - `expect(await loadGame()).toEqual({ kind: "ok", state: saved })` | PASS |
| C10 | `not_a_save` para sem `format`, `format` errado, array, `null`, `GameState` cru | `JSON que não é arquivo de save` passed | `src/engine/saveFile.test.ts:83-87` - os 5 casos; `:89` - `for (const text of cases) expect(decodeSaveFile(text), ...).toEqual({ kind: "not_a_save" })` | PASS |
| C11 | `schemaVersion` 9 → `unsupported_version` com `version: 9`; tela mostra «... (9)», slot igual | `versão não suportada` passed; `versão não suportada mostra o aviso` passed | `src/engine/saveFile.test.ts:93` - `.toEqual({ kind: "unsupported_version", version: 9 })`; `src/ui/Home.test.tsx:209` → `:199` com `"Versão do jogo salvo não suportada (9)"`; `:201` - slot `toEqual({ kind: "ok", state: saved })` | PASS |
| C12 | `malformed` para os 10 casos; `seededGame` intacto → `ok` | `save v8 sem a forma de um jogo` passed | `src/engine/saveFile.test.ts:98-107` - os 10 casos nomeados; `:109` - `expect(breaks).toHaveLength(10)`; `:113` - `expect(decodeSaveFile(envelope(s)), name).toEqual({ kind: "malformed" })`; `:115` - `expect(decodeSaveFile(envelope(withClub())).kind).toBe("ok")` | PASS |
| C13 | arquivo `malformed` mostra «Arquivo corrompido...», slot igual | `arquivo corrompido mostra o aviso e mantém o save` passed | `src/ui/Home.test.tsx:213` → `:199` com `"Arquivo corrompido: não foi possível ler o jogo"` (arquivo com `leagues: []`); `:201` - slot igual | PASS |
| C14 | gravação falhando: abre `squad` com o importado e o `Banner` avisa | `importar com gravação falhando abre o jogo e avisa` passed | `src/store.test.ts:299` - `expect(useGame.getState().phase).toBe("squad")`; `:300` - `expect(useGame.getState().game).toEqual(game)`; `:303` - `expect(screen.getByText("Não foi possível salvar")).toBeInTheDocument()` | PASS |
| C15 | ida e volta `toEqual` para jogo novo, 20 rodadas e segunda temporada | `ida e volta devolve o mesmo jogo` passed | `src/engine/saveFile.test.ts:54` - `expect(second.history.length).toBeGreaterThan(0)`; `:57` - `expect(r.kind).toBe("ok")`; `:58` - `expect(r.state).toEqual(g)` sobre `[fresh, midSeason, second]` (`:55`, `midSeason = played(withClub(5), 20)` em `:49`) | PASS |
| C16 | «Algo deu errado» + «Recarregar»; «Exportar jogo» só com jogo de clube | `tela de erro com Recarregar e Exportar jogo` passed | `src/ui/ErrorBoundary.test.tsx:31` - `expect(screen.getByText("Algo deu errado")).toBeInTheDocument()`; `:32` - botões `toEqual(["Exportar jogo", "Recarregar"])`; `:37` - sem jogo `toEqual(["Recarregar"])` | PASS |
| C17 | «Recarregar» chama `location.reload` uma vez | `Recarregar recarrega a página` passed | `src/ui/ErrorBoundary.test.tsx:48` - `expect(reload).toHaveBeenCalledTimes(1)` | PASS |
| C18 | exportar na tela de erro baixa o mesmo nome e envelope | `Exportar jogo na tela de erro baixa o save` passed | `src/ui/ErrorBoundary.test.tsx:64` - `expect(files[0]!.name).toBe(\`forzion-futmanager-t4-${slug}.json\`)`; `:66` - chaves `toEqual(["exportedAt", "format", "save"])`; `:67` - `format` `toBe("forzion-futmanager-save")`; `:68` - `expect(parsed.save).toEqual(game)` | PASS |
| C19 | `console.error` recebe o `Error` lançado | `registra o erro no console` passed | `src/ui/ErrorBoundary.test.tsx:74` - `expect(calls.some((args) => args.includes(boom))).toBe(true)` | PASS |
| C20 | o `App` envolve as telas no `ErrorBoundary` | `uma tela que quebra mostra a tela de erro` passed | `src/app.test.tsx:446` - `expect(await screen.findByText("Algo deu errado")).toBeInTheDocument()` (via `render(<App />)`); montagem real: `src/App.tsx:22-24` `<ErrorBoundary><Screens /></ErrorBoundary>` e `src/main.tsx:8` `<App />` | PASS |
| C21 | `persist` uma vez na primeira gravação; segunda gravação não chama | `pede armazenamento persistente uma vez por sessão` passed | `src/store.test.ts:311` - `expect(persist).toHaveBeenCalledTimes(1)`; `:314` - `saveGame` chamado `>= 2`; `:315` - `expect(persist).toHaveBeenCalledTimes(1)` | PASS |
| C22 | sem `persist` e com `persist` rejeitando: `saveStatus` `ok` sem erro | `sem persist ou com persist rejeitando segue sem erro` passed | `src/store.test.ts:321` e `:330` - `expect(useGame.getState().saveStatus).toBe("ok")`; `:329` - `expect(persist).toHaveBeenCalledTimes(1)` (o rejeitado foi chamado) | PASS |
| C23 | gravação que falha não chama `persist` | `gravação que falha não pede persistência` passed | `src/store.test.ts:339` - `saveStatus` `toBe("failed")`; `:340` - `expect(persist).not.toHaveBeenCalled()`; `:345` - depois de gravar bem, `toHaveBeenCalledTimes(1)` | PASS |
| C24 | menu com save: 5 botões na ordem; sem save: 3 | `ordem do menu` passed | `src/ui/Home.test.tsx:219` - `.toEqual(["Continuar", "Exportar jogo", "Importar jogo", "Novo jogo", "Sobre"])`; `:223` - `.toEqual(["Importar jogo", "Novo jogo", "Sobre"])` | PASS |
| C25 | «Sobre» → `about`; nome, «Versão 1.0.0», aviso de ficção; `package.json` 1.0.0 | `mostra nome, versão e aviso de ficção` passed | `src/ui/About.test.tsx:19` - `expect(useGame.getState().phase).toBe("about")`; `:22` - heading `"Forzion FutManager"`; `:23` - `getByText("Versão 1.0.0")`; `:24` - `getByText("Clubes, jogadores e competições são fictícios.")`; `:26` - `expect(pkg.version).toBe("1.0.0")` | PASS |
| C26 | 5 músicas com título, autor, «CC0»; 2 fontes com OFL 1.1 | `créditos das músicas e das fontes` passed | `src/ui/About.test.tsx:32-38` - tabela das 5; `:42` - `expect(line, title).toContain(author)`; `:43` - `toContain("CC0")`; `:47` - `expect(line, font).toContain("SIL Open Font License 1.1")` sobre `["Exo 2", "Barlow Semi Condensed"]` | PASS |
| C27 | aviso do save local | `aviso do save local` passed | `src/ui/About.test.tsx:53` - `getByText("O jogo fica salvo só neste navegador. Use Exportar jogo para levá-lo a outro aparelho.")` | PASS |
| C28 | «Voltar» → `home` | `Voltar leva à tela inicial` passed | `src/ui/About.test.tsx:61` - `expect(useGame.getState().phase).toBe("home")` | PASS |
| C29 | `check:layout` mede Sobre e a tela inicial com 5 botões a 400 × 700 e sai 0 | `npm run check:layout` exit 0 | `scripts/layout-check.mjs:294` - `wait("tela inicial com save", "__lc.enabled('Continuar') && __lc.enabled('Exportar jogo') && __lc.enabled('Sobre')")`; `:295` - `measure("homeSave")`; `:298` - `measure("about")`; `:142` - `if (m.scrollHeight > HEIGHT) out.push(...)`; `:325` - `homeSave`, `about` na lista obrigatória; saída `ok homeSave ... ok about ...` | PASS |
| C30 | `index.html`: ícone `favicon.svg` (existe), description, theme-color, og:title, og:description, `<noscript>` em PT | `index.html se apresenta` passed | `src/launch.test.ts:9` - `expect(icon).toMatch(/href="\/?favicon\.svg"/)`; `:10` - `existsSync(... "../public/favicon.svg")` `toBe(true)`; `:12` description; `:13` theme-color; `:14` og:title; `:15` og:description; `:17-18` - `noscript` `toContain("JavaScript")` e `toMatch(/precisa\|ative/)` | PASS |
| C31 | fase `about` fica no título: música de abertura e faixa do título | `a tela Sobre fica no título` passed | `src/app.test.tsx:458` - `querySelector(".title-audio")` `not.toBeNull()`; `:459` - `querySelector(".top-strip")` `toBeNull()`; `:460` - `expect(trackStarts(backend.calls)).toEqual(["audio/music/abertura.mp3"])` | PASS |
| C32 | nenhum `src="/`, `href="/`, `url(/` no `dist/`; `index.html` com `./` | `npm run build && node scripts/dist-check.mjs` exit 0 | `scripts/dist-check.mjs:13` - `ROOT_REF = /(?:src\|href)=["']\/(?!\/)\|url\(\s*["']?\/(?!\/)/g`; `:35-36` - exige `src="./assets/` e `href="./assets/...css"`; saída `dist-check: 3 files, no root-relative reference`; `dist/index.html:13` `src="./assets/index-CnsplQTV.js"` | PASS |
| C33 | build roda `npm ci`, `npm test`, `npm run lint`, `npm run build` em ordem, sobe `dist`; gatilho push `main` + `workflow_dispatch` | `workflow roda test, lint e build antes de publicar` passed | `src/launch.test.ts:37` - `toMatch(/on:\n\s+push:\n\s+branches: \[main\]\n\s+workflow_dispatch:/)`; `:41` - cada passo `toBeGreaterThan(-1)`; `:42` - `expect([...at].sort((a, b) => a - b)).toEqual(at)`; `:43` - `upload-pages-artifact@v\d+\n\s+with:\n\s+path: dist`; arquivo real `.github/workflows/deploy.yml:27-34` | PASS |
| C34 | job de publicação com `needs: build` | `publicação depende do build` passed | `src/launch.test.ts:49` - `expect(deploy).toMatch(/needs: build/)`; `:50` - `toContain("uses: actions/deploy-pages@")`; `.github/workflows/deploy.yml:37` `needs: build` | PASS |
| C35 | última execução em `main` `success`; URL do Pages `200` com o título | proof 1 exit 1 (`no git remotes found`); proof 2 exit 1 (`gh: Not Found (HTTP 404)`) | no evidence - não há remoto, execução de workflow nem site Pages; `git remote -v` vazio; `gh api repos/arthuurw/forzion-futmanager/pages` → `{"message":"Not Found",...,"status":"404"}`. Bloqueio de ambiente registrado no plano (pergunta aberta 2), não defeito de código | FAIL |
| C36 | `bash.exe.stackdump` não versionado e ignorado | `test -z "$(git ls-files bash.exe.stackdump)" && git check-ignore -q bash.exe.stackdump` exit 0 | `.gitignore:8` - `*.stackdump` (`git check-ignore -v` → `.gitignore:8:*.stackdump	bash.exe.stackdump`); `git ls-files bash.exe.stackdump` vazio; removido no diff (`bash.exe.stackdump | 28 ----`) | PASS |

## Coverage

Profile `light`: o join não foi recalculado membro a membro a partir das autoridades; as linhas do `checks.md` foram lidas e conferidas contra as evidências acima. A busca por conjuntos que o plano nomeia sem linha achou um:

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| resultado da leitura do arquivo (5) | lido do `checks.md`; `DecodeResult` em `src/engine/saveFile.ts:13-18` | `ok` C8, C15 · `invalid_json` C9 · `not_a_save` C10 · `unsupported_version` C11 · `malformed` C12 | - |
| resultado recusado → aviso na tela inicial (4) - sem linha no `checks.md`; nomeado nos AC 10-13 e no Flow passo 2 («erro vira aviso na tela inicial») | AC 10-13 do plano; mapeamento em `src/store.ts:473-475` | `invalid_json` C9 · `unsupported_version` C11 · `malformed` C13 | `not_a_save` (AC 11: aviso «Arquivo inválido: não é um jogo salvo» e slot igual) - nenhum teste de tela ou de store importa um JSON sem `format`; `rg "outro-jogo\|not_a_save\|Arquivo inválido" src --glob "*.test.*"` só acha `saveFile.test.ts:84,89` (motor) e `Home.test.tsx:205` (texto não JSON) |
| `GET` URL pública statuses (1) | lido | 200 C35 | 200 - C35 FAIL (sem remoto) |
| falhas de forma do save v8 (10) | lido; `saveFile.test.ts:98-107` | C12, tabela com os 10 | - |
| entradas `not_a_save` (5) | lido; `saveFile.test.ts:83-87` | C10, os 5 | - |
| estado do slot ao importar (3) | lido | vazio C5 · com save C6 · incompatível C6 | - |
| botões do menu inicial (5) | lido | C24 com os 5 em ordem; C1, C4 | - |
| músicas creditadas (5) | lido | C26, tabela com as 5 | - |
| fontes creditadas (2) | lido | C26, as 2 | - |
| meta do `index.html` (6) | lido | C30, as 6 | - |
| passos do workflow (4) | lido | C33, os 4 em ordem | - |
| ramos de `phase` no `App` que `about` atravessa (2) | lido; `src/App.tsx:40-41` e `src/audio/music.ts` `about: "abertura"` | C31 tela/faixa e música | - |
| lugares que baixam o arquivo (2) | lido | tela inicial C2 · tela de erro C18 | - |
| doors (3) | lido | formato C3, C10 · publicação C33, C34, C35 · base relativa C32 | publicação ao vivo - C35 FAIL |
| startup config: `ErrorBoundary` montado (1 assembly) | `src/main.tsx:8` `<App />`; `src/App.tsx:22-24` | `App` C20 | - |

## Test policy rows

Nenhuma seção `Test policy` no `checks.md`; e o profile `light` não exige os veredictos.

## Faults injected

Profile `light`: a injeção de falhas não roda.

## Swept existing

- Plano `Observable`, «tela inicial / loading: existing - «Carregando…» sem botões (Home.test)»: confirmado. `src/ui/Home.tsx` mantém `phase === "loading"` como o primeiro ramo do ternário, antes da confirmação e do menu; `src/ui/Home.test.tsx:21-22` - `getByText("Carregando…")` e `queryAllByRole("button")` `toHaveLength(0)`.
- Plano `Observable`, «workflow / concurrency: existing no GitHub - `concurrency: pages`»: confirmado. `.github/workflows/deploy.yml:14-16` `concurrency: group: pages, cancel-in-progress: false`; `src/launch.test.ts:44` - `toMatch(/concurrency:\n\s+group: pages/)`.
- `checks.md` Swept «concurrency: n/a - `saving` do store já serializa gravações»: a linha é `n/a` (política aprovada), mas a restrição que ela cita só existe em parte. `saving` protege só a gravação do mercado (`src/store.ts:238-247`) e a virada de temporada (`:437-442`); `chooseClub`, `finishLive`, `openImported` chamam `persist` sem consultar `saving`. O argumento que sobra (importação só na tela inicial, sem partida em andamento) é o que de fato segura. Observação, não reprova.

## Other observations (não reprovam)

- Door 1 fixa «JSON com indentação de 2 espaços»; o código faz isso (`src/engine/saveFile.ts:23` `JSON.stringify(file, null, 2)`), mas nenhum check o afirma. A leitura aceita qualquer JSON, então não afeta compatibilidade.
- C2 e C18 (tela) derivam o slug esperado do nome do clube com a mesma normalização da produção (`Home.test.tsx:114`, `ErrorBoundary.test.tsx:63`); o literal com acento está só no teste do motor (`saveFile.test.ts:42`).
- `src/ui/download.ts:18-19` chama `URL.revokeObjectURL(url)` logo depois de `link.click()`; em alguns navegadores isso pode cancelar o download. Nenhum check cobre o download real no navegador.
- A tela Sobre tem `.about { overflow-y: auto }` (`src/styles.css`); o `check:layout` mede só o `scrollHeight` da página, então uma rolagem interna do painel que escondesse «Voltar» não seria acusada. O AC 27 pede «sem rolagem de página», que é o que foi medido.
- As tags de action do workflow existem (consultas GET só de leitura): `actions/checkout@v7`, `actions/setup-node@v7`, `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`.

## Gate

`npm test` - 471 passed, 0 failed (41 arquivos, exit 0)
