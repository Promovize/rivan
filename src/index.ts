import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import express from "express";
import { fakeAddComment, listenForPullRequestEvents } from "./pull-requests";
import bodyParser from "body-parser";
import { getConfluencePageContent } from "./confluence";
import moment from "moment";
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

const port = process.env.PORT || 5001;

app.get("/", async (_, res) => {
  res.send("Welcome to Smart Reviewer!");
});

app.post("/pull-request-handler", async (req, res) => {
  const signature = req.headers["x-event-key"] as string;
  const pullrequest = req.body?.pullrequest;

  res.send("OK");

  const formatedTime = moment().format("MMMM Do YYYY, h:mm:ss a");
  const timezone = moment().format("Z");

  console.dir(
    {
      event: "Review started",
      signature,
      time: `${formatedTime} Timezone: ${timezone}`,
      pullrequest: {
        id: pullrequest.id,
        title: pullrequest.title,
      },
    },
    { depth: null, colors: true },
  );

  await listenForPullRequestEvents(signature, pullrequest);

  const endTime = moment().format("MMMM Do YYYY, h:mm:ss a");
  const endtimezone = moment().format("Z");

  console.dir(
    {
      event: "Review completed",
      signature,
      time: `${endTime} Timezone: ${endtimezone}`,
      pullrequest: {
        id: pullrequest.id,
        title: pullrequest.title,
      },
    },
    { depth: null, colors: true },
  );
});

app.post("/add-comment", async (req, res) => {
  const { pullRequestId, comment } = req.body;
  const addedComment = await fakeAddComment(pullRequestId, comment);
  res.send(addedComment);
});

app.get("/review-guidelines", async (req, res) => {
  const pageId = req.query.pageId;
  const pageContent = await getConfluencePageContent(parseInt(pageId as string));
  res.send(pageContent);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
