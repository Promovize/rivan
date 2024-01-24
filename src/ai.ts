import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ReviewData = {
  review_diff: string;
  author_username: string;
  pull_request_title: string;
};

const getReviewTools = (reviewData: ReviewData) => {
  const { author_username } = reviewData;

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
                pay attention to the \`from\` and \`path\` properties.
                A single comment should have the following format: 
                content: {
                    raw: "This is a comment on a specific line of code.", // markdown
                  },
                  inline: {
                    from: 6, // This is specified in the formated diff.
                    path: "index.js", // This is specified in the formated diff
                },
                You can mention the author when necessary by adding @username in the comment. the username is ${author_username}
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
                      from: {
                        type: "number",
                        description: `This is the line number of the code you want to comment on.`,
                      },
                      path: {
                        type: "string",
                        description: `This is the path of the file you want to comment on.`,
                      },
                    },
                    required: ["from", "path"],
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
  const { review_diff, author_username, pull_request_title } = reviewData;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `
        You are assigned to conduct a comprehensive and engaging code review for a frontend pull request in a React JS project. The changes are provided in a diff that formatted in the form I'll provide later. Your review should be friendly and constructive, using emojis to keep the tone positive. Key areas to focus on include:

        - Adhering to React JS best practices and TypeScript types.
        - Using SWR for initial data fetching in components/hooks.
        - Structuring API calls as per project guidelines, preferably from src/_api/endpoints.
        - Managing props effectively, using context or Redux for numerous props.
        - Encouraging the use of hooks for better code reuse and maintainability.
        - Avoiding the any type and ensuring descriptive naming for better clarity.
        - Following DRY principles, avoiding long and unfocused functions.
        - Keeping functions concise, focused, and maintaining code readability.
        - Avoiding inline styling and ensuring consistent code formatting.
        - Checking for efficient resource use, optimization, and proper error handling

        
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
        `,
    },
    {
      role: "user",
      content: `
      Please conduct a review of the pull request titled '${pull_request_title}', authored by ${author_username}. The pull request includes the following diff for your examination:
      
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
