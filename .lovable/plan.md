## Definir novo favicon

1. Copiar `user-uploads://Vector_logo_laranja_1.svg` para `public/favicon.svg`.
2. Remover `public/favicon.ico` e `public/favicon.png` para evitar que o navegador use os antigos.
3. Atualizar `index.html` substituindo qualquer `<link rel="icon">` por:
   ```html
   <link rel="icon" href="/favicon.svg" type="image/svg+xml">
   ```