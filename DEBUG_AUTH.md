# Debugging Guide - Erro 401 na Autenticação

## Problema
O endpoint `/users/verifyTokenAndGetUserInfo` retorna erro 401 (Unauthorized), enquanto `/ping` e `/health` funcionam normalmente.

## Possíveis Causas

### 1. Token Firebase Expirado/Inválido
- **Solução**: Forçar refresh do token usando `getIdToken(true)`
- **Implementado**: ✅ Adicionado nos ficheiros `login.jsx` e `userContext.js`

### 2. Headers de Autorização
- **Solução**: Adicionar header `Authorization: Bearer ${token}`
- **Implementado**: ✅ Adicionado nas requests

### 3. Configuração do Backend
Verificar se o backend está configurado corretamente:

```javascript
// Exemplo de configuração Firebase Admin no backend
const admin = require('firebase-admin');

// Verificar se o serviceAccountKey está correto
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // outras configurações...
});

// Middleware de verificação de token
const verifyToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    // ou const token = req.headers.authorization?.split(' ')[1];
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    res.status(401).json({ message: 'Token inválido ou erro ao buscar user' });
  }
};
```

## Debugging Steps

### 1. Verificar Logs do Browser
Abrir DevTools → Console e verificar:
- Token gerado está correto
- Resposta da API
- Headers da request

### 2. Testar Manualmente
```bash
# PowerShell - Testar com token real
$token = "SEU_TOKEN_AQUI"
$body = @{ token = $token } | ConvertTo-Json
Invoke-WebRequest -Uri "https://api9001.duckdns.org/users/verifyTokenAndGetUserInfo" -Method POST -ContentType "application/json" -Body $body
```

### 3. Verificar Configuração Firebase
- Confirmar que `firebaseConfig` está correto
- Verificar se o projeto Firebase está ativo
- Confirmar que Authentication está habilitado

### 4. Logs do Backend
Verificar logs do servidor para:
- Erros de configuração do Firebase Admin
- Problemas na validação do token
- Erros de CORS

## Mudanças Implementadas

### `login.jsx`
- ✅ Forçar refresh do token com `getIdToken(true)`
- ✅ Adicionar header Authorization
- ✅ Melhor logging para debugging

### `userContext.js`
- ✅ Forçar refresh do token na validação
- ✅ Adicionar header Authorization
- ✅ Melhor logging

## Next Steps

1. **Testar as mudanças** - Fazer login e verificar console
2. **Verificar backend** - Confirmar configuração Firebase Admin
3. **Logs do servidor** - Verificar erros no backend
4. **Variáveis de ambiente** - Confirmar todas as envs estão corretas

## Comandos Úteis

```bash
# Reinstalar Firebase (se necessário)
npm uninstall firebase
npm install firebase@latest

# Verificar versão
npm list firebase

# Limpar cache
npm cache clean --force
```