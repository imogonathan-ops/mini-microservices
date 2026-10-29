const express = require("express");
const { publier } = require("./publish");

const app = express();
app.use(express.json());

const USERS_URL = process.env.USERS_URL || "http://localhost:3001";

app.get("/orders/:userId", async (req, res) => {
  const r = await fetch(`${USERS_URL}/users/${req.params.userId}`);
  if (!r.ok) return res.status(404).json({ error: "Utilisateur inconnu" });
  const user = await r.json();
  res.json({ user, orders: [{ id: 101, total: 42 }] });
});

app.post("/orders", async (req, res) => {
  await publier(req.body);
  res.status(202).json({ status: "commande envoyée" });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Orders service sur ${PORT}`));