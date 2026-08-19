# Personal Pro Manager — Real Accounts Lite 5.0

Esta build foi feita para o projeto Netlify `personalpromanaagaer`.

## Objetivo

Versão leve, sem conta demo e com autenticação real:

- cadastro com e-mail e senha;
- confirmação de e-mail pelo Netlify Identity;
- login real;
- recuperação/redefinição de senha;
- sessão persistente;
- dados isolados por `user.id`;
- banco Postgres do Netlify Database;
- `GET /api/state` para carregar;
- `PUT /api/state` para salvar;
- `DELETE /api/state` para zerar dados mantendo a conta;
- Configurações de interface;
- água, suplementos, treinos, vídeos e progresso;
- foto de perfil comprimida para 160x160;
- sem React, sem bibliotecas visuais e sem imagens externas.

## IMPORTANTE — publicação correta

Este ZIP é **código-fonte com Function e migration**.

Não publique como "Drag & Drop" de site estático, porque esse modo não executa `npm run build`, Functions e migrations.

Use um deploy com build (Git ou Netlify CLI), mantendo:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

O `netlify.toml` já configura isso.

## Netlify Identity

No projeto:
`Project configuration > Identity`

- Identity: Enabled
- Registration: Open
- Confirmação de e-mail: ativa para produção

## Banco de dados

O pacote `@netlify/database` provisiona/conecta o Postgres automaticamente no deploy.

A migration correta fica em:

`netlify/database/migrations/20260819143000_create-personal-pro-manager-state/migration.sql`

Tabela:

`personal_pro_manager_state`

Cada usuário tem uma linha, identificada pelo `user.id` do Netlify Identity.

## Reset

Em `Configurações > Conta > Zerar dados da conta`:

- exige digitar `ZERAR`;
- apaga apenas a linha de estado daquele usuário;
- mantém e-mail, senha e usuário do Identity;
- recria um estado vazio.

## Performance

- JavaScript puro;
- Vite apenas para empacotar/minificar;
- sem framework SPA;
- sem fonts externas;
- sem imagens remotas;
- vídeo armazenado apenas como link;
- avatar reduzido antes de salvar;
- gravação com debounce de 500 ms;
- assets de build com cache longo.
