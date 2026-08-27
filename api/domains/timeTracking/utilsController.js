const ping = async (req, res) => {
  try {
    console.log("Ping recebido");
    res.status(200).json({ message: "Pong" });
  } catch (error) {
    console.error("Erro no ping:", error);
    res.status(500).json({ error: "Erro no ping" });
  }
};

module.exports = {
  ping
};
