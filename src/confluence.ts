import axios from "axios";

const username = process.env.CONFLUENCE_USERNAME;
const apiToken = process.env.CONFLUENCE_API_TOKEN;
const baseUrl = "https://promovize.atlassian.net/wiki";

export const getConfluencePageContent = async (pageId: number): Promise<any> => {
  try {
    const headers = {
      Authorization: `Basic ${Buffer.from(`${username}:${apiToken}`).toString("base64")}`,
      Accept: "application/json",
    };

    // Include 'expand' query parameter to get the page content in HTML
    const url = `${baseUrl}/rest/api/content/${pageId}?expand=body.storage`;

    const response = await axios.get(url, { headers });

    // The page content is in the 'body.storage.value' field of the response
    const pageHtmlContent = response.data.body.storage.value;

    return pageHtmlContent;
  } catch (error) {
    throw new Error("Error fetching page");
  }
};
