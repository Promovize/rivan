"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewFromOpenAI = void 0;
const openai_1 = __importDefault(require("openai"));
const confluence_1 = require("./confluence");
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const contentId = process.env.CONFLUENCE_REVIEW_GUIDELINES_PAGE_ID;
const getReviewTools = (reviewData) => {
    const { author_username } = reviewData;
    const tools = [
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
const getReviewFromOpenAI = (reviewData) => __awaiter(void 0, void 0, void 0, function* () {
    const { review_diff, author_username, pull_request_title } = reviewData;
    const guidlines = yield (0, confluence_1.getConfluencePageContent)(parseInt(contentId));
    console.log({ guidlines });
    const messages = [
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
    const response = yield openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: messages,
        tools,
        tool_choice: "auto",
    });
    return response;
});
exports.getReviewFromOpenAI = getReviewFromOpenAI;
