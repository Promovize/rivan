import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import express from "express";
import { fakeAddComment, listenForPullRequestEvents } from "./pull-requests";
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

  res.send("OK");
  const date = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
  console.log("Received pull request event", signature, date);
  await listenForPullRequestEvents(signature, pullrequest);
  console.log("Finished processing pull request event", signature, date);
});

app.post("/add-comment", async (req, res) => {
  const { pullRequestId, comment } = req.body;
  const addedComment = await fakeAddComment(pullRequestId, comment);
  res.send(addedComment);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
