// Cálculo de distância de condução (km) entre duas moradas, via Routes API da Google
// (computeRouteMatrix) - usado pelas deslocações registadas em
// api/domains/deslocacoes/deslocacoesController.js. Field mask reduzido ao mínimo
// (sem duração/trânsito) para manter o pedido no SKU mais barato da Routes API.
async function calcularDistanciaKm(origem, destino) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error("Cálculo de distância não configurado (falta GOOGLE_MAPS_API_KEY).");
  }

  const resp = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "originIndex,destinationIndex,condition,distanceMeters,status",
    },
    body: JSON.stringify({
      origins: [{ waypoint: { address: origem } }],
      destinations: [{ waypoint: { address: destino } }],
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
    }),
  });

  const results = await resp.json();

  if (!resp.ok) {
    // A Routes API devolve o erro real em {"error": {code, message, status}} (chave inválida,
    // API não ativada, faturação desligada, field mask inválido, etc.) - regista sempre o
    // corpo completo no servidor, já que a mensagem devolvida ao utilizador é genérica de propósito.
    console.error("Erro da Routes API (computeRouteMatrix):", resp.status, JSON.stringify(results));
    throw new Error("Não foi possível calcular a distância entre as moradas indicadas. Verifique se estão corretas.");
  }

  const result = Array.isArray(results) ? results[0] : results;
  if (!result || result.condition !== "ROUTE_EXISTS" || !result.distanceMeters) {
    console.error("Resposta inesperada da Routes API (computeRouteMatrix):", JSON.stringify(results));
    throw new Error("Não foi possível calcular a distância entre as moradas indicadas. Verifique se estão corretas.");
  }
  return Math.round((result.distanceMeters / 1000) * 10) / 10;
}

module.exports = { calcularDistanciaKm };
