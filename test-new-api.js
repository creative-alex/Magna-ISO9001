// Script para testar autenticação com a nova API
console.log("🚀 Iniciando teste de autenticação...");

// Função para testar a API
async function testNewAPI() {
  try {
    console.log("📡 Testando endpoints básicos...");
    
    // Teste ping
    try {
      const pingResponse = await fetch("https://api9001.duckdns.org/ping");
      console.log(`✅ /ping: ${pingResponse.status} - ${await pingResponse.text()}`);
    } catch (error) {
      console.log(`❌ /ping: Erro - ${error.message}`);
    }
    
    // Teste health
    try {
      const healthResponse = await fetch("https://api9001.duckdns.org/health");
      console.log(`✅ /health: ${healthResponse.status} - ${await healthResponse.text()}`);
    } catch (error) {
      console.log(`❌ /health: Erro - ${error.message}`);
    }
    
    // Teste verifyToken com token inválido
    try {
      const tokenResponse = await fetch("https://api9001.duckdns.org/users/verifyTokenAndGetUserInfo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: "test-token" }),
      });
      
      const responseText = await tokenResponse.text();
      console.log(`🔐 /verifyToken (teste): ${tokenResponse.status} - ${responseText}`);
    } catch (error) {
      console.log(`❌ /verifyToken: Erro - ${error.message}`);
    }
    
    console.log("\n📊 Resumo do Diagnóstico:");
    console.log("1. Se /ping e /health funcionam = API está online");
    console.log("2. Se /verifyToken retorna 401 = Problema na configuração Firebase Admin");
    console.log("3. Se /verifyToken retorna 500 = Erro interno do servidor");
    console.log("4. Se /verifyToken retorna erro de CORS = Problema de configuração CORS");
    
  } catch (error) {
    console.error("❌ Erro geral no teste:", error);
  }
}

// Executar teste
testNewAPI();

// Para debug do token Firebase no browser
console.log(`
🔧 Para debug manual no browser:
1. Fazer login no Firebase
2. Executar no console:
   firebase.auth().currentUser.getIdToken(true).then(token => console.log(token))
3. Copiar o token e testar manualmente:
   
   fetch("https://api9001.duckdns.org/users/verifyTokenAndGetUserInfo", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ token: "SEU_TOKEN_AQUI" })
   }).then(r => r.json()).then(console.log)
`);