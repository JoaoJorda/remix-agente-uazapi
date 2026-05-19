
## Objetivo

Fazer com que o sistema sempre inicie com a paleta **laranja + preto** em vez do cinza atual, tanto para novas instalações (sem registro em `design_settings`) quanto como fallback no provider de design.

## Paleta proposta

- **Primary (laranja):** `24 95% 53%` (≈ `#F97316`)
- **Sidebar background (preto):** `0 0% 7%` (≈ `#121212`)
- **Sidebar primary (laranja):** `24 95% 53%`
- **Accent / secondary / muted (cinza neutro suave):** `24 30% 96%` (toque quente para combinar)
- **Foreground:** `0 0% 10%` (quase preto)
- **Border / input:** `24 15% 88%`
- **Ring:** mesmo do primary

Mantemos `--background` branco para o conteúdo principal continuar limpo; o contraste fica no sidebar preto + acentos laranja.

## Arquivos alterados

1. **`src/index.css`**
   - Substituir todas as variáveis HSL do `:root` (primary, secondary, accent, muted, ring, border, input, foreground e bloco `--sidebar-*`) pelos valores da paleta acima.

2. **`src/hooks/useDesignSettings.tsx`**
   - Atualizar `DEFAULT_SETTINGS` para refletir a nova paleta:
     - `primaryColor: '24 95% 53%'`
     - `sidebarBgColor: '0 0% 7%'`
     - `sidebarPrimaryColor: '24 95% 53%'`
     - `accentColor: '24 30% 96%'`
   - Isso garante que, mesmo antes de carregar do banco, a UI já apareça com laranja/preto (sem flash cinza).

## Fora do escopo

- Não vamos alterar registros existentes em `design_settings` no banco. Usuários que já personalizaram as cores mantêm as próprias. Apenas o **padrão** muda.
- Sem mudanças em componentes individuais — todos já consomem tokens semânticos (`bg-primary`, `bg-sidebar`, etc.), então a troca propaga automaticamente.

## Verificação

Após aplicar: abrir `/auth` (rota atual) e o dashboard para confirmar que botões primários ficam laranja, sidebar fica preta e não há flash cinza no carregamento.
