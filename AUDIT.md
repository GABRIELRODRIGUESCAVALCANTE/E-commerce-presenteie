# 🔍 Sistema de Observabilidade, Logging e Auditoria de Segurança

Este documento descreve a arquitetura, configuração e operação do sistema profissional de **Logging Estruturado (Pino)** e **Auditoria Persistente (PostgreSQL)** implementado no E-commerce **Presenteie**.

---

## 📌 Visão Geral

O sistema foi desenhado para garantir **rastreabilidade end-to-end (requisição → log → auditoria)**, alta performance, resiliência e estrita observância de requisitos de segurança.

### Principais Pilares:
1. **Logging Estruturado em JSON:** Utiliza `pino` para logs de alto desempenho.
2. **Redação Automática de Segredos:** Senhas, tokens JWT, cartões de crédito e chaves de API são sanitizados antes de irem para logs ou banco de dados.
3. **Identificador Único (`requestId`):** Todas as requisições recebem ou geram um `X-Request-ID` em UUID v4 retornado nos cabeçalhos HTTP e propagado em todos os eventos.
4. **Auditoria Persistente com `JSONB`:** Registros das alterações em recursos críticos (`old_values`, `new_values`, `changed_fields`).
5. **Resiliência:** Falhas na gravação da auditoria são tratadas de forma não-bloqueante, evitando interromper transações comerciais legítimas.

---

## 🛠️ Arquitetura e Componentes

| Componente | Arquivo | Finalidade |
| :--- | :--- | :--- |
| **Logger** | `lib/logger.js` | Logger Pino configurado com níveis `debug`, `info`, `warn`, `error` e redação automática. |
| **Request Logger** | `middleware/requestLogger.js` | Middleware HTTP para injeção de `requestId`, medição de tempo de resposta e log estruturado. |
| **Audit Service** | `services/auditService.js` | Utilitários de sanitização, cálculo de diff (`computeDiff`), gravação segura e limpeza de retenção. |
| **Migrations** | `migrations/001_create_audit_logs.sql` | Schema DDL com a tabela `audit_logs` e índices otimizados. |
| **Migration Runner** | `scripts/migrate.js` | Script Node.js idempotente para execução automática ou via CLI das migrations. |

---

## 💾 Estrutura da Tabela `audit_logs`

```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    changed_fields JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(100),
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Índices Criados:
- `idx_audit_logs_user_id` (consultas por usuário)
- `idx_audit_logs_resource` (consultas por `resource_type` e `resource_id`)
- `idx_audit_logs_action` (consultas por tipo de ação)
- `idx_audit_logs_created_at` (consultas temporais)
- `idx_audit_logs_request_id` (correlação end-to-end com logs)

---

## 📋 Ações Auditadas

| Categoria | Ação | Descrição |
| :--- | :--- | :--- |
| **Autenticação** | `USER_LOGIN` / `LOGIN_FAILED` | Sucesso e falhas de login. |
| **Autenticação** | `USER_LOGOUT` | Encerrar sessão. |
| **Autenticação** | `USER_REGISTERED` | Criação de novos usuários. |
| **Segurança** | `UNAUTHORIZED_ACCESS_ATTEMPT` | Tentativas de acesso a rotas sem autenticação (HTTP 401). |
| **Segurança** | `FORBIDDEN_ACCESS_ATTEMPT` | Tentativas de acesso de usuários sem privilégio de Admin (HTTP 403). |
| **Categorias** | `CATEGORY_CREATED` | Criação de categorias no catálogo. |
| **Produtos** | `PRODUCT_CREATED` | Cadastro de novos produtos. |
| **Estoque** | `STOCK_UPDATED` | Alteração de estoque com gravação de `old_values` e `new_values` (diff). |
| **Produtos** | `PRODUCT_DELETED` | Exclusão (soft delete `ativo = false`) com registro de diff. |
| **Pedidos** | `ORDER_CREATED` | Finalização de pedidos e baixa no estoque. |
| **Pedidos** | `ORDER_STATUS_UPDATED` | Atualização do status do pedido (`pendente` → `em_separacao` → `enviado` → `entregue`). |

---

## 🔒 Proteção e Sanitização de Dados Sensíveis

Tanto o **Pino Logger** quanto o **Audit Service** utilizam listas de redação para garantir que segredos nunca sejam salvos em texto claro ou nos logs da aplicação.

### Campos Sanitizados Automáticos:
- `password`, `pass`, `senha`
- `token`, `authorization`, `cookie`
- `secret`, `api_secret`, `better_auth_secret`
- `creditCard`, `cardNumber`, `cvv`

Exemplo de estado sanitizado no banco:
```json
{
  "email": "cliente@email.com",
  "password": "[REDACTED]"
}
```

---

## 🔎 Rastreabilidade e Investigação de Incidentes via `requestId`

Se um problema for reportado, você pode investigar o fluxo completo utilizando o `X-Request-ID`:

1. **Localize o `X-Request-ID`** no cabeçalho da resposta HTTP ou no log de erro.
2. **Filtre no Pino Log:**
   ```bash
   node server.js | pino-pretty --filter 'requestId === "8f42a5c..."'
   ```
3. **Consulte a Tabela de Auditoria (ou API de Admin):**
   ```sql
   SELECT * FROM audit_logs WHERE request_id = '8f42a5c...';
   ```

---

## 🛡️ Rota Administrativa de Consulta de Auditoria

Existe um endpoint interno protegido estritamente para administradores:

**GET** `/api/admin/audit-logs`

### Parâmetros de Filtro (Query Parameters):
- `page`: Número da página (padrão: 1)
- `limit`: Itens por página (máximo: 100)
- `user_id`: ID do usuário
- `action`: Tipo de ação (ex: `STOCK_UPDATED`)
- `resource_type`: Tipo de recurso (ex: `produto`, `pedido`)
- `resource_id`: ID do recurso
- `request_id`: UUID da requisição
- `success`: `true` ou `false`

*Nota: Usuários comuns não possuem acesso a este endpoint (retorna HTTP 403).*

---

## 🧹 Política de Retenção de Logs

Por padrão, a recomendação é reter os logs de auditoria por **90 dias** em ambiente de produção (configurável via `AUDIT_RETENTION_DAYS`).

A função `cleanOldAuditLogs(pool, retentionDays)` em `services/auditService.js` pode ser agendada via Cron ou tarefa periódica no servidor para remover registros antigos automaticamente.

---

## ⚙️ Variáveis de Ambiente Adicionadas

Adicione as seguintes variáveis no seu arquivo `.env`:

```env
# Nível do Logger Pino (debug, info, warn, error)
LOG_LEVEL=info

# Retenção em dias para registros de auditoria no PostgreSQL
AUDIT_RETENTION_DAYS=90
```

---

## 🧪 Como Executar as Migrations e Testes

### Executar Migrations Manualmente:
```bash
npm run migrate
```

### Executar Suíte de Testes Automatizados:
```bash
npm test
```
