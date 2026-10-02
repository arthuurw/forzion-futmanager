# Jogar offline e instalar

## Problem

O jogo inteiro roda no navegador (motor, save no IndexedDB, sem servidor, AD-001), mas só abre com internet: sem rede, o navegador não carrega a página nem os scripts, mesmo com o jogo salvo ali. No celular, o manifesto abre o jogo como uma aba comum (`display: browser`) e não tem os ícones de 192 e 512 px que o Chrome pede para oferecer «Instalar app». O autor escolheu esta feature em 02/10/2026 entre seis candidatas, junto com caixa de notícias e nível de dificuldade; não há métrica, só a escolha.

Quando isto sair, depois da primeira visita com internet o jogo abre e se joga sem rede (título, «Continuar», elenco, rodada), e o Chrome oferece instalá-lo como app, em tela cheia, com ícone na tela inicial. A tela «Sobre» ganha a seção «Instalar» com o botão, quando o navegador permite, ou o caminho pelo menu, quando não.

## Flow

Reusa o build do Vite com `base: "./"` (AD-018), o manifesto e os ícones de `public/`, o gerador de imagens `scripts/share-images.mjs`, a infraestrutura do Chrome headless de `scripts/layout-check.mjs` e a tela «Sobre».

1. `npm run build` -> plugin do Vite `src/pwa/build.ts` (new, door 1) - depois do bundle, lista os arquivos de `dist/` que o jogo precisa (tudo, menos `audio/` e `og-image.png`) e escreve `dist/sw.js` com essa lista e uma versão = hash do conteúdo deles (door 2)
2. abertura do jogo no build de produção -> `src/main.tsx` (exists) -> `src/pwa/register.ts` (new) registra `./sw.js` com escopo `./`; falha de registro é ignorada
3. `sw.js` install -> guarda cada arquivo da lista no cache `forzion-futmanager-<versão>` (door 2)
4. `sw.js` activate -> apaga os outros caches `forzion-futmanager-*` e passa a controlar a página aberta
5. `sw.js` fetch -> navegação: rede primeiro, sem rede o `index.html` do cache; outro GET do próprio site: o cache, senão a rede; música não está no cache e, sem rede, não toca
6. evento `beforeinstallprompt` -> `src/pwa/register.ts` guarda o evento -> «Sobre» (`ui/About`, exists) mostra «Instalar o jogo», que chama `prompt()`
7. prova -> `scripts/offline-check.mjs` (new, `npm run check:offline`) abre o build no Chrome headless, começa um jogo, derruba o servidor e reabre: título, «Continuar», elenco e uma rodada sem rede; e pergunta ao Chrome se o app é instalável

## Impact

| Front | What changes |
| --- | --- |
| domain | new term: versão do cache (`forzion-futmanager-<hash>`) - muda a cada build cujo conteúdo muda; a página aberta continua na versão com que abriu até todas as abas do jogo fecharem (door 2) |
| domain | existing term: o manifesto passa de `display: browser` para `standalone` e ganha `id` e os ícones `icon-192.png` e `icon-512.png`; quem lê: o navegador e `src/launch.test.ts` (metadados) |
| domain | existing behaviour: a música, que hoje toca sempre que o som está ligado, não toca sem rede (nunca foi baixada para o cache); o resto do som (efeitos sintetizados) continua |
| stored data | nenhum dado do jogo muda: o save continua no IndexedDB (AD-003, AD-025). O navegador passa a guardar também o cache do service worker (~400 KB: scripts, estilos, fontes, ícones) |

## Relations

None - no entity; o service worker não lê nem grava o jogo salvo.

## Surface

None - nothing consumed outside. O `sw.js` é servido pelo próprio site e só responde ao próprio site; o manifesto é lido pelo navegador.

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| 1. endereço e escopo do service worker | `dist/sw.js`, registrado como `navigator.serviceWorker.register("./sw.js", { scope: "./" })` só no build de produção; gerado no build pelo plugin `src/pwa/build.ts`, sem dependência nova | `vite-plugin-pwa` (Workbox): dependência nova, nome e formato do arquivo decididos pelo plugin, e um SW instalado no aparelho do usuário só sai por outro SW no mesmo endereço; SW em `public/` escrito à mão: não sabe os nomes com hash dos arquivos do build |
| 2. cache e atualização | um cache `forzion-futmanager-<versão>`, versão = 12 primeiros hex do SHA-256 dos arquivos da lista; o SW novo espera as abas fecharem (sem `skipWaiting`); no activate apaga os outros `forzion-futmanager-*` e chama `clients.claim()`; navegação pela rede primeiro, o resto pelo cache primeiro | `skipWaiting`: a aba aberta, ainda no build velho, pediria arquivos que o cache novo não tem e o servidor já apagou; navegação pelo cache primeiro: quem tem rede só veria a versão nova na segunda visita |

- Os arquivos fora da lista (música, imagem de compartilhamento) e o texto da seção «Instalar» são reversíveis
- Nothing else in this change is hard to reverse

## Criteria

### S1: o jogo abre sem rede (P1)

**Acceptance Criteria**

1. WHEN `npm run build` termina THEN the system SHALL escrever `dist/sw.js` com a lista de todos os arquivos de `dist/` exceto `sw.js`, os de `audio/` e `og-image.png`, mais `./`, cada um como caminho relativo `./<arquivo>`.
2. The system SHALL dar ao cache o nome `forzion-futmanager-<versão>`, com a versão = 12 primeiros dígitos hex do SHA-256 dos caminhos e do conteúdo dos arquivos da lista, em ordem; o mesmo build gera a mesma versão, e um arquivo diferente gera outra.
3. WHEN o jogo abre no build de produção num navegador com service worker THEN the system SHALL registrar `./sw.js` com escopo `./`; no `npm run dev` e nos testes SHALL não registrar nada; IF o registro falha THEN the system SHALL seguir sem mensagem.
4. WHEN o service worker instala THEN the system SHALL guardar todos os arquivos da lista no cache da versão.
5. WHEN o service worker ativa THEN the system SHALL apagar todo cache `forzion-futmanager-*` de outra versão, manter caches de outros nomes e passar a controlar as páginas abertas.
6. WHEN a página pede uma navegação THEN the system SHALL tentar a rede e, sem resposta, devolver o `index.html` do cache; WHEN pede outro arquivo do próprio site que está no cache THEN SHALL devolver o do cache; WHEN pede um arquivo fora do cache (música) THEN SHALL ir à rede.
7. WHEN o jogo é reaberto sem rede depois de uma visita com rede THEN the system SHALL mostrar a tela de título com «Continuar», abrir o elenco do jogo salvo e jogar uma rodada até a tela da rodada, sem tela de erro.

**Independent test:** `npm run check:offline` abre o build, começa um jogo, derruba o servidor, reabre e joga uma rodada.

### S2: instalar como app (P1)

**Acceptance Criteria**

8. The system SHALL ter no manifesto `display: "standalone"`, `id: "./"`, `start_url: "./"`, `scope: "./"` e os ícones `icon-192.png` (192 × 192) e `icon-512.png` (512 × 512), PNG, com a marca do favicon, além dos de hoje.
9. WHEN o Chrome avalia o site servido pelo build THEN the system SHALL não ter nenhum erro de instalabilidade (`Page.getInstallabilityErrors` vazio).
10. WHILE o navegador entregou o evento `beforeinstallprompt` e o jogo não está instalado the system SHALL mostrar em «Sobre», na seção «Instalar», o botão «Instalar o jogo»; WHEN tocado THEN SHALL chamar `prompt()` do evento e esconder o botão.
11. WHILE o jogo roda instalado (`display-mode: standalone`) ou depois do evento `appinstalled` the system SHALL mostrar na seção «Instalar» «O jogo está instalado neste aparelho.», sem botão.
12. WHILE nenhum dos dois the system SHALL mostrar na seção «Instalar» «No celular, use o menu do navegador: Adicionar à tela inicial. No iPhone: Compartilhar › Adicionar à Tela de Início.».
13. The system SHALL caber a tela «Sobre» com a seção «Instalar» em 400 × 700 px sem rolagem de página (AD-010).

**Independent test:** em «Sobre», com o evento disparado pelo teste, «Instalar o jogo» chama `prompt()`; `npm run check:offline` mostra a lista de erros de instalabilidade vazia.

## Out of scope

| Excluded | Why |
| --- | --- |
| música sem rede | os 12 MB de música dobrariam o download da primeira visita; o jogo funciona mudo |
| aviso «nova versão disponível» | a versão nova entra sozinha quando as abas fecham (door 2); um aviso é outra tela |
| sincronizar o save entre aparelhos | sem backend (AD-001); exportar e importar continuam |
| ícone `maskable` | o ícone de hoje tem fundo cheio; o recorte do Android só arredonda os cantos |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| o que vai para o cache | tudo do build menos música e imagem de compartilhamento | ~400 KB contra ~12 MB; a imagem só serve a quem compartilha o link | n |
| quando a versão nova entra | ao reabrir depois de fechar todas as abas do jogo | o jogo usa uma aba por vez (AD-020); trocar arquivos no meio de uma partida ao vivo quebraria a aba aberta | n |
| onde fica o botão de instalar | na tela «Sobre» | o título já tem até 6 botões e cabe justo em 400 × 700 | n |
| decisões do autor | defaults recomendados sem rodada de perguntas | o autor pediu em 02/10/2026 «1, 2 e 3. siga até o fim» (preferência registrada desde 26/09/2026) | y |

**Open questions:** none - all resolved or logged above.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen «Sobre» seção «Instalar» | os três estados | AC 10, AC 11, AC 12 |
| screen «Sobre» | density | AC 13 |
| screen «Sobre» | loading state | n/a - o estado vem de eventos do navegador já guardados, sem espera |
| screen «Sobre» | error state | n/a - recusar o convite do navegador só esconde o botão (AC 10) |
| screen «Sobre» | empty state | AC 12 (sem convite do navegador) |
| screen «Sobre» | unauthorised state | n/a - jogo local, sem contas |
| jogo sem rede | o que abre e o que não | AC 7 (abre e joga), música fica muda (Impact) |
| jogo sem rede | erro de registro do SW | AC 3 (segue sem mensagem) |
| manifesto | forma | AC 8, AC 9 |
| build | o arquivo novo | AC 1, AC 2 |

## Sources

- Pedido do autor em 02/10/2026: «1, 2 e 3. siga até o fim. já coloque no state as outras. use a /tlc-spec-lean».
- `.specs/STATE.md` AD-001, AD-003, AD-010, AD-018, AD-020 - sem servidor, o save, a tela sem rolagem, o build em caminho relativo e a aba única que esta feature mantém.
