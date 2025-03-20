import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapedPage {
  url: string;
  selected: boolean;
  content?: string;
}

export const scrapeWebsite = async (url: string): Promise<ScrapedPage[]> => {
  // console.log("url", url);

  try {
    const visited = new Set<string>();
    const baseUrl = new URL(url).origin;
    const pages: ScrapedPage[] = [];

    await scrapePage(url, baseUrl, visited, pages);
    // console.log("pages", pages);

    return pages;
  } catch (error) {
    console.log("error", error);

    console.error("Scraping error:", error);
    throw error;
  }
};

const scrapePage = async (
  url: string,
  baseUrl: string,
  visited: Set<string>,
  pages: ScrapedPage[]
): Promise<void> => {
  if (visited.has(url) || !url.startsWith(baseUrl)) {
    return;
  }

  try {
    visited.add(url);
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; YourBot/1.0)" },
    });
    const $ = cheerio.load(response.data);

    // Remove script tags, style tags, and comments
    $("script, style, comment").remove();

    // Get cleaned text content
    const content = $("body").text().replace(/\s+/g, " ").trim();

    pages.push({
      url,
      selected: false,
      content,
    });

    // Improved link filtering
    const links = $("a[href]")
      .map((_, el) => {
        const href = $(el).attr("href");
        if (!href) return null;

        try {
          const resolvedUrl = new URL(href, baseUrl);
          // Normalize URL and remove query parameters
          resolvedUrl.hash = "";
          resolvedUrl.search = "";
          return resolvedUrl.href;
        } catch {
          return null;
        }
      })
      .get()
      .filter(
        (href): href is string =>
          href !== null &&
          href.startsWith(baseUrl) &&
          !visited.has(href) &&
          // Exclude common non-html extensions
          !/\.(pdf|jpg|jpeg|png|gif|svg|css|js)$/i.test(href)
      );

    // Add delay between requests and better concurrency control
    await Promise.all(
      links.slice(0, 5).map(async (link, index) => {
        await new Promise((resolve) => setTimeout(resolve, index * 500));
        return scrapePage(link, baseUrl, visited, pages);
      })
    );
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
  }
};
