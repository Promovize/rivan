import axios from "axios";
import { PullRequestEventData } from "./types/types";
import { getReviewFromOpenAI } from "./ai";
import parseGitDiff, { AnyFileChange, GitDiff } from "parse-git-diff";
import { sendNotificationMessageAfterReview } from "./slack";
const USER_NAME = process.env.BITBUCKET_USER;
const PASSWORD = process.env.BITBUCKET_PASSWORD;

const repoSlug = "smart-reviewer-testing";
const workspace = "promovize";

const URL_PREFIX = process.env.BITBUCKET_API_URL || "https://api.bitbucket.org/2.0";

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

type Comment = {
  content: {
    raw: string;
  };
  inline?: {
    to: number;
    path: string;
  };
};

const addComment = async (pullRequestId: number, comment: Comment) => {
  const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/comments`;

  const body = {
    content: {
      raw: comment.content.raw,
    },
    inline: comment.inline,
  };

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

export const fakeAddComment = async (pullRequestId: number, comment: Comment) => {
  const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/comments`;
  try {
    const body = {
      content: {
        raw: comment.content.raw,
      },
      inline: comment.inline,
    };

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
  } catch (error: any) {
    console.log({ error: error.response?.data, fields: error.response?.data?.error?.fields });
    throw error;
  }
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

const getPullRequestStatus = async (pullRequestId: number) => {
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

  return data?.values;
};

export const listenForPullRequestEvents = async (signature: string, pullrequest: PullRequestEventData) => {
  try {
    const { id, author, title, description } = pullrequest || {};
    await addUserDefaultReviewer();
    const { nickname } = author || {};
    const pullRequestDiff = await loadPullRequestDiff(id);
    const authorInfo = await getPullRequestAuthorInfo(author.uuid);
    // @ts-ignore
    const parsedDiff = parseGitDiff(pullRequestDiff, {
      noPrefix: false,
    });
    const { files } = parsedDiff;
    const formattedDiff = formatDiffForDisplay(files);
    const review = await getReviewFromOpenAI({
      author_username: nickname,
      author_account_id: author.account_id,
      pull_request_title: title,
      review_diff: formattedDiff,
      pr_description: description,
    });

    const { choices } = review || {};
    const { message } = choices[0] || {};
    const { tool_calls } = message || {};

    const firstCall = tool_calls?.[0];
    const { function: functionData } = firstCall || {};
    await sendComments(id, functionData);

    const parsed = JSON.parse(functionData?.arguments || "{}");
    if (parsed.finalDecision === "REQUEST_CHANGES") {
      await requestChanges(id);
    }
    // @ts-ignore
    const pullRequestUrl = pullrequest?.links?.html?.href;

    await sendNotificationMessageAfterReview({
      authorInfo,
      finalDecision: parsed.finalDecision,
      pullRequestLink: pullRequestUrl,
    });

    return {
      signature,
      pullrequest,
      review,
    };
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
    const { comments = [], reviewSummary } = parsedArgumentsData;

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
