require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db/firebase");
const userRoute = require("./Routes/userRoutes");
const pdfRoute = require("./Routes/pdfRoutes");
const assistantRoute = require("./Routes/assistantRoutes");

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


const PORT = 1080;
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor rodando na porta ${PORT}`));