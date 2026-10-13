# Academico+ — Frontend

SPA em React + TypeScript + Vite que consome a API do `academico-api`. Ver o
[README raiz](../README.md) para a visão geral do projeto e
[docs/CONECTANDO_FRONT_BACKEND.md](../docs/CONECTANDO_FRONT_BACKEND.md) para o guia de como as
telas falam com o backend (camadas, padrão de tela nova, modo de mocks).

## Stack

- React 19 + TypeScript
- Vite 8
- React Router 7 (`react-router-dom`) — rotas em `src/App.tsx`, com guards de autenticação
  (`RotaProtegida`) e de nível de acesso ADMIN (`RotaAdmin`)
- Tailwind CSS 4

## Rodando localmente

```bash
cp .env.example .env   # ajuste VITE_API_URL se o backend não estiver em localhost:8080
npm install
npm run dev
```

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento do Vite (padrão: `http://localhost:5173`) |
| `npm run build` | Type-check (`tsc -b`) + build de produção em `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Serve o build de produção localmente, pra conferir antes de deployar |

Dá pra rodar as telas sem o `academico-api` de pé, com dados fictícios: defina
`VITE_USE_MOCKS=true` no `.env` e reinicie o `npm run dev` (Vite só lê o `.env` na subida).
Detalhes de como o modo mock funciona e como adicionar uma rota nova nele estão em
`docs/CONECTANDO_FRONT_BACKEND.md`, seção 6.

## Estrutura

```
src/
├── pages/       # uma tela por arquivo (login, dashboard, projetos, candidaturas, admin*, ...)
├── components/  # componentes reutilizáveis (layout, header, menu lateral, cards, formulários)
├── services/    # um arquivo por Controller do backend — única camada que fala com a API
├── routes/      # guards de rota (RotaProtegida, RotaAdmin)
└── utils/       # helpers de exibição compartilhados (labels/badges de status, formatação)
```
