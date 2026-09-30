# Menu no Elenco - checks

Profile: light
Plan: none - one screen, one button, no one-way door; intent below.

## Intent

Da tela de escalação (Elenco) não há como voltar ao menu principal: a barra de ações só leva a Mercado, Finanças, Histórico, Copa e à próxima rodada. O autor pediu em 30/09/2026 um «voltar ao menu principal» nessa tela. Com esta mudança, a barra do Elenco ganha o botão «Menu principal». Ele abre a tela inicial, onde «Continuar» volta ao mesmo jogo.

2 checks in 1 slice · 0 one-way doors · 0 open

Lições aplicadas: L-003 (pela tela inteira, `App`), L-008 (texto exato do botão).

## Checks

### S1 - Menu principal a partir do Elenco · 2 files · 45 KB · ~11k

**C1** - No Elenco, o botão «Menu principal» abre a tela inicial com «Continuar» habilitado. «Continuar» volta ao Elenco do mesmo clube (título com o nome dele), com o jogo igual ao de antes.
Proof: `npx vitest run src/ui/Squad.test.tsx -t "menu principal pelo elenco"`

**C2** - `npm run check:layout` sai 0 com as 16 telas; o Elenco (`squad` e `squadOffer`) continua sem rolagem com o botão novo (AD-010).
Proof: `npm run check:layout`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| ida e volta (2) | Elenco → menu C1 · menu → Elenco C1 | - |

## Swept

- validation: n/a - sem entrada do usuário
- failure modes: n/a - só muda de tela; o jogo já está gravado
- idempotency: n/a - navegação
- authorization: n/a - jogo local
- concurrency: n/a - navegação sem escrita
- data lifecycle: n/a - nada gravado
- dependency failure: n/a - nada externo
- state transitions: C1
- observability: n/a - jogo offline sem telemetria

## Handoff

- S1 ≈ `Squad.tsx` 16 KB + `Squad.test.tsx` 29 KB ≈ 45 KB / 4 ≈ 11k - one builder
- Mechanism: one builder
