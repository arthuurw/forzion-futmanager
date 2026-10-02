# Jogar offline e instalar - checks

Profile: light
Plan: `.specs/features/offline-instalar/plan.md`

11 checks in 3 slices · 2 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`); navegador `npm run check:offline` (novo: build, `vite preview`, Chrome headless pelo DevTools Protocol); layout `npm run check:layout`.

Lições aplicadas: L-003 (pelo navegador de verdade onde o check fala de rede e cache), L-005 (estados e pedidos em tabela), L-008 (textos exatos), L-027 (a tela «Sobre» medida com a seção nova), L-029 (cada prova falha no código de antes), L-030 (nenhuma prova aqui prende comportamento que já existia: todas tratam de arquivos e código novos), L-031 (a prova de ausência afirma a pré-condição: o build de produção desligado em C3).

## Checks

### S1 - O service worker (build e comportamento) · 5 files · ~30 KB · ~8k

**C1** - `precacheList(dir)` sobre uma pasta com `index.html`, `sw.js`, `manifest.webmanifest`, `favicon.svg`, `icon-192.png`, `og-image.png`, `assets/app-x1.js`, `assets/app-x1.css`, `fonts/exo.woff2` e `audio/music/abertura.mp3` devolve, nesta ordem, `["./", "./assets/app-x1.css", "./assets/app-x1.js", "./favicon.svg", "./fonts/exo.woff2", "./icon-192.png", "./index.html", "./manifest.webmanifest"]` (sem `sw.js`, `og-image.png` nem `audio/`) (AC 1).
Proof: `npx vitest run src/pwa/build.test.ts -t "lista do cache"`

**C2** - `cacheVersion(dir, lista)` devolve 12 dígitos hex; a mesma pasta dá a mesma versão duas vezes; mudar 1 byte de `assets/app-x1.js` dá outra versão; e o `sw.js` gerado por `serviceWorkerSource(versão, lista)` contém o nome de cache `forzion-futmanager-<versão>` e a lista (AC 2).
Proof: `npx vitest run src/pwa/build.test.ts -t "versão do cache"`

**C3** - `registerServiceWorker({ production, navigator })`, em tabela (AC 3): produção com `serviceWorker` → uma chamada `register("./sw.js", { scope: "./" })`; fora de produção → nenhuma chamada; sem `serviceWorker` no navegador → nenhuma chamada e nenhum erro; `register` rejeitando → a promessa devolvida resolve sem erro e nada vai para `console.error`.
Proof: `npx vitest run src/pwa/register.test.ts -t "registro do service worker"`

**C4** - O `sw.js` gerado, rodado num contexto com `self`, `caches` e `fetch` falsos, no `install` guarda os 3 caminhos da lista no cache `forzion-futmanager-abc123def456` (AC 4).
Proof: `npx vitest run src/pwa/sw.test.ts -t "instala o cache da versão"`

**C5** - No `activate`, com os caches `forzion-futmanager-abc123def456`, `forzion-futmanager-velho000000` e `outro-site`, o `sw.js` apaga só `forzion-futmanager-velho000000` e chama `clients.claim()` (AC 5).
Proof: `npx vitest run src/pwa/sw.test.ts -t "ativa e apaga as versões velhas"`

**C6** - O `fetch` do `sw.js`, em tabela (AC 6): navegação com rede → a resposta da rede; navegação sem rede → o `./index.html` do cache; `./assets/app.js` no cache → a resposta do cache, sem chamar a rede; `./audio/music/abertura.mp3` fora do cache → a rede; `POST` e pedido de outro site → o SW não responde (`respondWith` não chamado).
Proof: `npx vitest run src/pwa/sw.test.ts -t "responde da rede ou do cache"`

**C7** - `npm run check:offline` sai 0: com o servidor no ar o jogo fica controlado pelo service worker e um jogo novo é gravado; com o servidor derrubado (porta livre), recarregar mostra o título com «Continuar», «Continuar» abre o elenco, «Jogar rodada» e «Pular para o fim» chegam à tela da rodada, sem a tela de erro; a última linha é «offline: o jogo abre e joga sem rede» (AC 7).
Proof: `npm run check:offline`

### S2 - Instalar · 6 files · ~40 KB · ~10k

**C8** - `public/manifest.webmanifest` tem `display: "standalone"`, `id: "./"`, `start_url: "./"`, `scope: "./"` e os ícones `icon-192.png` (`sizes` «192x192», `type` «image/png») e `icon-512.png` («512x512»), e os PNGs têm 192 × 192 e 512 × 512 no cabeçalho IHDR (AC 8).
Proof: `npx vitest run src/launch.test.ts -t "manifesto instalável"`

**C9** - `npm run check:offline` imprime «instalável: sem erros» porque `Page.getInstallabilityErrors` do Chrome devolve a lista vazia para o build servido, e sai 1 se a lista tiver algum erro (AC 9).
Proof: `npm run check:offline`

**C10** - A seção «Instalar» de «Sobre», em tabela (AC 10-12): com um `beforeinstallprompt` entregue → botão «Instalar o jogo»; tocá-lo chama `prompt()` uma vez e o botão some; com `display-mode: standalone` → «O jogo está instalado neste aparelho.» e nenhum botão; depois de `appinstalled` → o mesmo texto; sem nenhum dos dois → «No celular, use o menu do navegador: Adicionar à tela inicial. No iPhone: Compartilhar › Adicionar à Tela de Início.» e nenhum botão «Instalar o jogo».
Proof: `npx vitest run src/ui/About.test.tsx -t "seção instalar"`

### S3 - A tela cabe · 1 file · ~25 KB · ~6k

**C11** - `npm run check:layout` (seed 1) sai 0 com a tela `about` medida com a seção «Instalar» à vista (o texto do menu do navegador, sem convite) e termina em «layout: as 21 telas cabem em 400 × 700 px» (AC 13).
Proof: `npm run check:layout`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| arquivos fora da lista (3) | `sw.js` C1 · `og-image.png` C1 · `audio/` C1 | - |
| caminhos de registro (4) | produção C3 · fora de produção C3 · sem `serviceWorker` C3 · `register` rejeita C3 | - |
| eventos do SW (3) | `install` C4 · `activate` C5 · `fetch` C6 | - |
| pedidos ao SW (5) | navegação com rede C6 · navegação sem rede C6 · arquivo no cache C6 · arquivo fora do cache C6 · outro site ou outro método C6 | - |
| caches no activate (3) | a versão atual fica C5 · outra versão sai C5 · outro nome fica C5 | - |
| estados da seção «Instalar» (4) | convite C10 · instalado por `display-mode` C10 · instalado por `appinstalled` C10 · sem convite C10 | - |
| campos do manifesto (6) | `display` C8 · `id` C8 · `start_url` C8 · `scope` C8 · ícone 192 C8 · ícone 512 C8 | - |
| caminho sem rede (4) | título com «Continuar» C7 · elenco C7 · rodada C7 · sem tela de erro C7 | - |

- No check names a status code, route or response shape.
- C4-C6 provam o SW no próprio código gerado; C7 prova o mesmo SW no Chrome, com o servidor derrubado de verdade.

## Swept

- validation: n/a - nada recebido do usuário; o SW só responde ao próprio site (C6)
- failure modes: C3 (registro que falha), C6 (rede que falha)
- idempotency: C2 (mesmo build, mesma versão, mesmo cache)
- authorization: n/a - jogo local, sem contas
- concurrency: C5 (a aba aberta segue na versão com que abriu; o SW novo só ativa depois - door 2)
- data lifecycle: C5 (caches velhos apagados)
- dependency failure: C7 (servidor fora do ar)
- state transitions: C10 (convite → instalado)
- observability: n/a - sem log; `check:offline` imprime cada passo

## Handoff

- S1 = `src/pwa/build.ts`, `src/pwa/register.ts`, `src/main.tsx`, `vite.config.ts` (novos e pequenos, ~10 KB) + os testes novos (~15 KB) + `scripts/offline-check.mjs` (novo, ~8 KB) ≈ 33 KB / 4 ≈ 8k; S2 entra em `public/manifest.webmanifest`, `scripts/share-images.mjs` (8 KB), `src/launch.test.ts` (8 KB), `src/ui/About.tsx` (2 KB) e `About.test.tsx` (3 KB) a ~14k; S3 entra no `scripts/layout-check.mjs` (25 KB) a ~20k, abaixo do budget de 150k - one builder
