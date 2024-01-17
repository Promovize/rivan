import axios from "axios";

const USER_NAME = process.env.BITBUCKET_USER;
const PASSWORD = process.env.BITBUCKET_PASSWORD;

const repoSlug = "smart-reviewer-testing";
const workspace = "promovize";
import commentText from "./markdown_content.json";

const URL_PREFIX = process.env.BITBUCKET_API_URL || "https://api.bitbucket.org/2.0";

export const getPullRequests = async () => {
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

// "links": {
//     "self": {
//         "href": "https://api.bitbucket.org/2.0/repositories/promovize/smart-reviewer-testing/pullrequests/1"
//     },
//     "html": {
//         "href": "https://bitbucket.org/promovize/smart-reviewer-testing/pull-requests/1"
//     },
//     "commits": {
//         "href": "https://api.bitbucket.org/2.0/repositories/promovize/smart-reviewer-testing/pullrequests/1/commits"
//     },
//     "approve": {
//         "href": "https://api.bitbucket.org/2.0/repositories/promovize/smart-reviewer-testing/pullrequests/1/approve"
//     },
//     "request-changes": {
//         "href": "https://api.bitbucket.org/2.0/repositories/promovize/smart-reviewer-testing/pullrequests/1/request-changes"
//     },
//     "diff": {
//         "href": "https://api.bitbucket.org/2.0/repositories/promovize/smart-reviewer-testing/diff/promovize/smart-reviewer-testing:880f6cfd06f8%0D2cb6bf83ceb7?from_pullrequest_id=1&topic=true"
//     },
//     "diffstat": {
//         "href": "https://api.bitbucket.org/2.0/repositories/promovize/smart-reviewer-testing/diffstat/promovize/smart-reviewer-testing:880f6cfd06f8%0D2cb6bf83ceb7?from_pullrequest_id=1&topic=true"
//     },
//     "comments": {
//         "href": "https://api.bitbucket.org/2.0/repositories/promovize/smart-reviewer-testing/pullrequests/1/comments"
//     },
//     "activity": {
//         "href": "https://api.bitbucket.org/2.0/repositories/promovize/smart-reviewer-testing/pullrequests/1/activity"
//     },
//     "merge": {
//         "href": "https://api.bitbucket.org/2.0/repositories/promovize/smart-reviewer-testing/pullrequests/1/merge"
//     },
//     "decline": {
//         "href": "https://api.bitbucket.org/2.0/repositories/promovize/smart-reviewer-testing/pullrequests/1/decline"
//     },
//     "statuses": {
//         "href": "https://api.bitbucket.org/2.0/repositories/promovize/smart-reviewer-testing/pullrequests/1/statuses"
//     }
// },

export const getPullRequestStatuses = async (pullRequestId: number) => {
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

export const requestChanges = async (pullRequestId: number) => {
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

export const approve = async (pullRequestId: number) => {
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

export const addComment = async (pullRequestId: number, comment: string) => {
  const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/comments`;

  const body = {
    content: {
      raw: commentText.text,
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

export const loadPullRequestDiff = async (pullRequestId: number) => {
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
