const express = require("express");
const cors = require("cors");
const db = require("./db/firebase"); 
const path = require("path");
const serviceAccount = require(path.join(__dirname, "./db/serviceAccountKey.json"));
const userRoute = require("./Routes/userRoutes");

const app = express();
app.use(express.json());
app.use(cors());

app.use("/users", userRoute);


const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor rodando na porta ${PORT}`));