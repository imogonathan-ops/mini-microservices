import express from "express";
import cors from "cors";
import router from "./users.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/users", router);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Users service sur ${PORT}`));
