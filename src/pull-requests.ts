import axios from "axios";
import { PullRequestEventData } from "./types/types";
import { getReviewFromOpenAI } from "./ai";
import parseGitDiff, { AnyFileChange, GitDiff } from "parse-git-diff";
const USER_NAME = process.env.BITBUCKET_USER;
const PASSWORD = process.env.BITBUCKET_PASSWORD;

const repoSlug = "smart-reviewer-testing";
const workspace = "promovize";
const BITBUCKET_WEBHOOK_SECRET = process.env.BITBUCKET_WEBHOOK_SECRET;

const URL_PREFIX = process.env.BITBUCKET_API_URL || "https://api.bitbucket.org/2.0";

const getPullRequestStatuses = async (pullRequestId: number) => {
  const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/statuses`;
  const { data } = await axios.get(url, {
    auth: {
      username: USER_NAME!,
      password: PASSWORD!,
    },
    headers: {
      Accept: "application/json",
    },
  });

  const { values } = data;

  return values;
};

const requestChanges = async (pullRequestId: number) => {
  const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/request-changes`;

  const { data } = await axios.post(
    url,
    {},
    {
      auth: {
        username: USER_NAME!,
        password: PASSWORD!,
      },
      headers: {
        Accept: "application/json",
      },
    },
  );

  return data;
};

const approve = async (pullRequestId: number) => {
  const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/approve`;
  const { data } = await axios.post(
    url,
    {},
    {
      auth: {
        username: USER_NAME!,
        password: PASSWORD!,
      },
      headers: {
        Accept: "application/json",
      },
    },
  );

  return data;
};

type Comment = {
  content: {
    raw: string;
  };
  inline?: {
    from: number;
    path: string;
  };
};

const addComment = async (pullRequestId: number, comment: Comment) => {
  const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/comments`;

  const body = comment;

  const { data } = await axios.post(url, body, {
    auth: {
      username: USER_NAME!,
      password: PASSWORD!,
    },
    headers: {
      Accept: "application/json",
    },
  });

  return data;
};

const loadPullRequestDiff = async (pullRequestId: number) => {
  const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/diff`;

  const { data } = await axios.get(url, {
    auth: {
      username: USER_NAME!,
      password: PASSWORD!,
    },
    headers: {
      Accept: "application/json",
    },
  });

  return data;
};

const getCurrentUser = async () => {
  const url = `${URL_PREFIX}/user`;

  const { data } = await axios.get(url, {
    auth: {
      username: USER_NAME!,
      password: PASSWORD!,
    },
    headers: {
      Accept: "application/json",
    },
  });

  return data;
};

const addUserDefaultReviewer = async () => {
  try {
    const currentUser = await getCurrentUser();
    const defaultReviewers = await getDefaultReviewers();
    const isCurrentUserDefaultReviewer = defaultReviewers?.some(
      (reviewer: any) => reviewer.user.uuid === currentUser.uuid,
    );
    if (isCurrentUserDefaultReviewer) return;

    const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/default-reviewers/${currentUser.username}`;
    await axios.put(url, {
      auth: {
        username: USER_NAME!,
        password: PASSWORD!,
      },
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    throw error;
  }
};

const getDefaultReviewers = async () => {
  const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/effective-default-reviewers`;

  const { data } = await axios.get(url, {
    auth: {
      username: USER_NAME!,
      password: PASSWORD!,
    },
    headers: {
      Accept: "application/json",
    },
  });

  return data?.values;
};

interface Change {
  type: "AddedLine" | "DeletedLine" | "UnchangedLine";
  lineBefore?: number;
  lineAfter?: number;
  content: string;
}

interface Chunk {
  changes: Change[];
}

interface FileDiff {
  chunks: Chunk[];
}

export const listenForPullRequestEvents = async (signature: string, pullrequest: PullRequestEventData) => {
  try {
    const { id, author, title } = pullrequest || {};
    await addUserDefaultReviewer();
    const { nickname } = author || {};
    const pullRequestDiff = await loadPullRequestDiff(id);
    const authorInfo = await getPullRequestAuthorInfo(author.uuid);
    const parsedDiff = parseGitDiff(pullRequestDiff, {
      noPrefix: false,
    });
    const { files } = parsedDiff;
    const formattedDiff = formatDiffForDisplay(files);
    const review = await getReviewFromOpenAI({
      author_username: nickname,
      pull_request_title: title,
      review_diff: formattedDiff,
    });

    const { choices } = review || {};
    const { message } = choices[0] || {};
    const { tool_calls } = message || {};

    const firstCall = tool_calls?.[0];
    const { function: functionData } = firstCall || {};
    await sendComments(id, functionData);
  } catch (error: any) {
    console.log({ error: error.response?.data });
    throw error;
  }
};

const formatDiffForDisplay = (files: AnyFileChange[]) => {
  let formattedOutput = "";
  files.forEach((file) => {
    // @ts-ignore
    formattedOutput += `File: ${file.path}\n`;
    file.chunks.forEach((chunk) => {
      // @ts-ignore
      chunk.changes.forEach((change) => {
        if (change.type !== "DeletedLine") {
          const linePrefix = change.type === "AddedLine" ? "+" : " ";
          const lineNumber = change.type === "AddedLine" ? change.lineAfter : change.lineBefore;
          formattedOutput += `${lineNumber}. ${linePrefix} ${change.content}\n`;
        }
      });
    });
  });

  return formattedOutput;
};

const sendComments = async (pullRequestId: number, functionData: any) => {
  try {
    const { arguments: argumentsData } = functionData;
    const parsedArgumentsData = JSON.parse(argumentsData || "{}");
    const { comments = [], reviewSummary, finalDecision } = parsedArgumentsData;

    for (const comment of comments) {
      await addComment(pullRequestId, comment);
    }
    await addComment(pullRequestId, reviewSummary);
  } catch (error: any) {
    throw error;
  }
};

const getPullRequestAuthorInfo = async (userUuid: string) => {
  const url = `${URL_PREFIX}/users/${userUuid}`;
  const { data } = await axios.get(url, {
    auth: {
      username: USER_NAME!,
      password: PASSWORD!,
    },
    headers: {
      Accept: "application/json",
    },
  });

  return data;
};
