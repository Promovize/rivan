import axios from "axios";
import crypto from "crypto";
import { PullRequestEventData } from "./types/types";
const USER_NAME = process.env.BITBUCKET_USER;
const PASSWORD = process.env.BITBUCKET_PASSWORD;

const repoSlug = "smart-reviewer-testing";
const workspace = "promovize";
const BITBUCKET_WEBHOOK_SECRET = process.env.BITBUCKET_WEBHOOK_SECRET;

const URL_PREFIX = process.env.BITBUCKET_API_URL || "https://api.bitbucket.org/2.0";

const getPullRequests = async () => {
  const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests`;
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

const addComment = async (pullRequestId: number, comment: string) => {
  const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/comments`;

  const body = {
    content: {
      raw: "Ensure the MongoDB server is properly secured if using localhost.",
    },
    inline: {
      from: 6,
      path: "index.js",
    },
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

export const listenForPullRequestEvents = async (signature: string, pullrequest: PullRequestEventData) => {
  try {
    const { id, author } = pullrequest || {};
    await addUserDefaultReviewer();
    const pullRequestDiff = await loadPullRequestDiff(id);
    console.log({ pullRequestDiff, author });
  } catch (error: any) {
    console.log({ error: error.response?.data });
    throw error;
  }
};
