# Forzion FutManager

Manager de futebol em texto, no navegador, inspirado nos managers clássicos dos anos 90, com clubes e jogadores fictícios.

## tlc-spec-lean

profile: light
budget: 150k

## Convenções

- Nome do produto: «Forzion FutManager». «Brasfoot» é marca de terceiros: nunca em texto de tela, título, pacote ou identificador.
- Código, tipos e chaves do save em inglês; texto de tela em PT-BR (AD-004).
- `src/engine/**` não importa React, DOM, zustand ou idb (AD-002).
- Nenhum `Math.random` fora do `Rng` injetado (AD-002).
- Scripts do skill: `python <skill-dir>/scripts/<nome>.py` (`python3` não existe neste PC).
