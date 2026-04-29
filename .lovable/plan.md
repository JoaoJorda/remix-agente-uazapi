

# Fix: Diferença de fuso horário Google Calendar ↔ Sistema

## Problema
Evento no Google Calendar marcado para **15:00–16:00** (Brasília) aparece no sistema como **18:00–19:00** — diferença de **3 horas** (UTC vs BRT).

## Causa raiz

Em `supabase/functions/google-calendar-sync/index.ts`, função **`appointmentToGoogleEvent`** (linha 116):

```ts
const startDateTime = `${appointment.date}T${appointment.time}:00`;
const startDate = new Date(startDateTime);  // ← interpretado como UTC pelo Deno!
event.start = {
  dateTime: startDate.toISOString(),  // converte 15:00 BRT → "18:00Z"
  timeZone: 'America/Sao_Paulo',
};
```

E em **`importFromGoogle`** (linha 330):

```ts
const startDate = new Date(event.start.dateTime);
const time = `${String(startDate.getHours())}:${String(startDate.getMinutes())}`;
// ← getHours() usa fuso do servidor (UTC no Deno) → mostra 18:00 ao invés de 15:00
```

Em ambiente Deno (edge function), não existe fuso local — `new Date("2026-04-17T15:00:00")` é tratado como UTC e `getHours()` retorna em UTC. Por isso some/aparece um offset de 3h.

## Correção

### 1. `appointmentToGoogleEvent` — exportar para o Google
Em vez de converter para `toISOString()` (que vira UTC), enviar a string local **sem o `Z`** e deixar o `timeZone: 'America/Sao_Paulo'` cuidar da interpretação. Esse é o padrão recomendado pela API do Google Calendar:

```ts
const startLocal = `${appointment.date}T${appointment.time}:00`;
const endLocal = computeEndLocal(appointment.date, appointment.time, duration);
event.start = { dateTime: startLocal, timeZone: 'America/Sao_Paulo' };
event.end   = { dateTime: endLocal,   timeZone: 'America/Sao_Paulo' };
```

O cálculo do `end` será feito com aritmética em string/componentes (ou via UTC apenas internamente, convertendo de volta), evitando que o fuso do servidor interfira.

### 2. `importFromGoogle` — importar do Google
Substituir `getHours()`/`getMinutes()` (que dependem do fuso do servidor) por extração explícita em **America/Sao_Paulo** usando `Intl.DateTimeFormat`:

```ts
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
});
const parts = Object.fromEntries(fmt.formatToParts(startDate).map(p => [p.type, p.value]));
const date = `${parts.year}-${parts.month}-${parts.day}`;
const time = `${parts.hour}:${parts.minute}`;
```

Isso garante que o horário salvo no banco bata com o exibido no Google Agenda.

### 3. Re-sincronizar eventos já bagunçados
Após o fix, fazer um **full-sync** novamente para reimportar os eventos com o horário correto. Eventos já importados com horário errado precisam ser:
- (a) deletados manualmente e reimportados, **ou**
- (b) corrigidos via update SQL aplicando offset de -3h

Recomendo (a): rodar o botão "Sincronização Manual" depois de limpar os eventos importados (`metadata->>source = 'google_calendar'`).

## Arquivos
- `supabase/functions/google-calendar-sync/index.ts` — corrigir `appointmentToGoogleEvent` e `importFromGoogle`

## Não muda
- Frontend (`Scheduling.tsx`) — exibe `appointment.time` direto, sem conversão. Está correto.
- Schema do banco — `date` e `time` continuam como string local de Brasília.

