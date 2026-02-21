
# 🗺️ Project Map - Fluxos e Conexões

Este arquivo serve como um "grafo" mental do projeto, mapeando as principais funcionalidades e como os arquivos interagem entre si.

## 🔑 Autenticação e Login

### **Fluxo de Login**
*   **Frontend**: `app/components/LoginModal.tsx`
    *   **Ação**: Envia credenciais (email/senha) via POST.
    *   **Conecta com**: `/api/login` (Backend).
    *   **Retorno**: Recebe o `userType` (empresa ou professional) e redireciona para `/dashboard`.
*   **Backend**: `flask-server/app.py` -> `login()`
    *   **Lógica**: Verifica hash da senha na tabela `usuarios`.
    *   **Conecta com**: Tabela `user_profiles` para determinar se é empresa (tem CNPJ) ou profissional (tem CPF) e descriptografar dados sensíveis.

---

## 📝 Cadastro de Usuários

### **Cadastro de Profissional (Funcionario)**
*   **Frontend**: `app/cadastro/funcionario/page.tsx`
    *   **Ação**: Formulário de registro para candidatos.
    *   **Conecta com**: `/api/register` (Backend).
*   **Backend**: `flask-server/app.py` -> `register_user()`
    *   **Lógica**: Cria usuário na tabela `usuarios` e perfil criptografado na tabela `user_profiles`.
    *   **Obs**: `business_type` é usado para armazenar a categoria do profissional.

### **Cadastro de Empresa**
*   **Frontend**: `app/cadastro/empresa/page.tsx`
    *   **Ação**: Formulário de registro para empresas (com CNPJ).
    *   **Conecta com**: `/api/user-profile` (Backend).
*   **Backend**: `flask-server/app.py` -> `save_user_profile()`
    *   **Lógica**: Cria ou atualiza perfil da empresa. Criptografa dados sensíveis (exceto email da empresa).

---

## 📊 Dashboard e Vagas

### **Visualização de Vagas**
*   **Frontend**: `app/dashboard/page.tsx`
    *   **Componente**: Lista de Vagas.
    *   **Conecta com**: `/api/jobs` (GET).
    *   **Lógica de Exibição**:
        *   **Se Empresa**: Vê apenas as vagas que ela mesma postou (`user_id` da empresa).
        *   **Se Profissional**: Vê todas as vagas disponíveis, *exceto* aquelas para as quais já se candidatou.

### **Criação de Vagas**
*   **Frontend**: `app/dashboard/page.tsx` (Modal "Criar Vaga")
    *   **Ação**: Envia dados da nova vaga.
    *   **Conecta com**: `/api/jobs` (POST).
*   **Backend**: `flask-server/app.py` -> `create_job()`
    *   **Conecta com**: Tabela `jobs`.
    *   **Detalhe**: Salva informações extras da empresa como JSON em `company_info_json`.

### **Candidatura a Vagas**
*   **Frontend**: `app/dashboard/page.tsx` (Botão "Candidatar-se")
    *   **Ação**: Usuário profissional clica para se aplicar.
    *   **Conecta com**: `/api/jobs/<id>/apply` (POST).
*   **Backend**: `flask-server/app.py` -> `apply_to_job()`
    *   **Lógica**: Cria registro na tabela `job_applications`. Impede candidatura duplicada.

---

## 📄 Currículos (Resumes)

### **Gerenciamento de Currículos**
*   **Frontend**: `app/dashboard/page.tsx` (Aba "Currículos")
    *   **Conecta com**: `/api/resumes` (GET).
*   **Backend**: `flask-server/app.py` -> `get_resumes()`
    *   **Conecta com**: Tabela `resumes`.
    *   **Lógica**: Retorna dados estruturados (JSONs de experiência, educação, etc. são parseados antes do envio).

---

## 💾 Banco de Dados

### **Estrutura Geral**
*   **Arquivo**: `flask-server/database.db` (SQLite).
*   **Acesso**: Via biblioteca `cs50` no Python.
*   **Conexões Principais**:
    *   `usuarios` (login) -> 1:1 -> `user_profiles` (dados detalhados).
    *   `jobs` (vagas) -> 1:N -> `job_applications` (candidaturas).
    *   `usuarios` (candidato) -> 1:1 -> `resumes` (currículo).

---

## 🔐 Segurança e Criptografia
*   **Backend Central**: `flask-server/app.py`
    *   **Ferramenta**: `cryptography.fernet`.
    *   **Regra**: Dados sensíveis (CPF, CNPJ, Telefone, Nome, Endereço de Perfil) são **sempre criptografados** antes de salvar no banco e descriptografados ao ler.
    *   **Exceção**: Emails de login e busca não são criptografados para permitir queries SQL diretas (`WHERE email = ?`).
