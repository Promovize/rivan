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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const pull_requests_1 = require("./pull-requests");
const body_parser_1 = __importDefault(require("body-parser"));
const confluence_1 = require("./confluence");
const moment_1 = __importDefault(require("moment"));
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
const port = process.env.PORT || 5001;
app.get("/", (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send("Welcome to Smart Reviewer!");
}));
app.post("/pull-request-handler", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const signature = req.headers["x-event-key"];
    const pullrequest = (_a = req.body) === null || _a === void 0 ? void 0 : _a.pullrequest;
    res.send("OK");
    const formatedTime = (0, moment_1.default)().format("MMMM Do YYYY, h:mm:ss a");
    const timezone = (0, moment_1.default)().format("Z");
    console.dir({
        event: "Review started",
        signature,
        time: `${formatedTime} Timezone: ${timezone}`,
        pullrequest: {
            id: pullrequest.id,
            title: pullrequest.title,
        },
    }, { depth: null, colors: true });
    yield (0, pull_requests_1.listenForPullRequestEvents)(signature, pullrequest);
    console.dir({
        event: "Review completed",
        signature,
        time: `${formatedTime} Timezone: ${timezone}`,
        pullrequest: {
            id: pullrequest.id,
            title: pullrequest.title,
        },
    }, { depth: null, colors: true });
}));
app.post("/add-comment", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pullRequestId, comment } = req.body;
    const addedComment = yield (0, pull_requests_1.fakeAddComment)(pullRequestId, comment);
    res.send(addedComment);
}));
app.get("/review-guidelines", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const pageId = req.query.pageId;
    const pageContent = yield (0, confluence_1.getConfluencePageContent)(parseInt(pageId));
    res.send(pageContent);
}));
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
