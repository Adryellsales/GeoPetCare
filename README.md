# 🐾 GEO Pet Care — Sistema Completo

Sistema de Match e Gestão para ONG de adoção de animais.
Desenvolvido com base no Documento de Requisitos (Março 2026 — UnG).

---

## 📁 Estrutura do Projeto

```
geopetcare/
├── frontend/
│   ├── geo_pet_care.html      ← Site público (adotantes, doadores)
│   └── geo_admin.html         ← Painel back-office (admin/vet)
│
├── src/                       ← API Node.js + Express
│   ├── server.js              ← Ponto de entrada
│   ├── routes/index.js        ← Todas as rotas
│   ├── controllers/
│   │   ├── authController.js       ← Login, registro, JWT
│   │   ├── animalController.js     ← CRUD animais + triagem
│   │   ├── voluntarioController.js ← Cadastro e validação
│   │   └── doacaoController.js     ← Doações + dashboard
│   ├── services/
│   │   └── matchService.js         ← Algoritmo de IA (RF07)
│   ├── middlewares/
│   │   └── auth.js                 ← autenticar + autorizar
│   └── config/
│       └── database.js             ← Pool MySQL
│
├── sql/
│   └── schema.sql             ← Banco de dados completo
│
├── .env.example               ← Variáveis de ambiente
├── package.json
└── README.md
```

---

## 🚀 Como Rodar

### 1. Pré-requisitos
- Node.js 18+
- MySQL 8+

### 2. Banco de dados
```sql
-- No MySQL Workbench ou terminal mysql:
source /caminho/para/geopetcare/sql/schema.sql
```

### 3. Variáveis de ambiente
```bash
cp .env.example .env
# Edite .env com suas credenciais MySQL
```

### 4. Instalar dependências e iniciar
```bash
npm install
npm run dev     # desenvolvimento (nodemon)
npm start       # produção
```

### 5. Frontend
Abra os arquivos HTML diretamente no navegador:
- `frontend/geo_pet_care.html` → site público
- `frontend/geo_admin.html`   → painel administrativo

---

## 🔗 Endpoints da API

Base URL: `http://localhost:3000/api/v1`

### Autenticação
| Método | Rota            | Acesso  | Descrição              |
|--------|-----------------|---------|------------------------|
| POST   | /auth/registro  | Público | Cria conta             |
| POST   | /auth/login     | Público | Login → retorna JWT    |
| GET    | /auth/me        | 🔒 Auth | Dados do usuário logado|

### Animais (RF01)
| Método | Rota                        | Acesso         | Descrição                    |
|--------|-----------------------------|----------------|------------------------------|
| GET    | /animais/catalogo           | Público        | Catálogo com RN01 aplicado   |
| GET    | /animais/:id                | Público        | Detalhes de um animal        |
| GET    | /animais                    | 🔒 Admin/Vet   | Lista completa (back-office) |
| POST   | /animais                    | 🔒 Admin/Vet   | Cadastrar novo resgate       |
| PUT    | /animais/:id                | 🔒 Admin/Vet   | Atualizar animal             |
| DELETE | /animais/:id                | 🔒 Admin       | Remover animal               |
| GET    | /animais/microchip/:codigo  | 🔒 Admin/Vet   | Autopreenchimento por chip   |

### Match por IA (RF06 + RF07)
| Método | Rota   | Acesso              | Descrição                         |
|--------|--------|---------------------|-----------------------------------|
| POST   | /match | Público (token opt) | Executa algoritmo, retorna matches|

### Voluntários (RF02)
| Método | Rota                       | Acesso    | Descrição              |
|--------|----------------------------|-----------|------------------------|
| POST   | /voluntarios               | 🔒 Auth   | Cadastrar voluntário   |
| GET    | /voluntarios               | 🔒 Admin  | Listar voluntários     |
| PUT    | /voluntarios/:id/validar   | 🔒 Admin  | Aprovar/reprovar (UC02)|

### Doações (RF05 + RF04)
| Método | Rota                      | Acesso   | Descrição                    |
|--------|---------------------------|----------|------------------------------|
| GET    | /doacoes/dashboard        | Público  | Portal da transparência (RF04)|
| POST   | /doacoes                  | Público  | Criar doação (Pix/Cartão/Boleto)|
| POST   | /doacoes/:id/confirmar    | 🔒 Admin | Confirmar pagamento (webhook) |
| POST   | /doacoes/:id/pix-fallback | Público  | Fallback Pix se cartão falhar|

---

## 🧪 Exemplos de uso (curl)

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@geopetcare.org","senha":"password"}'
```

### Cadastrar animal (RF01)
```bash
curl -X POST http://localhost:3000/api/v1/animais \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Thor",
    "especie": "cachorro",
    "raca": "Labrador",
    "porte": "grande",
    "classificacao_risco": "baixo",
    "nivel_energia": "alto",
    "data_resgate": "2026-03-01",
    "castrado": true,
    "vacinado": true
  }'
```

### Rodar o quiz de match (RF06 + RF07)
```bash
curl -X POST http://localhost:3000/api/v1/match \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_moradia": "casa_com_quintal",
    "possui_criancas": false,
    "possui_outros_animais": false,
    "tempo_livre_diario_h": 6,
    "experiencia_previa": "intermediario",
    "preferencia_especie": "cachorro",
    "preferencia_porte": "grande",
    "preferencia_energia": "alto"
  }'
```

### Fazer doação via Pix
```bash
curl -X POST http://localhost:3000/api/v1/doacoes \
  -H "Content-Type: application/json" \
  -d '{"valor": 50.00, "metodo": "pix", "recorrente": false}'
```

---

## 📋 Regras de Negócio Implementadas

| Regra | Descrição                                                      | Onde          |
|-------|----------------------------------------------------------------|---------------|
| RN01  | Animais críticos/graves bloqueados do catálogo público         | VIEW MySQL + animalController |
| RN02  | Alerta ao atingir 28+ animais na sede (limite: 30)             | animalController.criar        |
| RF03  | Tag "Cachorro Invisível" automática para animais com ≥90 dias  | VIEW MySQL                    |
| UC03  | Sem matches abaixo de 30% → mensagem + sugestão de e-mail      | matchService                  |
| UC02  | CPF bloqueado permanentemente ao ser reprovado                 | voluntarioController          |
| RNF05 | Dados de cartão nunca armazenados no banco                     | doacaoController              |

---

## 🔐 Perfis de Usuário

| Perfil       | Acesso                                              |
|--------------|-----------------------------------------------------|
| `admin`      | Tudo — incluindo validar voluntários e remover dados|
| `veterinario`| Cadastrar e editar animais, ver triagem             |
| `adotante`   | Quiz de match, ver catálogo                         |
| `voluntario` | Cadastrar-se como lar temporário                    |
| `doador`     | Realizar doações autenticadas                       |
