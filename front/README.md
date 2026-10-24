# Presenteie — Front-end

SPA em React 19 + Vite, sem bibliotecas de UI: os componentes e o design system ficam em `src/components` e `src/styles`.

## Scripts

```bash
npm run dev      # servidor de desenvolvimento (http://localhost:5173)
npm run build    # build de produção em dist/
npm run lint     # oxlint
npm run preview  # serve o build localmente
```

Configure `VITE_API_URL` em `.env` (veja `.env.example`).

## Convenções

- **Estilos:** use os tokens de `src/styles/tokens.css` (cores, espaçamentos, raios, sombras). Classes seguem o padrão BEM (`bloco__elemento--modificador`).
- **Botões:** `btn` + variante (`btn--primary`, `btn--secondary`, `btn--ghost`, `btn--danger`) + tamanho opcional (`btn--sm`, `btn--lg`, `btn--block`).
- **Formulários:** envolva o controle em `<Field label hint error>`; ele associa rótulo, dica e erro ao input (acessibilidade).
- **API:** chame os endpoints por `src/api/index.js` e exiba erros com `getErrorMessage(err)`.
- **Estado global:** `useCart()`, `useAuth()` e `useToast()` (providers em `src/context`).
- **Imagens:** use `imageUrl(url, largura)`; fotos do Cloudinary recebem formato/qualidade automáticos e redimensionamento.
- **SEO:** cada página define título/descrição com `usePageMeta(titulo, descricao)`.
