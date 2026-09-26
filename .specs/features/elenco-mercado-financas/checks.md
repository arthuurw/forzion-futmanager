# Elenco, mercado e finanças - checks

Profile: light
Plan: `.specs/features/elenco-mercado-financas/plan.md`

## Intent

57 checks in 7 slices · 4 one-way doors · 0 open

Runner: Vitest (`npx vitest run <arquivo> -t "<nome>"`). Telas usam `@testing-library/react` em jsdom. Todo valor esperado nos testes é literal ou calculado no próprio teste, nunca pela função de produção (L-004). Quem diz «todo», «cada» ou «todas» é provado por tabela sobre o conjunto inteiro.

## Checks

### S1 - Caixa, salários e bilheteria · ~9 files · ~70 KB · ~18k

**C1** - Depois de uma temporada de 38 rodadas com compra, venda, contratação, empréstimo e ampliação, todo número de dinheiro do save é inteiro: caixa, patrocínio, salários, propostas, empréstimo, preço e linhas do registro (AC 1)
Proof: `npx vitest run src/engine/finance.test.ts -t "todo dinheiro do save é inteiro"`

**C2** - O salário por rodada é R$ 2.000 para força 40, R$ 11.200 para 60, R$ 40.800 para 75 e R$ 228.800 para 95, e todo jogador de um jogo novo tem o salário da fórmula (AC 2)
Proof: `npx vitest run src/engine/finance.test.ts -t "salário por força"`

**C3** - No jogo novo, o caixa de cada um dos 20 clubes é 10 vezes a sua folha por rodada, arredondado para R$ 100.000 (AC 3)
Proof: `npx vitest run src/engine/finance.test.ts -t "caixa inicial 10 folhas"`

**C4** - Torcida de elenco com força média 58 é 15.000, com 69 é 38.000 e com 80 é 60.000; abaixo de 58 fica 15.000 e acima de 80 fica 60.000; capacidade é 80% da torcida arredondada para 1.000 (AC 4)
Proof: `npx vitest run src/engine/finance.test.ts -t "torcida e capacidade"`

**C5** - Ao fim de uma rodada, para cada um dos 20 clubes, o caixa muda exatamente em patrocínio − salários do elenco + bilheteria (se mandante) − juros, e o registro da rodada traz essas linhas (AC 5)
Proof: `npx vitest run src/engine/finance.test.ts -t "rodada paga salários e patrocínio"`

**C6** - Em cada uma das 10 partidas de uma rodada, o mandante recebe público × preço e o visitante recebe bilheteria 0 (AC 6)
Proof: `npx vitest run src/engine/finance.test.ts -t "bilheteria só do mandante"`

**C7** - Com torcida 30.000 e capacidade 50.000, antes da 1ª rodada, o público é 39.000 a R$ 20, 30.000 a R$ 40 e 10.606 a R$ 80; com capacidade 24.000 a R$ 40 é 24.000; com preço R$ 40, o líder leva 36.000 e o 20º leva 24.000 (AC 7)
Proof: `npx vitest run src/engine/finance.test.ts -t "público por preço fase e capacidade"`

**C8** - A tela Finanças mostra caixa, folha por rodada, patrocínio por rodada, torcida, capacidade e preço do ingresso do clube do usuário, com os valores do save (AC 8)
Proof: `npx vitest run src/ui/Finance.test.tsx -t "resumo do clube"`

**C9** - Depois de uma rodada, a tela Finanças lista as 8 linhas da última rodada: público, bilheteria, patrocínio, salários, juros, compras, vendas e saldo, com os valores do registro (AC 9)
Proof: `npx vitest run src/ui/Finance.test.tsx -t "linhas da última rodada"`

**C10** - Sem rodada jogada, a tela Finanças mostra «Nenhuma rodada jogada» e nenhuma linha de rodada (AC 10)
Proof: `npx vitest run src/ui/Finance.test.tsx -t "nenhuma rodada jogada"`

**C11** - A tabela Elenco tem a coluna «Salário», e cada uma das 22 linhas mostra o salário formatado daquele jogador (AC 11)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "coluna salário"`

**C12** - Com o usuário mandante, a tela Rodada mostra «Público» e «Bilheteria» com os valores do registro; como visitante, não mostra (AC 12)
Proof: `npx vitest run src/ui/Round.test.tsx -t "público e bilheteria do jogo em casa"`

**C13** - Em 5 seeds, jogando 38 rodadas sem ação de mercado, o caixa final de cada um dos 100 clubes fica entre 50% e 250% do inicial, e a mediana entre 90% e 160% (AC 13)
Proof: `npx vitest run src/engine/balance.test.ts -t "caixa equilibrado em uma temporada"`

**C14** - O dinheiro aparece como «R$ 0», «R$ 40.800», «R$ 1.234.567» e «-R$ 500.000», sem centavos (AC 14)
Proof: `npx vitest run src/ui/money.test.ts -t "formato do dinheiro"`

**C15** - Cada uma das 11 ações (comprar, aceitar proposta, recusar proposta, marcar à venda, dispensar, contratar livre, promover júnior, preço do ingresso, ampliar, pegar empréstimo e pagar empréstimo) grava o save, e o estado só muda depois que a gravação termina (AC 15)
Proof: `npx vitest run src/store.test.ts -t "ações de mercado gravam antes de mostrar"`

### S2 - Janelas e compra · ~5 files · ~40 KB · ~10k

**C16** - Para a próxima rodada de 1 a 38 (e 39 = temporada encerrada), o mercado está aberto exatamente em 1–5 e 18–22 (AC 16)
Proof: `npx vitest run src/engine/market.test.ts -t "janelas 1 a 5 e 18 a 22"`

**C17** - Com a próxima rodada 6, a tela Mercado mostra «Mercado fechado - reabre antes da rodada 18»; com 23, «Mercado fechado - reabre na próxima temporada»; em ambos não há botão de oferecer, aceitar, contratar ou promover (AC 17)
Proof: `npx vitest run src/ui/Market.test.tsx -t "mercado fechado"`

**C18** - A lista do mercado tem as colunas Nome, Pos, Idade, Força, Clube, Valor e Salário e 458 linhas (19 clubes × 22 + 40 livres, «Livre» no clube), por força decrescente; o filtro «ATA» deixa só atacantes; um filtro sem jogadores mostra «Nenhum jogador» (AC 18)
Proof: `npx vitest run src/ui/Market.test.tsx -t "lista do mercado"`

**C19** - Com força 75, o valor é R$ 3.060.000 aos 20, R$ 2.450.000 aos 25, R$ 2.040.000 aos 29, R$ 1.220.000 aos 32 e R$ 610.000 aos 35; as bordas 21/22, 27/28, 30/31 e 33/34 mudam de faixa (AC 19)
Proof: `npx vitest run src/engine/market.test.ts -t "valor por salário e idade"`

**C20** - O preço pedido por um titular da escalação da IA é 1,5 × valor, e por um reserva é 1,0 × valor (AC 20)
Proof: `npx vitest run src/engine/market.test.ts -t "preço pedido titular e reserva"`

**C21** - Uma oferta igual ao preço pedido move o jogador para o elenco do usuário, tira o valor do caixa do usuário e soma o mesmo valor no do vendedor, no motor e pela tela Mercado (AC 21)
Proof: `npx vitest run src/engine/market.test.ts -t "compra com oferta no preço"`
Proof: `npx vitest run src/ui/Market.test.tsx -t "comprar pela tela"`

**C22** - Uma oferta R$ 10.000 abaixo do preço é recusada com «Recusado: pedem R$ X», com X o preço pedido, e nada muda no save (AC 22)
Proof: `npx vitest run src/ui/Market.test.tsx -t "oferta abaixo do preço recusada"`

**C23** - Cada um dos 5 gastos (compra, luvas, rescisão, ampliação e pagamento de empréstimo) acima do caixa é recusado com «Caixa insuficiente», e nada muda no save (AC 23)
Proof: `npx vitest run src/engine/market.test.ts -t "gasto acima do caixa recusado"`

**C24** - Com 30 jogadores, compra, contratação de livre e promoção de júnior são recusadas com «Elenco cheio (30)» (AC 24)
Proof: `npx vitest run src/engine/market.test.ts -t "elenco cheio recusa"`

**C25** - Comprar de um clube com 18 jogadores é recusado com «O clube não vende: elenco no mínimo» (AC 25)
Proof: `npx vitest run src/engine/market.test.ts -t "vendedor no mínimo recusa"`

**C26** - Um jogador lesionado com moral −1 e 2 amarelos, comprado, chega com o mesmo id, salário, condição, moral, amarelos, lesão e suspensão, e fora da escalação (AC 26)
Proof: `npx vitest run src/engine/market.test.ts -t "transferência mantém o jogador"`

### S3 - Venda, propostas e dispensa · ~4 files · ~30 KB · ~8k

**C27** - Com o mercado aberto, a tela Elenco marca e desmarca «À venda» e o `forSale` do clube acompanha; com o mercado fechado, não há o controle (AC 27)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "marcar à venda"`

**C28** - Em 2000 rodadas fechadas na janela com um jogador à venda, a taxa de propostas por ele fica entre 45% e 55%; toda proposta fica entre 80% e 110% do valor, é múltipla de R$ 10.000 e vem de um clube da IA com caixa ≥ valor e menos de 30 jogadores (AC 28)
Proof: `npx vitest run src/engine/market.test.ts -t "propostas por jogador à venda"`

**C29** - Em 2000 rodadas fechadas na janela sem ninguém à venda, a taxa de propostas espontâneas fica entre 20% e 30%, cada uma por um dos 5 jogadores mais valiosos do usuário, entre 110% e 150% do valor e múltipla de R$ 10.000 (AC 29)
Proof: `npx vitest run src/engine/market.test.ts -t "propostas espontâneas pelos mais valiosos"`

**C30** - A aba «Propostas» lista clube, jogador e valor de cada proposta com «Aceitar» e «Recusar»; sem propostas mostra «Nenhuma proposta» (AC 30)
Proof: `npx vitest run src/ui/Market.test.tsx -t "aba propostas"`

**C31** - Aceitar e confirmar «Vender X por R$ Y?» move o jogador para o comprador, soma o valor no caixa do usuário e tira do comprador, esvazia a vaga dele na escalação e apaga as outras propostas por ele; cancelar não muda nada (AC 31)
Proof: `npx vitest run src/ui/Market.test.tsx -t "aceitar proposta com confirmação"`

**C32** - Com 18 jogadores, aceitar uma proposta e dispensar são recusados com «Elenco no mínimo (18)» (AC 32)
Proof: `npx vitest run src/engine/market.test.ts -t "usuário no mínimo recusa"`

**C33** - Uma proposta não respondida some quando a rodada seguinte termina (AC 33)
Proof: `npx vitest run src/engine/market.test.ts -t "proposta expira na rodada seguinte"`

**C34** - Dispensar e confirmar «Dispensar X custa R$ Y. Confirmar?» tira 4 × salário do caixa e põe o jogador nos livres (AC 34)
Proof: `npx vitest run src/ui/Squad.test.tsx -t "dispensar com confirmação"`

### S4 - Livres e base · ~3 files · ~20 KB · ~5k

**C35** - Um jogo novo tem 40 livres, 10 de cada uma das 4 posições, todos com força entre 45 e 70 (AC 35)
Proof: `npx vitest run src/engine/market.test.ts -t "40 livres no jogo novo"`

**C36** - Contratar um livre tira 4 × salário do caixa, põe o jogador no elenco e o tira dos livres (AC 36)
Proof: `npx vitest run src/engine/market.test.ts -t "contratar livre paga luvas"`

**C37** - Há 3 juniores de 17 anos com força entre 45 e 62 no jogo novo e depois da rodada 17, e nenhum entre as rodadas 6 e 17 (AC 37)
Proof: `npx vitest run src/engine/market.test.ts -t "juniores quando a janela abre"`

**C38** - Promover um júnior não muda o caixa, põe o júnior no elenco com salário da fórmula e o tira da base (AC 38)
Proof: `npx vitest run src/engine/market.test.ts -t "promover júnior sem custo"`

**C39** - Os juniores não promovidos somem ao fim da rodada 5 e da rodada 22, e a aba «Base» vazia mostra «Nenhum júnior na base» (AC 39)
Proof: `npx vitest run src/engine/market.test.ts -t "juniores somem quando a janela fecha"`
Proof: `npx vitest run src/ui/Market.test.tsx -t "base vazia"`

**C40** - Um clube da IA que termina a rodada com 16 jogadores contrata 2 livres, cada um o mais forte da posição em que o clube tem menos jogadores, pagando as luvas (AC 40)
Proof: `npx vitest run src/engine/market.test.ts -t "IA completa elenco com livres"`

### S5 - Ingresso e estádio · ~3 files · ~20 KB · ~5k

**C41** - O seletor de preço oferece de R$ 10 a R$ 200 em passos de R$ 5 (39 opções), começa em R$ 40, e todo clube da IA tem ingresso R$ 40 (AC 41)
Proof: `npx vitest run src/ui/Finance.test.tsx -t "preço do ingresso"`

**C42** - Mudar o preço de R$ 40 para R$ 80 muda o público estimado para o valor da fórmula com a fase atual (AC 42)
Proof: `npx vitest run src/ui/Finance.test.tsx -t "público estimado muda com o preço"`

**C43** - Ampliar e confirmar «Ampliar custa R$ 4.000.000. Confirmar?» tira R$ 4.000.000 do caixa; a capacidade fica igual depois de 5 rodadas e sobe 5.000 ao fim da 6ª (AC 43)
Proof: `npx vitest run src/engine/finance.test.ts -t "ampliação fica pronta em 6 rodadas"`
Proof: `npx vitest run src/ui/Finance.test.tsx -t "ampliar com confirmação"`

**C44** - Com obra em andamento, a tela Finanças mostra «Obras: N rodadas» e outra ampliação é recusada com «Já há uma obra em andamento» (AC 44)
Proof: `npx vitest run src/ui/Finance.test.tsx -t "obra em andamento"`

**C45** - Com capacidade 76.000, ampliar é recusado com «Capacidade máxima: 80.000»; com 75.000 é aceito (AC 45)
Proof: `npx vitest run src/engine/finance.test.ts -t "capacidade máxima 80000"`

### S6 - Empréstimo · ~2 files · ~15 KB · ~4k

**C46** - Pegar R$ 500.000 e R$ 1.000.000 funciona, R$ 700.000 é recusado, e o saldo devedor chega até 2 × caixa inicial (AC 46)
Proof: `npx vitest run src/engine/finance.test.ts -t "empréstimo em múltiplos até o limite"`

**C47** - Um pedido que passa do limite é recusado com «Limite de empréstimo: R$ X», com X o que ainda cabe (AC 47)
Proof: `npx vitest run src/engine/finance.test.ts -t "empréstimo acima do limite"`

**C48** - Com saldo devedor de R$ 1.000.000, a rodada cobra R$ 15.000 de juros; com R$ 1.234.567 cobra R$ 18.500 (AC 48)
Proof: `npx vitest run src/engine/finance.test.ts -t "juros de 1,5% por rodada"`

**C49** - Pagar R$ 500.000 e pagar o saldo inteiro funcionam; pagar mais que o saldo é recusado (AC 49)
Proof: `npx vitest run src/engine/finance.test.ts -t "pagar empréstimo"`

**C50** - Com caixa negativo, compra, luvas, rescisão e ampliação são recusadas com «Caixa insuficiente», e a rodada seguinte ainda paga os salários (AC 50)
Proof: `npx vitest run src/engine/finance.test.ts -t "caixa negativo bloqueia gastos e paga salários"`

### S7 - Save compatível · ~4 files · ~20 KB · ~5k

**C51** - Um save v2 e um save v1 viram v3 na leitura, com salário pela fórmula, caixa e torcida pelas fórmulas, ingresso R$ 40, sem empréstimo e sem obra, 40 livres, nenhuma proposta e nenhum júnior, e com elencos e tabela intactos (AC 51)
Proof: `npx vitest run src/engine/migrate.test.ts -t "migra v2 e v1 para v3"`

**C52** - Um save gravado com `schemaVersion: 4` mostra «Jogo salvo incompatível (versão 4)» e só «Novo jogo» (AC 52)
Proof: `npx vitest run src/ui/Home.test.tsx -t "save de versão 4 incompatível"`

**C53** - Recarregar o mesmo save antes da rodada e jogá-la dá os mesmos resultados, as mesmas propostas e as mesmas contratações da IA (AC 53)
Proof: `npx vitest run src/app.test.tsx -t "reload antes da rodada repete propostas"`

**C54** - O documento gravado tem `schemaVersion: 3`, `finance` em todo clube, `salary` em todo jogador e `market` com `freeAgents`, `juniors` e `offers` (plano Landing, door 1)
Proof: `npx vitest run src/persistence/save.test.ts -t "documento tem schemaVersion 3 com finanças e mercado"`

**C55** - Mudar a força de um jogador no save não muda o salário dele, nem depois de uma rodada, nem depois de gravar e ler (plano Landing, door 2)
Proof: `npx vitest run src/engine/finance.test.ts -t "salário guardado não segue a força"`

**C56** - Com e sem uma compra antes da rodada, as partidas que não envolvem o usuário nem o vendedor têm os mesmos resultados (plano Landing, door 3)
Proof: `npx vitest run src/engine/market.test.ts -t "compra não muda o sorteio das partidas"`

**C57** - Depois de uma temporada com compras, vendas, dispensas, contratações e promoções, todo id de jogador do save (elencos, livres e juniores) é único, e os livres e juniores usam `fa-` e `jr-` (plano Landing, door 4)
Proof: `npx vitest run src/engine/market.test.ts -t "ids de jogador únicos no save"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| próxima rodada vs janela (39) | C16, table-driven over 1–39 | - |
| gastos bloqueados por caixa (5) | compra C23 · luvas C23 · rescisão C23 · ampliação C23 · pagamento de empréstimo C23; C23 table-driven over all 5 | - |
| recusas de compra (4) | preço C22 · caixa C23 · elenco cheio C24 · vendedor no mínimo C25 | - |
| elenco cheio por ação (3) | compra C24 · livre C24 · júnior C24 | - |
| usuário no mínimo por ação (2) | aceitar C32 · dispensar C32 | - |
| fator de idade (5 faixas) | até 21 C19 · 22–27 C19 · 28–30 C19 · 31–33 C19 · 34+ C19 | - |
| fase do público (3) | líder C7 · 20º C7 · antes da 1ª rodada C7 | - |
| linhas da última rodada (8) | público C9 · bilheteria C9 · patrocínio C9 · salários C9 · juros C9 · compras C9 · vendas C9 · saldo C9 | - |
| ações que gravam (11) | C15, table-driven over all 11 | - |
| estados vazios (4) | mercado fechado C17 · sem propostas C30 · base vazia C39 · filtro sem jogador C18 | - |
| confirmações (3) | vender C31 · dispensar C34 · ampliar C43 | - |
| versões de save (4) | v1 C51 · v2 C51 · v3 C54 · v4 C52 | - |
| portas de mão única (4) | door 1 C54 · door 2 C55 · door 3 C56 · door 4 C57 | - |
| entidades de `Relations` (6) | Market C35 · Finance C3 · Offer C28 · Player.salary C2 · Club.forSale C27 · Player (18 a 30) C24, C32 | - |

- `Surface` do plano é `None`; nenhuma rota.
- Claims que cruzam a persistência: C15, C51, C52, C53, C54, C55.

## Superseded checks of partida-ao-vivo

O plano aprovado muda contratos que partida-ao-vivo provou. Os testes abaixo mudam junto, no mesmo commit, e a mudança é declarada aqui:

| partida-ao-vivo | O que muda | Substituído por |
| --- | --- | --- |
| C42 (v1 migra para v2) | v1 migra direto para v3; as mesmas asserções de condição continuam | C51 |
| C43 (> 2 é incompatível) | só > 3 é incompatível; o teste de versão 3 passa a usar 4 | C52 |
| C45 (documento com `schemaVersion: 2`) | passa a ser 3 | C54 |

## Swept

- validation: C22, C23, C24, C25, C41, C45, C46, C47, C49
- failure modes: C15, C50
- idempotency: C31, C33
- authorization: n/a - jogo local de um jogador, sem contas
- concurrency: n/a - as ações de mercado rodam uma de cada vez no store, só fora da rodada ao vivo; C15 prova que o estado só muda depois da gravação
- data lifecycle: C33, C39, C51
- dependency failure: existing - o aviso «Salvamento indisponível neste navegador» do núcleo cobre o IndexedDB ausente, e as ações de mercado usam o mesmo `saveGame`
- state transitions: C16, C17, C43
- observability: n/a - sem requisito de log; recusas aparecem na tela

## Handoff

- Arquivos que existem e são lidos: `types`, `generate`, `season`, `migrate`, `persistence/save`, `store`, `Squad`, `Round`, `App`, `test-utils` e 5 testes, ≈ 62 KB, mais `styles.css` 36 KB. Total ≈ 99 KB → ~25k
- Código novo (`engine/finance`, `engine/market`, `ui/Market`, `ui/Finance`, `ui/money`, testes) ≈ 70 KB → ~18k
- S1 ≈ 18k; S2 com S3 entram em `engine/market` e na tela Mercado: 36k acumulado; S4 a S7: 55k acumulado
- Total ≈ 55k, abaixo do budget de 150k - one builder

- **Boundary:** C1–C57 closed across `c528f9a` (engine) and the `feat(ui)` commit that follows it
- **Settled mid-build:**
  - Nothing new was asked.
  - Sponsorship was calibrated for C13 within the approved assumption, and the reason is in the plan's `Assumptions`. Sponsorship = payroll − expected gate, with a floor of 3% of payroll; 50% of payroll left the median at 3,3×.
  - Doors 5 and 6 were recorded in `Landing` before their code.
  - The C46 test takes the largest multiple of R$ 500.000 under the limit, because the limit (2 × initial cash) is not always a multiple.
- **Abandoned:** drawing the market from the leagues' `Rng` - it would have changed every seed's matches (door 6)
