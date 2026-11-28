---
version: alpha
name: Recanto Agradável
description: Painel de gestão do aluguel por temporada da casa Recanto Agradável. Valores do painel publicado em 15/11/2026 (v9); tema escuro e Início organizável em 27/11/2026.
colors:
  primary: "#8a7250"
  on-primary: "#ffffff"
  surface: "#ffffff"
  surface-container-low: "#faf7f1"
  surface-container: "#f1eadf"
  on-surface: "#2b2926"
  on-surface-variant: "#7a746b"
  outline: "#e2d8c6"
  outline-variant: "#f1eadf"
  net: "#4f6b57"
  fee: "#b9767f"
  year-a: "#b5a17c"
  year-b: "#4f6b57"
  gain: "#4f6b57"
  loss: "#b9767f"
  muted-mark: "#d9cdb6"
  dark-surface: "#1c1a17"
  dark-surface-container-low: "#24211d"
  dark-surface-container: "#2d2924"
  dark-outline: "#3d3830"
  dark-on-surface: "#efe9df"
  dark-on-surface-variant: "#a9a196"
  dark-primary: "#c9ad85"
  dark-on-primary: "#1c1a17"
  dark-net: "#8fb39a"
  dark-fee: "#d39aa2"
  dark-year-a: "#c9b48c"
  dark-year-b: "#8fb39a"
  dark-muted-mark: "#4a443b"
typography:
  headline-md:
    fontFamily: Sora
    fontSize: 19px
    fontWeight: 500
    lineHeight: 1.3
  title-sm:
    fontFamily: Sora
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.3
  value-md:
    fontFamily: Sora
    fontSize: 17px
    fontWeight: 500
    lineHeight: 1.25
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  xl: 18px
  xxl: 24px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  gutter-mobile: 16px
  gutter-desktop: 26px
components:
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  kpi-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.value-md}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  kpi-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-sm}"
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 38px
  segmented-control:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
  month-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
  nav-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
  sidebar:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xxl}"
    width: 236px
  table-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-sm}"
  page-title:
    textColor: "{colors.on-surface}"
    typography: "{typography.headline-md}"
  card-title:
    textColor: "{colors.on-surface}"
    typography: "{typography.title-sm}"
  soon-tag:
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  series-net:
    backgroundColor: "{colors.net}"
    rounded: "{rounded.sm}"
  series-fee:
    backgroundColor: "{colors.fee}"
    rounded: "{rounded.sm}"
  series-year-a:
    backgroundColor: "{colors.year-a}"
  series-year-b:
    backgroundColor: "{colors.year-b}"
  series-muted:
    backgroundColor: "{colors.muted-mark}"
  series-gain:
    backgroundColor: "{colors.gain}"
  series-loss:
    backgroundColor: "{colors.loss}"
  tooltip:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.md}"
  primary-button:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.xxl}"
  divider:
    backgroundColor: "{colors.outline-variant}"
    height: 1px
  control-border:
    backgroundColor: "{colors.outline}"
---

# Recanto Agradável

## Overview

O painel é o caderno de contas de uma casa de praia, aberto sobre a mesa numa manhã clara: papel branco, tons de areia e tinta cinza quente. Quem lê é a família que opera a casa. Eles querem ver os números e tirar as próprias conclusões, então a tela mostra o dado e se cala.

A navegação fica numa lâmina de vidro fosco à esquerda, como o painel lateral dos aplicativos do iPad: flutua sobre o fundo, recolhe para uma trilha de ícones e some numa gaveta no celular. O resto da interface é quieto. A única cor forte da tela pertence aos dados.

## Colors

### Tema

Cada pessoa escolhe Claro, Escuro ou Igual ao celular em Configurações. A escolha fica no login (tabela `preferencias`) e vale em todos os aparelhos dela; o celular guarda uma cópia só para abrir sem piscar. O `tema.js` roda no `<head>`, antes do CSS, e grava em `<html>` dois atributos: `data-tema` (a escolha) e `data-esquema` (o que está valendo agora). O CSS escuro usa um único seletor, `:root[data-esquema=escuro]`, sem repetir o bloco para o modo do celular. Toda cor da interface é uma variável; não há cor fixa fora do `:root`.

O escuro é a mesma casa à noite: fundo quase preto quente (`dark-surface`), areia apagada nos cartões e tinta clara. Verde-musgo e rosa ipê clareiam para manter contraste, e a areia continua nos gráficos. Os gráficos leem as cores do tema na hora de desenhar e são redesenhados quando o tema muda.

### Claro

A interface é branca e areia. O fundo é `surface`, com um brilho de areia muito leve nos cantos; cartões são brancos quase opacos sobre ele. `on-surface` é a tinta de todo texto e número, e `on-surface-variant` serve rótulos e legendas. Não existe preto puro.

`primary` é um areia escuro, usado apenas para marcar seleção: o mês escolhido no calendário, a barra do mês em foco, o ícone da marca.

As cores vivas são reservadas aos dados e têm significado fixo em todas as telas:

- `net` (verde-musgo) é sempre receita líquida, o dinheiro que fica.
- `fee` (rosa de ipê) é sempre a taxa do Airbnb, o dinheiro que sai. Custos e quedas usam o mesmo rosa.
- `year-a` (areia) é sempre o ano anterior e `year-b` (verde-musgo) é sempre o ano atual.
- `gain` e `loss` marcam aumento e queda, com as mesmas cores de `net` e `fee`.
- `primary` (areia escura) colore ranking, mês selecionado e ocupação; `muted-mark` (areia) é o que não está em foco.

Os gráficos usam tons da natureza: mata, flor e areia. A areia precisa continuar presente nos gráficos, não só na interface. Mapas de calor vão da areia ao verde escuro, em cinco faixas. Testados e descartados: azul com amarelo, verde vivo com laranja, café com terracota, azul-marinho com rosé. Pares conferidos para daltonismo; `year-a` tem contraste baixo contra o branco e sempre aparece com legenda.

Uma cor de dado nunca colore texto, botão ou fundo.

## Typography

Sora para títulos e para números em destaque; IBM Plex Sans para todo o resto. Os pesos são leves: 500 nos títulos e valores, 400 no corpo. Nada em negrito pesado, nada em caixa alta.

Números usam algarismos tabulares para alinhar em colunas. Valores em reais seguem o formato brasileiro (R$ 1.234,56) e meses aparecem abreviados em minúsculas (jan/26).

O número é a hierarquia. Um cartão de indicador tem um rótulo em `label-sm`, o valor em `value-md` e, no máximo, uma linha curta de contexto.

## Layout

Uma coluna de conteúdo com no máximo 960px, ao lado do menu. Cada seção tem a sua própria composição; duas seções nunca repetem a mesma sequência de blocos.

Indicadores ficam numa grade de três colunas, também no celular. Gráficos e tabelas ocupam a largura do cartão. Tabelas largas rolam dentro do próprio cartão, e a página nunca rola para os lados.

O seletor de período aparece somente nas seções em que ele muda os números. É um calendário de meses: toca-se no mês inicial e no final.

O que é detalhe fica fechado e abre ao toque: explicações de cálculo, simuladores, notas sobre o Airbnb.

## Elevation & Depth

A profundidade vem do vidro, não da sombra. O menu lateral é branco a 62% com desfoque de 22px, borda clara de 1px e uma sombra larga e quente, quase imperceptível. O calendário de período usa o mesmo material. No celular, a barra do topo e a barra de navegação são quase opacas: nada do conteúdo que rola por baixo pode ficar legível através delas.

Cartões não têm sombra. Separam-se do fundo por uma linha de 1px em `outline-variant`. O item ativo do menu é uma pastilha branca com sombra curta.

## Shapes

Cantos generosos e graduados pelo tamanho do objeto: `xxl` no menu, `xl` nos cartões, `lg` nos indicadores e itens de menu, `md` em botões e campos, `sm` nas pontas das barras. Etiquetas são pílulas.

Ícones são de traço fino (1,7px), pontas arredondadas, sem preenchimento. A marca é uma folha no mesmo traço.

## Components

### Indicador

Rótulo, valor e uma linha opcional de contexto. Sem ícone, sem selo, sem seta de variação.

### Gráficos

Rosca para a divisão de um total em duas partes, com o total no centro. Barras empilhadas para líquida e taxa por mês. Barras lado a lado para comparar anos. Linha para taxa efetiva e para acumulado. Cascata para explicar a passagem de um total a outro. Mapa de calor para sazonalidade, com o valor escrito em cada célula. Ranking em barras horizontais, com a marca dos 80%. Um eixo por gráfico. Duas séries sempre têm legenda. Tocar numa barra leva ao mês correspondente.

### Dica ao passar o mouse

Fundo areia (claro no tema claro, areia apagada no escuro), borda fina, texto em tinta. Nunca um cartão preto sobre fundo claro.

### Menu

No celular, uma barra de vidro fixa embaixo leva às seções mais usadas e abre o menu completo; a marca fica fixa no topo.

Um ícone e um nome por seção, em grupos separados por uma linha fina. Seções ainda sem dados levam a etiqueta "em breve". O rodapé informa até que data vão os dados.

### Chave de tema

Uma linha só: "Tema" e o valor atual à esquerda; à direita, uma chave com três ícones (sol, celular, lua) e uma pílula que desliza até o escolhido. Tocar num ícone ou arrastar a pílula; ao soltar, ela encaixa no ícone mais próximo. Pelo teclado, setas.

### Blocos do Início

Cada cartão do Início tem uma alça de seis pontos no canto do cabeçalho. Segurar a alça ergue o bloco, que acompanha o dedo ou o mouse; os vizinhos deslizam para abrir a vaga, e perto da borda a página rola sozinha. Ao soltar, o bloco encaixa e a ordem fica salva no login. Pelo teclado: foco na alça e setas para cima ou para baixo. A saudação fica fixa no topo. Configurações tem "Restaurar ordem padrão". O cálculo usa só o eixo vertical, porque o Início é uma coluna.

### Lançamento

Uma folha que cobre a tela no celular e vira um painel central no computador. Começa por uma chave de duas posições: Custo ou Reserva. Campos obrigatórios levam asterisco; o resto é opcional e não bloqueia o salvar. Categorias e canais são pílulas de escolha única, não listas suspensas. Ao salvar, a folha fecha e um aviso curto confirma o que entrou ("Reserva de Guilherme salva."). Editar abre a mesma folha preenchida, com "Excluir" no rodapé e confirmação. Reserva lançada por fora tem os mesmos dados de uma reserva do Airbnb (hóspede, entrada e saída com horário, valor recebido, canal, pessoas, pets, contato e observações) e aparece no Início, em Reservas, no Calendário e nos avisos junto com as do Airbnb, com o avatar tracejado em areia para diferenciar a origem.

### Calendário

Uma grade de mês, domingo a sábado. Cada dia é dividido ao meio: a metade da manhã pertence a quem sai, a da tarde a quem entra, como no calendário de anfitrião. Verde para Airbnb, areia para reserva por fora, branco para livre. O primeiro nome do hóspede aparece no dia de entrada. Tocar no dia abre embaixo quem está na casa e as ações; em dia livre, oferece lançar uma reserva a partir dele.

### Itens que abrem

Um título e uma seta. Fechados por padrão.

### Estado vazio

Uma frase dizendo o que vai aparecer ali. Nenhum número de exemplo.

## Do's and Don'ts

- Mostre o dado e pare. Nenhum texto explicando o que o gráfico já mostra.
- Use cor viva somente em marcas de dados, com o significado fixo descrito em Colors.
- Toda cor nova entra como variável nos dois temas. Nenhuma cor fixa fora do `:root`.
- Confira o contraste (4,5:1) nos dois temas antes de publicar.
- Não use azul, turquesa ou verde na interface (menus, botões, fundos).
- Não use selos de origem, bolinhas de situação nem etiquetas além de "em breve".
- Não exiba número fictício ou de demonstração em nenhuma circunstância.
- Não mostre notas de construção do painel: pendências, premissas, fontes.
