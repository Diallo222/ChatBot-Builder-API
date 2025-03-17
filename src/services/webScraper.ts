import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapedPage {
  url: string;
  selected: boolean;
  content?: string;
}

export const scrapeWebsite = async (url: string): Promise<ScrapedPage[]> => {
  try {
    const visited = new Set<string>();
    const baseUrl = new URL(url).origin;
    const pages: ScrapedPage[] = [];

    await scrapePage(url, baseUrl, visited, pages);
    return pages;
  } catch (error) {
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
    const response = await axios.get(url);
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

    // Find and process links
    const links = $("a[href]")
      .map((_, el) => {
        const href = $(el).attr("href");
        if (!href) return null;

        try {
          return new URL(href, baseUrl).href;
        } catch {
          return null;
        }
      })
      .get()
      .filter(
        (href): href is string =>
          href !== null &&
          href.startsWith(baseUrl) &&
          !href.includes("#") &&
          !visited.has(href)
      );

    // Limit concurrent requests
    await Promise.all(
      links.slice(0, 5).map((link) => scrapePage(link, baseUrl, visited, pages))
    );
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
  }
};
