# Módulo de Drenagem de Postos (Drainage Module)

Este módulo é responsável por gerenciar o ciclo completo de **Aferições e Drenagens** de tanques fluídos do Sistema Nadiana. Ele foi arquitetado para funcionar com alta performance tanto na versão Desktop Web quanto no PWA Mobile.

## 🏗 Arquitetura e Componentes Atuais
O módulo mudou de uma arquitetura estática para uma fluída orientada a Estado Remoto (React Query). A UI foi atomizada em lógicas reutilizáveis.

*   **`DrainageFormModal.tsx`**: O modal primário Web para submissões isoladas (Um Posto, Um Tanque). 
*   **`DrainageBatchFormModal.tsx`**: O gerador de lotes para submissões massivas por fazenda. 
    *   *Sub-módulo*: `DrainageBatchStationCard.tsx` - O card acoplado de cada posto dentro do formulário massivo, gerencia expansões sanfonadas e controle de tanques extras.
*   **`DrainageDetailsModal.tsx`**: Tela de leitura (*Read-Only*) e deleção, servindo os dados de uma drenagem previamente efetuada. 
*   **`DrainageEmailSettingsModal.tsx`**: O formulário do painel Global de parâmetros AWS (System Parameters), manipulando os destinatários de relatório por E-mail (TO/CC).
*   **`DrainageTutorialModal.tsx`**: Tela de ajuda nativa descrevendo a lógica de negócios da Aferição.
*   **`SharedDrainageTypes.ts`**: Fonte da verdade TypeScript. Contém as interfaces (ex: `StationEntry`) que evitam dependências circulares entre o Dashboard Web e os formulários Mobile PWA.

## 💡 Engine Fotográfica Compartilhada
Para manter a coesão UI/UX, o **PWA e o App Web** consomem mutuamente o componente de Câmera central:
*   `src/components/ui/PhotoEvidenceUploader.tsx`: Responsável por abrir a lente fotográfica no Android/iOS ou renderizar uma área *Drag&Drop* em mouses.

## 🛡️ Fluxo de Dados e Segurança
Este módulo opera sobre as 3 engrenagens lógicas da aplicação:

1.  **Fetcher (`useDrainageData`)**: Hidrata a lista da página com cache nativo. Busca relatórios cruzados.
2.  **Edge Security (`useDrainageSubmit`)**: Responsável unicamente pela etapa *CREATE/UPDATE*. Ele carrega os robustos `drainageSchema.ts` (Zod), barrando mutações mal feitas ou fotos corrompidas, garantindo 100% de estabilidade e impedindo payloads sujos à nuvem Supabase.
3.  **Rollback Atmosférico (`drainageService`)**: Se o envio de dados textuais para a nuvem falhar por instabilidade de rede ou ACL, a exclusão automática de fotos (`rollback`) ocorre simultaneamente, poupando espaço de Storage AWS e evitando os *Orphaned Objects*.

## 📱 Mobile First (Modo PWA)
A versão móvel deste módulo (`src/pages/mobile/MobileDrainage.tsx`) adota o padrão tap & go com formulários expandidos para uso agressivo (dedos gordos e luvas), dispensando as abas e modais da versão Web e enviando direto via Hook.
