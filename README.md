# Painel Recanto Agradável

Painel web com indicadores de receita, taxas, ocupação e diária média de um aluguel por temporada, com comparativo entre anos, mês a mês, sazonalidade e registro de custos e reservas por fora da plataforma.

O site é estático (HTML, CSS e JavaScript, com Chart.js e a biblioteca do Supabase servidos do próprio repositório). Os dados ficam no Supabase e só aparecem depois do login.

## Estrutura
- `index.html`, `estilo.css`, `app.js`: interface do painel
- `auth.js`: login e carga dos dados (totais, reservas programadas e lançamentos)
- `config.js`: endereço do projeto e chave pública
- `supabase/schema.sql`: tabelas e regras de acesso
- `.github/workflows/manter-ativo.yml`: consulta semanal que mantém o banco ativo
