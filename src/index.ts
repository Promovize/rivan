import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { getPullRequests } from "./pull-requests";
import bodyParser from "body-parser";

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.PORT || 5001; // Use environment variable for port, with a default fallback

app.get("/", async (req, res) => {
  res.send("Hello World++--!");
});

app.get("/pull-requests", async (req, res) => {
  try {
    const pullRequests = await getPullRequests();
    res.send(pullRequests);
  } catch (error: any) {
    console.log({ error });
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
