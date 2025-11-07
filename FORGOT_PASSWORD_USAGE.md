# Implementação de "Forgot Password" com Firebase

## Resumo

Foi implementado um sistema completo de recuperação de senha usando Firebase Auth, dividido em dois componentes:

1. **`forgotPassword.jsx`**: Para solicitar reset de senha (enviar email)
2. **`firstLogin.jsx`**: Para definir nova senha (após clicar no link do email)

## Fluxo Completo

### 1. Solicitar Recuperação de Senha
- Utilizador clica em "Esqueci a minha senha" no login
- É redirecionado para `/forgot-password`
- Insere o email e clica em "Enviar Email de Recuperação"
- Firebase envia email com link de reset

### 2. Definir Nova Senha
- Utilizador clica no link do email recebido
- Firebase redireciona para `/reset-password?oobCode=CODIGO&mode=resetPassword`
- O componente `firstLogin.jsx` detecta o código e verifica a validade
- Se válido, mostra formulário para definir nova senha
- Após confirmação, a senha é alterada no Firebase

## Componentes

### ForgotPassword (`forgotPassword.jsx`)
**Função**: Enviar email de recuperação de senha

**Funcionalidades**:
- Validação de formato de email
- Envio de email via `sendPasswordResetEmail`
- Tratamento de erros em português
- Redirecionamento automático após sucesso

### FirstLogin (`firstLogin.jsx`)
**Função**: Alterar senha (primeiro login OU após reset)

**Modos de Operação**:
- **First Login**: Quando `mode="firstLogin"` ou sem parâmetros
- **Reset Password**: Quando detecta `oobCode` na URL

**Funcionalidades**:
- Verificação automática do código de reset via `verifyPasswordResetCode`
- Confirmação de nova senha via `confirmPasswordReset`
- Validação de força da senha
- Interface adaptativa baseada no contexto

## Configuração de Rotas

```javascript
// App.js
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<FirstLogin mode="reset" />} />
```

## Como Funciona Tecnicamente

### 1. Fluxo de Forgot Password
```javascript
// No forgotPassword.jsx
await sendPasswordResetEmail(auth, email);
```

### 2. Verificação do Código de Reset
```javascript
// No firstLogin.jsx
const oobCode = searchParams.get("oobCode");
await verifyPasswordResetCode(auth, oobCode);
```

### 3. Confirmação da Nova Senha
```javascript
// No firstLogin.jsx
await confirmPasswordReset(auth, resetCode, newPassword);
```

## Configuração Necessária no Firebase

### 1. Firebase Console
- Ativar Authentication > Sign-in method > Email/Password
- Configurar templates de email (opcional)
- Definir URLs de redirecionamento

### 2. URL de Redirecionamento
Configure no Firebase Console para redirecionar para:
```
https://seudominio.com/reset-password
```

### 3. Template de Email (Opcional)
Personalize o template de email em:
Firebase Console > Authentication > Templates > Password reset

## Tratamento de Erros

### Envio de Email
- `auth/user-not-found`: "Não existe uma conta associada a este email."
- `auth/invalid-email`: "O formato do email não é válido."
- `auth/too-many-requests`: "Muitas tentativas. Tente novamente mais tarde."

### Verificação de Código
- `auth/invalid-action-code`: "O link de recuperação é inválido ou já foi usado."
- `auth/expired-action-code`: "O link de recuperação expirou. Solicite um novo."

### Confirmação de Senha
- `auth/weak-password`: "A senha é muito fraca. Use uma senha mais forte."
- `auth/invalid-action-code`: "O código de recuperação é inválido ou já foi usado."

## Segurança

- ✅ Emails enviados pelo Firebase (seguro e confiável)
- ✅ Códigos de reset têm expiração automática
- ✅ Códigos só podem ser usados uma vez
- ✅ Validação de força da senha
- ✅ Rate limiting automático do Firebase
- ✅ Redirecionamento seguro após alteração

## Vantagens desta Implementação

1. **Separação de Responsabilidades**: Cada componente tem uma função específica
2. **Fluxo Nativo do Firebase**: Usa o fluxo padrão e recomendado
3. **Experiência do Utilizador**: Feedback claro em cada etapa
4. **Segurança**: Aproveita todas as proteções do Firebase
5. **Manutenibilidade**: Código organizado e fácil de manter

## URLs de Exemplo

- **Solicitar reset**: `https://seuapp.com/forgot-password`
- **Definir nova senha**: `https://seuapp.com/reset-password?oobCode=ABC123&mode=resetPassword`
- **Primeiro login**: `https://seuapp.com/reset-password`

Esta implementação segue as melhores práticas do Firebase e proporciona uma experiência segura e intuitiva para os utilizadores.