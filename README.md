# Personal Pro Manager — Real Accounts Lite 5.1

Projeto organizado para deploy no Netlify com contas reais e banco por usuário.

## Estrutura

```text
/
├── index.html
├── main.js
├── styles.css
├── package.json
├── netlify.toml
├── verify-files.mjs
└── netlify/
    ├── functions/
    │   └── state.mts
    └── database/
        └── migrations/
            └── 20260819143000_create-personal-pro-manager-state/
                └── migration.sql
```

## Build no Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node: 22

O `netlify.toml` já contém essas configurações.

## Contas reais

- Netlify Identity
- cadastro com e-mail e senha
- confirmação de e-mail
- login
- recuperação de senha
- sem conta demo
- painel bloqueado sem autenticação

## Banco

- Netlify Database / Postgres
- tabela `personal_pro_manager_state`
- uma linha por `user.id`
- Function em `/api/state`
- GET carrega os dados
- PUT salva os dados
- DELETE zera os dados mantendo a conta

## Performance

- JavaScript puro
- Vite apenas para build e minificação
- sem React
- sem fontes externas
- sem imagens remotas
- avatar comprimido no navegador
- vídeos armazenados somente como links
- gravações com debounce

## Validação

Antes do Vite, `verify-files.mjs` verifica se todos os arquivos críticos estão presentes. Se algo for enviado ao GitHub na pasta errada, o build para com uma mensagem indicando exatamente o arquivo ausente.
