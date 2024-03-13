import { WebClient } from "@slack/web-api";
import { findMostAccurateUser } from "./ai";

const token = process.env.SLACK_BOT_TOKEN;
const channelId = process.env.SLACK_CHANNEL_ID;

const web = new WebClient(token);

type SlackMessage = {
  authorInfo: {
    display_name: string;
    email: string;
  };
  finalDecision: string;
  pullRequestLink: string;
};

export async function getUsersInChannel(channelId: string, nickname: string) {
  const response = await web.conversations.members({ channel: channelId });
  const users = [];
  for (const userId of response?.members || []) {
    const userInfo = await web.users.info({ user: userId });
    if (userInfo.user) {
      users.push({
        id: userId,
        name: userInfo.user.real_name,
        real_name: userInfo.user.real_name,
      });
    }
  }

  const mostAccurateUser = await findMostAccurateUser(nickname, users);

  return {
    users,
    mostAccurateUser: mostAccurateUser ? mostAccurateUser : null,
  };
}

export const sendNotificationMessageAfterReview = async (message: SlackMessage) => {
  const { authorInfo, finalDecision, pullRequestLink } = message;
  const channel = channelId!;
  const { mostAccurateUser } = await getUsersInChannel(channel, authorInfo.display_name);

  console.log({ mostAccurateUser });
  const slackBlocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Hello ${
          mostAccurateUser ? `<@${mostAccurateUser}>` : authorInfo.display_name
        },\nThis is an automated message from KayCode :robot_face: regarding your recent Pull Request.`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Pull Request",
          },
          url: pullRequestLink,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Current Status: *${
          finalDecision === "REQUEST_CHANGES" ? "Changes Requested :recycle:" : finalDecision
        }*`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${
          finalDecision === "REQUEST_CHANGES"
            ? "Please note that changes have been requested."
            : "Your pull request has been successfully processed. :white_check_mark:"
        }\n\nKeep up the good work! :tada:`,
      },
    },
  ];

  const res = await web.chat.postMessage({
    channel,
    blocks: slackBlocks,
    text: "Pull Request Review Status",
  });
  console.log({ res });

  return res;
};
