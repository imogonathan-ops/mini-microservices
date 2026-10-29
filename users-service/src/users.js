// usersRouter
const express = require("express");
const router = express.Router();

const users = [];

router.get("/", (req, res) => {
    res.json(users);
});

router.post("/", (req, res) => {
    const user = req.body;
    users.push(user);
    res.status(201).json(user);
});

export default router;
