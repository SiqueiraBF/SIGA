---
description: Use para aplicar o padrão de configuração de e-mails em novos módulos (EmailSettingsModal).
---

# Padrão de Configuração de E-mails

Todo módulo que necessita de configuração de e-mail deve utilizar o componente reutilizável `EmailSettingsModal` (`src/components/ui/EmailSettingsModal.tsx`).

## 1. Regras de Interface e Textos
Ao acionar ou renderizar o modal, siga ESTRITAMENTE este padrão de nomenclaturas para garantir consistência visual em todo o sistema:

- **Tooltip do botão de engrenagem (IconButton):** Sempre `Configurar E-mail` (NUNCA "Configurar E-mails", "Notificações", etc).
- **Título do Modal:** `Configurar E-mail · [Nome do Módulo]`
- **Subtítulo do Modal:** Descrição funcional objetiva (Ex: `Defina quem recebe as notificações de aprovação`)
- **Chave de configuração no banco (configKeyPrefix):** Sempre iniciada com `email_` (Ex: `email_estoque`, `email_pcm_aprovacao`).

## 2. Exemplo de Implementação na UI

```tsx
import { EmailSettingsModal } from '../components/ui/EmailSettingsModal';
import { Settings } from 'lucide-react';
import { IconButton } from '../components/ui/IconButton';

// ... dentro do componente do Módulo ...

// Botão para abrir o modal
<IconButton
  icon={Settings}
  label="Configurar E-mail"
  onClick={() => setIsEmailSettingsOpen(true)}
/>

// Modal
<EmailSettingsModal
  isOpen={isEmailSettingsOpen}
  onClose={() => setIsEmailSettingsOpen(false)}
  title="Configurar E-mail · [Nome do Módulo]"
  subtitle="Defina quem recebe as notificações de [descrição do evento]"
  globalMode // <- Use isso APENAS se os e-mails forem os mesmos para TODAS as filiais (sem seletor de fazenda). Caso contrário, remova esta linha.
  steps={[
    {
      title: "Nome da Etapa (Ex: Destinatários de Aprovação)",
      subtitle: "Descrição da etapa",
      configKeyPrefix: "email_[modulo]" // A chave principal a ser salva
    }
  ]}
/>
```

## 3. Exemplo de Implementação no Backend (notificationService.ts)

Quando o modal salva os dados, ele salva em formato JSON `{ "to": "...", "cc": "..." }`.
Se o `globalMode` estiver ativo, a chave salva será EXATAMENTE `email_[modulo]`.
Se estiver desativo (por filial), a chave salva será `email_[modulo]_[fazendaId]`.

Sempre crie lógicas com fallback para chaves legadas (CSV) caso existam configurações antigas:

```typescript
const keyPrefix = fazendaId && !isGlobal ? `email_modulo_${fazendaId}` : 'email_modulo';

const settings = await systemService.getParameters([keyPrefix, \`\${keyPrefix}_to\`, \`\${keyPrefix}_cc\`]);

let to: string[] = [];
let cc: string[] = [];

// 1. Tentar ler do novo formato JSON
if (settings[keyPrefix]) {
  try {
    const parsed = JSON.parse(settings[keyPrefix]);
    to = (parsed.to || '').split(';').map(e => e.trim()).filter(Boolean);
    cc = (parsed.cc || '').split(';').map(e => e.trim()).filter(Boolean);
  } catch {
    // Ignorar e usar fallback
  }
}

// 2. Fallback para formato legado (_to / _cc) separado por vírgulas
if (to.length === 0) {
  to = settings[\`\${keyPrefix}_to\`]?.split(',').map(e => e.trim()).filter(Boolean) || [];
  cc = settings[\`\${keyPrefix}_cc\`]?.split(',').map(e => e.trim()).filter(Boolean) || [];
}
```
