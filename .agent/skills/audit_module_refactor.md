---
name: Audit Module Refactoring
description: Skill para conduzir uma auditoria técnica rigorosa em um módulo antes de iniciar sua refatoração, identificando pontos críticos e sugerindo melhorias com base na arquitetura mestre.
---

# Diretrizes para Auditoria de Módulos (Refactoring Audit)

Quando o workflow `/refatoracaomodulo` for iniciado passo 1, ou quando o Agente Mestre requisitar uma auditoria profunda em um código legado, siga este checklist para diagnosticar o estado do módulo:

## 1. Avaliação de Arquitetura e Estrutura
- **Padrão de Rotas:** O módulo ainda utiliza Pages Router ao invés do Next.js App Router (sugerido pelo padrão atual)?
- **Separação de Responsabilidades:** Existe regra de negócio pesada ou queries de banco de dados diretamente dentro de componentes `.tsx`? (Essas devem ser extraídas para rotas de API, Server Actions ou Hooks).
- **Multitenancy Isolado:** O código garante, em todas as consultas e visões, o isolamento dos dados por filiais/fazendas (sistema Tenant)?

## 2. Avaliação de Banco de Dados e RLS (Supabase)
- **RLS Ativo:** Existem tabelas sem Row Level Security ou queries que possam vazar dados de outros Tenants?
- **Padrão de Acesso Seguro:** Existem chamadas inseguras diretas do frontend (ex: `supabase.from('x')`) que deveriam estar encapsuladas no backend devido à complexidade ou níveis de segurança?
- **Eficiência Estrutural:** Foram definidos relacionamentos adequados nas tabelas para evitar over-fetch ou cascata de requests (problema de N+1)?

## 3. Avaliação de UI, UX e Padrões (Desktop e Mobile)
- **Design Tokens:** O módulo ainda usa cores fixadas grosseiras (ex: `bg-blue-500`) em vez de consumir o Design System (veja skills `ui_design_tokens` e `mobile_ui_tokens`)?
- **Estética Bio-Futurista & Glassmorphism:** O uso de componentes antigos quebra a coesão do layout geral? Faltam efeitos como transparência adaptativa ou realces da cor mestre da marca ('Teal') no Desktop?
- **Mobile First e Interatividade:** O fluxo ou listagens da versão mobile (`/app/...`) falham no princípio "Tap & Go" (ex: dependendo de tabelas minúsculas difíceis de arrastar/clicar na tela do celular)?

## 4. Geração do Relatório de Auditoria
Sua saída (Output) formal após aplicar esta skill num módulo deve ser o **Relatório de Auditoria de Módulo**, contendo estritamente:
1. **Pontos Críticos (Prioridade 0)**: Violações graves de segurança, quebras de Tenant ou quebras visuais fatais.
2. **Débito Técnico Identificado**: O que precisa mudar metodologicamente (migrar pro App Router, mover do T-SQL bruto para Edge Functions, etc).
3. **Plano de Ação Recomendado (Blueprint)**: Sugestão para o Arquiteto e Desenvolvedores de como será a jornada de refatoração, arquivo por arquivo ou componente por componente.
