# Configuração do Subdomínio magnaiso9001.comenius.pt

## ✅ Alterações Feitas na Aplicação

### 1. **package.json**
- ✅ Homepage alterada para: `https://magnaiso9001.comenius.pt/`

### 2. **CNAME File**
- ✅ Criado arquivo `/public/CNAME` com: `magnaiso9001.comenius.pt`

### 3. **Router Configuration**
- ✅ Alterado de `HashRouter` para `BrowserRouter` para URLs limpas

### 4. **Build & Deploy**
- ✅ Build gerado com nova configuração
- ✅ Deploy feito para GitHub Pages com arquivo CNAME

## 🌐 Próximos Passos para Configuração DNS

### **No Painel de Controlo do Domínio comenius.pt:**

1. **Adicionar Record CNAME:**
   ```
   Tipo: CNAME
   Nome: magnaiso9001
   Valor: creative-alex.github.io
   TTL: 3600 (ou mínimo permitido)
   ```

2. **Ou Adicionar Record A (alternativo):**
   ```
   Tipo: A
   Nome: magnaiso9001
   Valor: 185.199.108.153
   TTL: 3600
   
   Adicionar também:
   Tipo: A
   Nome: magnaiso9001
   Valor: 185.199.109.153
   TTL: 3600
   
   Tipo: A
   Nome: magnaiso9001
   Valor: 185.199.110.153
   TTL: 3600
   
   Tipo: A
   Nome: magnaiso9001
   Valor: 185.199.111.153
   TTL: 3600
   ```

### **No GitHub (creative-alex/Magna-ISO9001):**

1. **Ir para Settings > Pages**
2. **Verificar que Custom domain está configurado:**
   - Domain: `magnaiso9001.comenius.pt`
   - ✅ Enforce HTTPS (deve estar ativado)

### **Verificação:**

Após configurar o DNS (pode demorar até 24h para propagar):

1. **Testar URLs:**
   - ✅ `https://magnaiso9001.comenius.pt/`
   - ✅ `https://magnaiso9001.comenius.pt/file`

2. **Verificar SSL:**
   - GitHub Pages fornece SSL automático para domínios personalizados

## 🔧 Comandos para Testar DNS

```bash
# Verificar propagação DNS
nslookup magnaiso9001.comenius.pt

# Verificar CNAME
dig magnaiso9001.comenius.pt CNAME

# Testar conectividade
curl -I https://magnaiso9001.comenius.pt/
```

## 📋 Status Atual

- ✅ **Frontend configurado** para novo domínio
- ✅ **CNAME file** criado e deployado
- ✅ **Router** otimizado para URLs limpas
- ⏳ **DNS Configuration** (aguarda configuração)
- ⏳ **SSL Certificate** (automático após DNS)

## 🚨 Notas Importantes

1. **Propagação DNS:** Pode demorar até 24 horas
2. **SSL Certificate:** GitHub gera automaticamente após DNS estar ativo
3. **URL Structure:** URLs serão limpas (sem `#`) depois da mudança para BrowserRouter
4. **Backwards Compatibility:** Links antigos podem precisar de redirect

A aplicação está pronta! Só falta configurar o DNS no painel do domínio comenius.pt.