import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources";
import { getConfluencePageContent } from "./confluence";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const contentId = process.env.CONFLUENCE_REVIEW_GUIDELINES_PAGE_ID;
type ReviewData = {
  review_diff: string;
  author_username: string;
  pull_request_title: string;
  author_account_id: string;
  pr_description: string;
};

const getReviewTools = (reviewData: ReviewData) => {
  const { author_username, author_account_id } = reviewData;

  const tools: ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "review_frontend_pull_request",
        description: `
        This function will review a frontend pull request.
        It will return an array of comments, reviewSummary and finalDecision you should make on the pull request.
      `,
        parameters: {
          type: "object",
          properties: {
            comments: {
              type: "array",
              description: `
                This is an array of review comments you want to make on the pull request.
                Comments should be tied to a specific line of code and the file following the diff format provided. The diff has everything,
                pay attention to the \`to\` and \`path\` properties.
                A single comment should have the following format: 
                content: {
                    raw: "This is a comment on a specific line of code.", // markdown
                  },
                  inline: {
                    to: 6, // This is specified in the formated diff.
                    path: "index.js", // This is specified in the formated diff
                },
                You can mention the author when necessary in the comment. the username is ${author_username} and the account id is ${author_account_id}
                to mention the user we use this format: @{${author_account_id}}: only use the account id for mentions.
            `,
              items: {
                type: "object",
                properties: {
                  content: {
                    type: "object",
                    properties: {
                      raw: {
                        type: "string",
                        description: `
                        The comment should be in markdown format and very well formatted.
                      `,
                      },
                    },
                    required: ["raw"],
                  },
                  inline: {
                    type: "object",
                    properties: {
                      to: {
                        type: "number",
                        description: `This is the line number of the code you want to comment on.`,
                      },
                      path: {
                        type: "string",
                        description: `This is the path of the file you want to comment on.`,
                      },
                    },
                    required: ["to", "path"],
                  },
                },
              },
            },
            reviewSummary: {
              type: "object",
              properties: {
                content: {
                  type: "object",
                  properties: {
                    raw: {
                      type: "string",
                      description: `
                        This is a summary of your review. It should be in markdown format and very well formatted.
                    `,
                    },
                  },
                },
              },
            },
            finalDecision: {
              type: "string",
              enum: ["NO_STATUS", "REQUEST_CHANGES"],
              description: `
              This is the final decision you want to make on the pull request.
              If the developer has violated any of the important guidelines, you should set this to \`REQUEST_CHANGES\`.
            `,
            },
          },
          required: ["comments", "reviewSummary", "finalDecision"],
        },
      },
    },
  ];

  return tools;
};

export const getReviewFromOpenAI = async (reviewData: ReviewData) => {
  const { review_diff, author_username, pull_request_title, pr_description } = reviewData;
  const guidlines = await getConfluencePageContent(parseInt(contentId as string));
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `
        Your name is KayCode, You are assigned to conduct a comprehensive and engaging code review for a frontend pull request in a React JS project. The changes are provided in a diff that formatted in the form I'll provide later. Your review should be friendly and constructive, using emojis to keep the tone positive. Key areas to focus on include:

        Review Guidelines in HTML format, read carefully:
        ${guidlines}
      
        The received diff was formated like this to allow you to find easily the line of code you want to comment on.
        'File: header.js\n' +
        '1. + import React from "react";\n' +
        '2. + \n' +
        '3. + const Header = ({ username }) => {\n' +
        '4. +   return (\n' +
        '5. +     <header>\n' +
        '6. +       <h1>Chat App</h1>\n' +
        '7. +       <p>Welcome, {username}!</p>\n' +
        '8. +     </header>\n' +
        '9. +   );\n' +
        '10. + };\n' +
        '11. + \n' +
        '12. + export default Header;\n' +
        'File: index.js\n' +
        '1. + import React, { useState, useEffect, useContext, createContext } from "react";\n' +
        '2. + import io from "socket.io-client";\n' +
        '3. + import Header from "./header";\n' +

        The number before the line indicates the exact line number of the code you want to comment on.
        Before every first number, The is the file path.

       

        It's highly recommanded that you provide some code examples to illustrate your points when they might be complex. You can also include links to external resources that may be helpful.
        Remember to add *[OPTIONAL]* or *[REQUIRED]* before your comments to indicate if the comment is optional or required. Only return \`REQUEST_CHANGES\` in final decision if there is at least one required comment.

        **Regarding the review summary:**
        Ensure only one summary, not tied to any code line.
        Summary must check:
        PR title begins with Jira ticket number (e.g., "KU-2948 Fix text overflow...").
        PR has a clear description of changes.
        If these are not met, highlight only in the summary with bullet points.
        `,
    },
    {
      role: "user",
      content: `
      Please conduct a review of the pull request titled '${pull_request_title}', authored by ${author_username}. The pull request description is: ${pr_description}.
      The pull request includes the following diff for your examination:
      
      ${review_diff}
      
      Focus exclusively on the changes introduced by this pull request. Use the provided diff to assess the new additions and modifications, ensuring that they align with the project's standards and best practices. Your review should be thorough, addressing any potential issues while maintaining a constructive and positive tone.
        `,
    },
  ];

  const tools = getReviewTools(reviewData);

  const response = await openai.chat.completions.create({
    model: "gpt-4-1106-preview",
    messages: messages,
    tools,
    tool_choice: "auto",
  });

  return response;
};

export const findMostAccurateUser = async (nickname: string, users: any[]) => {
  const tool: ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "find_most_accurate_user",
        description: `
          This function will find the most accurate user from a list of users.
          It will return the id of the user.
        `,
        parameters: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: `
                This is the id of the user that was the most close to the provided nickname.
              `,
            },
          },
          required: ["userId"],
        },
      },
    },
  ];

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `
        Task Description:
        - Your name is KayCode.
        - Your assignment is to identify the most accurate match for a given nickname from a provided list of users.
        - Here is the list of users: ${JSON.stringify(users, null, 2)}
        - The nickname to match is: "${nickname}".
        - Your task is to compare the nickname with each user's 'name' or 'real_name' in the list.
        - Return the only 'id' of the user whose name or real_name is closest to the provided nickname like this: { userId: "U06FRLKGUN7" }.
        Return null if no user was found with a close enough match.

        examples:
        - baraka can be matched with baraka, barack, 
        - ben can be matched with 'Ben Mukebo', 'Mukebo Ben'
      `,
    },
    {
      role: "user",
      content: `
        Please process the provided user list and find the most accurate match for the nickname "${nickname}".
      `,
    },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4-1106-preview",
    messages: messages,
    tools: tool,
    tool_choice: "auto",
  });

  const { choices } = response || {};
  const { message } = choices[0] || {};
  const { tool_calls } = message || {};
  const firstCall = tool_calls?.[0];
  const { function: functionData } = firstCall || {};
  const parsed = JSON.parse(functionData?.arguments || "{}");
  const { userId } = parsed || {};
  return userId;
};
