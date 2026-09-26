# Visual Winning Eleven PS1

## Problem

O jogo funciona mas parece planilha: fundo bege, tabelas cruas, botões nativos do navegador. O autor pediu (26/09/2026) um visual "arrojado, parecido com jogo de futebol", e depois especificou: **parecido com o Winning Eleven de PS1**.

## Referência

Pesquisa na web rendeu pouco material textual sobre a interface. Único dado confirmado: a fonte dos menus é **Impact** (identificação no fórum DaFont). O restante vem da memória visual do jogo (Winning Eleven 2000/2002, ISS Pro Evolution 1/2):

- Fundo azul-marinho profundo com gradiente e textura de listras diagonais
- Painéis e barras de menu chanfrados: borda clara em cima, escura embaixo
- Item selecionado ou ação principal em amarelo/laranja com texto escuro
- Títulos em itálico condensado caixa-alta, branco, com sombra preta dura
- Tela de formação: campo verde listrado visto de cima; jogadores como círculos numerados coloridos por posição (GOL amarelo, ZAG azul, MEI verde, ATA vermelho)
- Barras de atributo horizontais com gradiente verde → amarelo → vermelho
- Placar de transmissão: barra escura com nomes, placar em caixas e relógio

## Decisões

| Tema | Escolha | Rejeitado |
| --- | --- | --- |
| Fonte de título | Impact, com fallback Anton (clone OFL da Impact) servido de `public/fonts` | Google Fonts em runtime - viola "nada sai da máquina do jogador" (Flow hop 8) |
| Relógio e minutos | VT323 (fonte de display digital, OFL), local | Press Start 2P - arcade demais, não é o WE |
| Corpo de texto | Barlow Semi Condensed 500/700, local | fonte do sistema - desalinhada com a estética condensada |
| Cores das posições | GK `#f5c400`, DF `#2f7bff`, MF `#19b347`, FW `#e5322b` | - |
| Escudo dos clubes | "bandeira" de 2-3 faixas com cores derivadas do `id` do clube por hash, só na UI, nada persistido | editar o save (door 1) pra guardar cores - custo de schema sem ganho |
| Dependências | nenhuma nova; só CSS e componentes React | biblioteca de UI - mudaria door 5 |

## Telas

- **Início**: tela-título. Logo "BRASFOOT" gigante itálico com contorno amarelo, faixa "TEMPORADA 1", menu vertical de barras chanfradas.
- **Escolher clube**: cabeçalho "SELEÇÃO DE TIME"; grade de cartões com bandeira, nome e barra de força.
- **Elenco**: esquerda, campo com a formação e um token por titular (círculo numerado + placa com seletor); direita, lista do elenco com chip de posição e barra de força. Barra de ação embaixo com "Jogar rodada" em amarelo.
- **Rodada**: placar de transmissão no topo com bandeiras e relógio; narração como lance a lance com minuto em caixa digital e gol em destaque amarelo; quadro de resultados; tabela.
- **Tabela**: linhas alternadas, posição em caixa (1º dourado), clube com bandeira.
- **Fim**: "FIM DA TEMPORADA", faixa de campeão dourada, tabela final.

## Restrições

- Texto, papéis ARIA e rótulos testados continuam idênticos. Os 42 testes existentes são o contrato e não são editados.
- Nenhuma mudança em `src/engine` nem no formato do save.
- Layout funciona em 360 px de largura (celular) sem rolagem horizontal da página.

## Verificação

- `npx vitest run` - 42 verdes, nenhum teste alterado
- `npx tsc`, `npx eslint src`, `npx vite build` limpos
- Screenshots de todas as telas via Edge headless em 1280×800 e 390×844, inspecionados antes de entregar
