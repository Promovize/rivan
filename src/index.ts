import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import express from "express";
import { listenForPullRequestEvents } from "./pull-requests";
import bodyParser from "body-parser";

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const port = process.env.PORT || 5001;

app.get("/", async (_, res) => {
  res.send("Welcome to Smart Reviewer!");
});

app.post("/pull-request-handler", async (req, res) => {
  const signature = req.headers["x-event-key"] as string;
  const pullrequest = req.body?.pullrequest;
  await listenForPullRequestEvents(signature, pullrequest);
  res.send("OK");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
