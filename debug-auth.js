// Script de diagnóstico para testar autenticação
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAvB_ZzMbHWKP707oAzRDXNK7VpKdyIJds",
  authDomain: "iso-9001-d6cb8.firebaseapp.com",
  projectId: "iso-9001-d6cb8",
  storageBucket: "iso-9001-d6cb8.appspot.com",
  messagingSenderId: "218135856456",
  appId: "iso-9001-d6cb8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testAuth() {
  try {
    console.log("🔍 Iniciando diagnóstico de autenticação...");
    
    // Teste 1: Verificar endpoints públicos
    console.log("\n📡 Testando endpoints públicos:");
    
    const pingResponse = await fetch("https://api-iso-9001.onrender.com/ping");
    console.log(`/ping: ${pingResponse.status} - ${await pingResponse.text()}`);
    
    const healthResponse = await fetch("https://api-iso-9001.onrender.com/health");
    console.log(`/health: ${healthResponse.status} - ${await healthResponse.text()}`);
    
    // Teste 2: Verificar configuração do Firebase
    console.log("\n🔥 Testando configuração Firebase:");
    console.log("Project ID:", firebaseConfig.projectId);
    console.log("Auth Domain:", firebaseConfig.authDomain);
    
    // Teste 3: Simular login (precisaria de credenciais válidas)
    console.log("\n🔐 Para testar login completo, adicione credenciais válidas");
    console.log("Exemplo de uso:");
    console.log(`
    const userCredential = await signInWithEmailAndPassword(auth, "email@example.com", "password");
    const user = userCredential.user;
    const token = await user.getIdToken();
    console.log("Token gerado:", token.substring(0, 50) + "...");
    
    const response = await fetch("https://api-iso-9001.onrender.com/users/verifyTokenAndGetUserInfo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    
    console.log("Resposta da API:", response.status, await response.text());
    `);
    
  } catch (error) {
    console.error("❌ Erro no diagnóstico:", error);
  }
}

// Para executar no browser console:
window.testAuth = testAuth;

export default testAuth;