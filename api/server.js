require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db/firebase");
const userRoute = require("./Routes/userRoutes");
const pdfRoute = require("./Routes/pdfRoutes");
const assistantRoute = require("./Routes/assistantRoutes");
const timeTrackingRoute = require("./Routes/timeTrackingRoutes");
const entityRoute = require("./Routes/entityRoutes");
const cadastroRoute = require("./Routes/cadastroRoutes");
const salarioRoute = require("./Routes/salarioRoutes");
const parametrosSalarioRoute = require("./Routes/parametrosSalarioRoutes");
const formacaoRoute = require("./Routes/formacaoRoutes");

const app = express();
app.use(express.json());
app.use(cors());

// Endpoint de teste
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor a funcionar!' });
});

app.use("/users", userRoute);
app.use("/files", pdfRoute);
app.use("/api/assistant", assistantRoute);
app.use("/timetracking", timeTrackingRoute);
app.use("/entities", entityRoute);
app.use("/cadastro", cadastroRoute);
app.use("/salario", salarioRoute);
app.use("/parametros-salario", parametrosSalarioRoute);
app.use("/formacao", formacaoRoute);


const PORT = process.env.PORT || 1080;
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor aberto na porta ${PORT}`));