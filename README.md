# Forzion FutManager

Manager de futebol em texto, no navegador, inspirado nos managers clássicos
dos anos 90. Você escolhe um clube, monta o elenco, mexe no mercado e nas
finanças, e acompanha as partidas minuto a minuto pela narração. Clubes,
jogadores e competições são fictícios.

**Jogue agora:** <https://arthuurw.github.io/forzion.tech-futmanager/>

## O que tem no jogo

- **Quatro ligas com 20 clubes cada:** Série A, Série B, Liga Argentina e Liga
  Portuguesa. Há acesso e rebaixamento entre as séries do Brasil.
- **Duas copas:** a Copa Nacional (40 clubes brasileiros, mata-mata em jogo
  único com pênaltis) e a Copa Continental (16 clubes dos três países).
- **Partida ao vivo:** narração minuto a minuto, pausa, velocidade 1×, 2× ou
  4×, substituições, formação (4-4-2, 4-3-3, 3-5-2 ou 4-5-1) e postura
  (defensiva, equilibrada ou ofensiva).
- **Elenco e mercado:** compra, venda, propostas dos outros clubes, jogadores
  livres, promoção de juniores, renovação de contrato e empréstimos até o fim da
  temporada, para os dois lados. O elenco tem de 18 a 30 jogadores.
- **Finanças:** bilheteria, preço do ingresso, ampliação do estádio,
  empréstimos e salários. Os clubes da IA também compram, vendem e investem.
- **Treino e evolução:** a intensidade do treino (Leve, Normal ou Forte) pesa
  na força dos jogadores rodada a rodada, e quem entra em campo evolui mais.
- **Várias temporadas e carreira:** jogadores envelhecem e se aposentam, a
  diretoria cobra uma meta a cada temporada e pode demitir o técnico no meio
  dela, e clubes melhores fazem propostas conforme a reputação cresce. O
  histórico guarda cada campanha.
- **Notícias:** depois de cada rodada, a aba Notícias resume o que aconteceu
  com o seu clube: lesões, suspensões, propostas, avisos da diretoria,
  resultados de copa e as contratações da sua divisão.
- **Dificuldade:** Fácil, Normal ou Difícil, escolhida junto com o clube. Muda o
  caixa inicial, a exigência da diretoria e o apetite de compra da IA.
- **Som:** músicas CC0 nas telas de gestão e apito e torcida sintetizados
  durante a partida. Música e efeitos podem ser desligados.

## Seu jogo salvo

O jogo salva sozinho no IndexedDB do navegador, em até três espaços. A tela
**Jogos salvos** mostra cada carreira, abre qualquer uma e apaga a que você não
quer mais. **Continuar** abre o jogo salvo por último. Os saves ficam só naquele
navegador, naquele aparelho.

Para levar uma carreira a outro navegador ou aparelho, siga estes passos:

1. Abra o jogo que quer levar e, na tela inicial, toque **Exportar jogo**. O
   navegador baixa um arquivo `forzion-futmanager-t<temporada>-<clube>.json`.
2. No outro navegador, abra o jogo e toque **Importar jogo**.
3. Escolha o arquivo. O jogo vai para um espaço vazio. Se os três estiverem
   ocupados, apague um em **Jogos salvos** e importe de novo.

Saves de versões antigas do jogo são atualizados ao importar.

## Jogar sem internet e instalar

Depois da primeira visita com internet, o jogo abre e roda sem rede: o
navegador guarda o site, e o save já fica no aparelho. Só a música não toca
sem rede.

No Chrome e no Edge, a tela **Sobre** tem o botão **Instalar o jogo**, que põe o
jogo na tela inicial como um app. Nos outros navegadores, use o menu do
navegador: **Adicionar à tela inicial** (no iPhone, **Compartilhar ›
Adicionar à Tela de Início**).

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
| `npm run check:dist` | Falha se algum arquivo de `dist/` apontar para a raiz do site em vez de usar caminho relativo. Rode depois do build. |
| `npm run check:layout` | Mede as telas a 400 × 700 px num Chrome real e falha se alguma rolar a página. |
| `npm run check:layout:selftest` | Confere que o `check:layout` falha numa tela quebrada de propósito. |
| `npm run check:offline` | Abre o build num Chrome real, derruba o servidor e confere que o jogo abre e joga uma rodada sem rede, e que o Chrome o considera instalável. |
| `npm run check:audio` | Renderiza os efeitos sonoros num Chrome real e falha se algum saturar ou chiar. |

Os `check:*` que abrem o Chrome precisam do Google Chrome ou do Microsoft Edge
instalado. Se o navegador estiver em outro lugar, defina `CHROME_PATH`.

## Como o código está organizado

| Pasta | Conteúdo |
| --- | --- |
| `src/engine/` | O motor do jogo: geração de clubes, partida, mercado, finanças, copas, temporadas e migração de saves. TypeScript puro, sem React nem DOM. |
| `src/ui/` | As telas em React. |
| `src/audio/` | Música e efeitos sonoros (Web Audio). |
| `src/persistence/` | Leitura e gravação dos saves no IndexedDB. |
| `src/pwa/` | O service worker gerado no build e a instalação como app. |
| `src/store.ts` | O estado da aplicação (Zustand), que liga as telas ao motor. |
| `scripts/` | Checagens de layout, de áudio, do jogo sem rede e do build. |
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

## Licença

O código está sob a [licença MIT](LICENSE). As músicas e as fontes mantêm as
licenças próprias, listadas em Créditos.
