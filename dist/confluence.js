"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfluencePageContent = void 0;
const axios_1 = __importDefault(require("axios"));
const username = process.env.CONFLUENCE_USERNAME;
const apiToken = process.env.CONFLUENCE_API_TOKEN;
const baseUrl = "https://promovize.atlassian.net/wiki";
const getConfluencePageContent = (pageId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const headers = {
        Authorization: `Basic ${Buffer.from(`${username}:${apiToken}`).toString("base64")}`,
        Accept: "application/json",
      };
      // Include 'expand' query parameter to get the page content in HTML
      const url = `${baseUrl}/rest/api/content/${pageId}?expand=body.storage`;
      const response = yield axios_1.default.get(url, { headers });
      // The page content is in the 'body.storage.value' field of the response
      const pageHtmlContent = response.data.body.storage.value;
      return pageHtmlContent;
    } catch (error) {
      throw new Error("Error fetching page");
    }
  });
exports.getConfluencePageContent = getConfluencePageContent;
