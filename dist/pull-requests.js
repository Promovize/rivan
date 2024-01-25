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
exports.listenForPullRequestEvents = exports.fakeAddComment = void 0;
const axios_1 = __importDefault(require("axios"));
const ai_1 = require("./ai");
const parse_git_diff_1 = __importDefault(require("parse-git-diff"));
const USER_NAME = process.env.BITBUCKET_USER;
const PASSWORD = process.env.BITBUCKET_PASSWORD;
const repoSlug = "smart-reviewer-testing";
const workspace = "promovize";
const URL_PREFIX = process.env.BITBUCKET_API_URL || "https://api.bitbucket.org/2.0";
// const getPullRequestStatuses = async (pullRequestId: number) => {
//   const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/statuses`;
//   const { data } = await axios.get(url, {
//     auth: {
//       username: USER_NAME!,
//       password: PASSWORD!,
//     },
//     headers: {
//       Accept: "application/json",
//     },
//   });
//   const { values } = data;
//   return values;
// };
const requestChanges = (pullRequestId) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/request-changes`;
    const { data } = yield axios_1.default.post(url, {}, {
        auth: {
            username: USER_NAME,
            password: PASSWORD,
        },
        headers: {
            Accept: "application/json",
        },
    });
    return data;
});
const addComment = (pullRequestId, comment) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/comments`;
    const body = {
        content: {
            raw: comment.content.raw,
        },
        inline: comment.inline,
    };
    const { data } = yield axios_1.default.post(url, body, {
        auth: {
            username: USER_NAME,
            password: PASSWORD,
        },
        headers: {
            Accept: "application/json",
        },
    });
    return data;
});
const fakeAddComment = (pullRequestId, comment) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/comments`;
    try {
        const body = {
            content: {
                raw: comment.content.raw,
            },
            inline: comment.inline,
        };
        console.log({ body, url });
        const { data } = yield axios_1.default.post(url, body, {
            auth: {
                username: USER_NAME,
                password: PASSWORD,
            },
            headers: {
                Accept: "application/json",
            },
        });
        return data;
    }
    catch (error) {
        console.log({ error: (_a = error.response) === null || _a === void 0 ? void 0 : _a.data, fields: (_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.fields });
        throw error;
    }
});
exports.fakeAddComment = fakeAddComment;
const loadPullRequestDiff = (pullRequestId) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/pullrequests/${pullRequestId}/diff`;
    const { data } = yield axios_1.default.get(url, {
        auth: {
            username: USER_NAME,
            password: PASSWORD,
        },
        headers: {
            Accept: "application/json",
        },
    });
    return data;
});
const getCurrentUser = () => __awaiter(void 0, void 0, void 0, function* () {
    const url = `${URL_PREFIX}/user`;
    const { data } = yield axios_1.default.get(url, {
        auth: {
            username: USER_NAME,
            password: PASSWORD,
        },
        headers: {
            Accept: "application/json",
        },
    });
    return data;
});
const addUserDefaultReviewer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = yield getCurrentUser();
        const defaultReviewers = yield getDefaultReviewers();
        const isCurrentUserDefaultReviewer = defaultReviewers === null || defaultReviewers === void 0 ? void 0 : defaultReviewers.some((reviewer) => reviewer.user.uuid === currentUser.uuid);
        if (isCurrentUserDefaultReviewer)
            return;
        const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/default-reviewers/${currentUser.username}`;
        yield axios_1.default.put(url, {
            auth: {
                username: USER_NAME,
                password: PASSWORD,
            },
            headers: {
                Accept: "application/json",
            },
        });
    }
    catch (error) {
        throw error;
    }
});
const getDefaultReviewers = () => __awaiter(void 0, void 0, void 0, function* () {
    const url = `${URL_PREFIX}/repositories/${workspace}/${repoSlug}/effective-default-reviewers`;
    const { data } = yield axios_1.default.get(url, {
        auth: {
            username: USER_NAME,
            password: PASSWORD,
        },
        headers: {
            Accept: "application/json",
        },
    });
    return data === null || data === void 0 ? void 0 : data.values;
});
const listenForPullRequestEvents = (signature, pullrequest) => __awaiter(void 0, void 0, void 0, function* () {
    var _e;
    try {
        const { id, author, title } = pullrequest || {};
        console.log({ signature, pullrequest });
        yield addUserDefaultReviewer();
        const { nickname } = author || {};
        const pullRequestDiff = yield loadPullRequestDiff(id);
        console.log({ pullRequestDiff });
        const authorInfo = yield getPullRequestAuthorInfo(author.uuid);
        console.log({ authorInfo });
        const parsedDiff = (0, parse_git_diff_1.default)(pullRequestDiff, {
            noPrefix: false,
        });
        const { files } = parsedDiff;
        const formattedDiff = formatDiffForDisplay(files);
        console.log({ formattedDiff });
        const review = yield (0, ai_1.getReviewFromOpenAI)({
            author_username: nickname,
            pull_request_title: title,
            review_diff: formattedDiff,
        });
        const { choices } = review || {};
        const { message } = choices[0] || {};
        const { tool_calls } = message || {};
        const firstCall = tool_calls === null || tool_calls === void 0 ? void 0 : tool_calls[0];
        console.log({ firstCall });
        const { function: functionData } = firstCall || {};
        yield sendComments(id, functionData);
        const parsed = JSON.parse((functionData === null || functionData === void 0 ? void 0 : functionData.arguments) || "{}");
        if (parsed.finalDecision === "REQUEST_CHANGES") {
            yield requestChanges(id);
        }
    }
    catch (error) {
        console.log({ error: (_e = error.response) === null || _e === void 0 ? void 0 : _e.data });
        throw error;
    }
});
exports.listenForPullRequestEvents = listenForPullRequestEvents;
const formatDiffForDisplay = (files) => {
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
const sendComments = (pullRequestId, functionData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { arguments: argumentsData } = functionData;
        const parsedArgumentsData = JSON.parse(argumentsData || "{}");
        const { comments = [], reviewSummary } = parsedArgumentsData;
        for (const comment of comments) {
            yield addComment(pullRequestId, comment);
        }
        yield addComment(pullRequestId, reviewSummary);
    }
    catch (error) {
        throw error;
    }
});
const getPullRequestAuthorInfo = (userUuid) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `${URL_PREFIX}/users/${userUuid}`;
    const { data } = yield axios_1.default.get(url, {
        auth: {
            username: USER_NAME,
            password: PASSWORD,
        },
        headers: {
            Accept: "application/json",
        },
    });
    return data;
});
