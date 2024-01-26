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
  const { users, mostAccurateUser } = await getUsersInChannel(channel, authorInfo.display_name);

  const slackMessage = `
          Hey there, ${
            mostAccurateUser ? `<@${mostAccurateUser}>` : authorInfo.display_name
          }! This is KayCode 🤖 a KYG Bot, your friendly neighborhood code reviewer. I've reviewed your <${pullRequestLink}|pull request> and left some comments for you. Please take a look and let me know if you have any questions. The status is currently ${finalDecision}😎. Thanks!
          `;

  const res = await web.chat.postMessage({
    channel,
    text: slackMessage,
  });
  return res;
};
