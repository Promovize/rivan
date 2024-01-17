import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { addComment, getPullRequests, loadPullRequestDiff, requestChanges } from "./pull-requests";
import bodyParser from "body-parser";

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.PORT || 5001;

app.get("/", async (req, res) => {
  res.send("Welcome to Smart Reviewer!");
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

app.post("/pull-requests/:id/request-changes", async (req, res) => {
  try {
    const { id } = req.params;
    const pullRequest = await requestChanges(parseInt(id));
    res.send(pullRequest);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

app.post("/pull-requests/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const pullRequest = await requestChanges(parseInt(id));
    res.send(pullRequest);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

app.post("/pull-requests/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const comment = req.body;
    const pullRequest = await addComment(parseInt(id), comment?.text);
    res.send(pullRequest);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

app.get("/pull-requests/:id/diff", async (req, res) => {
  try {
    const { id } = req.params;
    const pullRequest = await loadPullRequestDiff(parseInt(id));
    res.send(pullRequest);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
