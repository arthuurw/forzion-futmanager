# Forzion FutManager

Manager de futebol em texto, no navegador, inspirado nos managers clássicos
dos anos 90. Você escolhe um clube, monta o elenco, mexe no mercado e nas
finanças, e acompanha as partidas minuto a minuto pela narração. Clubes,
jogadores e competições são fictícios.

**Jogue agora:** <https://arthuurw.github.io/forzion-futmanager/>

## O que tem no jogo

- **Quatro ligas com 20 clubes cada:** Série A, Série B, Liga Argentina e Liga
  Portuguesa. Há acesso e rebaixamento entre as séries do Brasil.
- **Duas copas:** a Copa Nacional (40 clubes brasileiros, mata-mata em jogo
  único com pênaltis) e a Copa Continental (16 clubes dos três países).
- **Partida ao vivo:** narração minuto a minuto, pausa, velocidade 1×, 2× ou
  4×, substituições, formação (4-4-2, 4-3-3, 3-5-2 ou 4-5-1) e postura
  (defensiva, equilibrada ou ofensiva).
- **Elenco e mercado:** compra, venda, propostas dos outros clubes, jogadores
  livres, promoção de juniores e renovação de contrato. O elenco tem de 18 a 30
  jogadores.
- **Finanças:** bilheteria, preço do ingresso, ampliação do estádio,
  empréstimos e salários. Os clubes da IA também compram, vendem e investem.
- **Várias temporadas:** jogadores envelhecem e evoluem, a diretoria cobra uma
  meta a cada temporada e pode demitir o técnico, e o histórico guarda cada
  campanha.
- **Som:** músicas CC0 nas telas de gestão e apito e torcida sintetizados
  durante a partida. Música e efeitos podem ser desligados.

## Seu jogo salvo

O jogo salva sozinho no IndexedDB do navegador, num único espaço de save. Isso
quer dizer que o save fica só naquele navegador, naquele aparelho.

Para levar a carreira a outro navegador ou aparelho, siga estes passos:

1. Na tela inicial, toque **Exportar jogo**. O navegador baixa um arquivo
   `forzion-futmanager-t<temporada>-<clube>.json`.
2. No outro navegador, abra o jogo e toque **Importar jogo**.
3. Escolha o arquivo. Se já houver um jogo salvo ali, confirme a troca.

Saves de versões antigas do jogo são atualizados ao importar.

## Rodar localmente

O projeto usa o Node.js 24, a mesma versão do CI.

```bash
npm ci
npm run dev
```

O Vite mostra o endereço local no terminal, normalmente
`http://localhost:5173/`.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o servidor de desenvolvimento. |
| `npm test` | Roda os testes com o Vitest. |
| `npm run lint` | Roda o ESLint em `src/`. |
| `npm run build` | Checa os tipos e gera o site estático em `dist/`. |
| `npm run preview` | Serve o `dist/` gerado. |
| `npm run check:layout` | Mede as telas a 400 × 700 px num Chrome real e falha se alguma rolar a página. |
| `npm run check:audio` | Renderiza os efeitos sonoros num Chrome real e falha se algum saturar ou chiar. |

Os dois `check:*` precisam do Google Chrome ou do Microsoft Edge instalado. Se
o navegador estiver em outro lugar, defina `CHROME_PATH`.

## Como o código está organizado

| Pasta | Conteúdo |
| --- | --- |
| `src/engine/` | O motor do jogo: geração de clubes, partida, mercado, finanças, copas, temporadas e migração de saves. TypeScript puro, sem React nem DOM. |
| `src/ui/` | As telas em React. |
| `src/audio/` | Música e efeitos sonoros (Web Audio). |
| `src/persistence/` | Leitura e gravação do save no IndexedDB. |
| `src/store.ts` | O estado da aplicação (Zustand), que liga as telas ao motor. |
| `scripts/` | Checagens de layout, de áudio e do build. |
| `.specs/` | Planos, checks e relatórios de verificação de cada funcionalidade, e as decisões do projeto em `.specs/STATE.md`. |

O motor é determinístico: todo sorteio usa um gerador de números aleatórios
com semente, nunca `Math.random`. Assim, o mesmo save e as mesmas escolhas dão
o mesmo resultado, o que torna os testes e os bugs reproduzíveis.

## Publicação

Cada push em `main` roda o workflow `.github/workflows/deploy.yml`: ele
instala as dependências, roda os testes, o lint e o build e, só se tudo
passar, publica o `dist/` no GitHub Pages. O build usa caminhos relativos, então
o site funciona em qualquer endereço.

## Créditos

- **Músicas:** Old Tricks, Hush Hamlet, Apple Cider e Aura Horizon, de Zane
  Little Music, e Summer Memories, de Juhani Junkala, todas do OpenGameArt sob
  CC0. Detalhes em
  [`public/audio/music/CREDITS.md`](public/audio/music/CREDITS.md).
- **Fontes:** Exo 2 e Barlow Semi Condensed, sob a SIL Open Font License 1.1.

O repositório ainda não tem um arquivo de licença.
