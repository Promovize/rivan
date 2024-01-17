import axios from "axios";
import base64 from "base-64";

const USER_NAME = process.env.BITBUCKET_USER;
const PASSWORD = process.env.BITBUCKET_PASSWORD;

const projectKey = "promovize";
const repoSlug = "smart-reviewer-testing";

// const URL_PREFIX = process.env.BITBUCKET_API_URL || "https://api.bitbucket.org/2.0";
const URL_PREFIX = "https://api.bitbucket.org/2.0";

export const getPullRequests = async () => {
  //   const url = `${URL_PREFIX}/projects/${projectKey}/repos/${repoSlug}/pull-requests`;
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
