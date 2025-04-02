import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapedPage {
  url: string;
  selected: boolean;
  content?: string;
}

export const scrapeWebsite = async (url: string): Promise<ScrapedPage[]> => {
  try {
    let normalizedUrl = url;
    // Add https:// prefix if missing
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Check for HTTP -> HTTPS upgrade
    if (normalizedUrl.startsWith("http://")) {
      const httpsUrl = normalizedUrl.replace("http://", "https://");
      try {
        // Test HTTPS connection with a HEAD request
        await axios.head(httpsUrl, {
          timeout: 5000,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; YourBot/1.0)" },
        });
        normalizedUrl = httpsUrl;
      } catch (error) {
        console.log(`HTTPS unavailable, using HTTP: ${normalizedUrl}`);
      }
    }

    const visited = new Set<string>();
    const baseUrl = new URL(normalizedUrl).origin;
    const pages: ScrapedPage[] = [];

    await scrapePage(normalizedUrl, baseUrl, visited, pages);

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
  if (visited.has(url)) {
    return;
  }

  try {
    visited.add(url);
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; YourBot/1.0)" },
    });

    // Get final URL after redirects with fallback to original URL
    const finalUrl = response.config.url || url;
    const actualBaseUrl = new URL(finalUrl).origin;

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

    // Process links using actual base URL from final response
    const links = $("a[href]")
      .map((_, el) => {
        const href = $(el).attr("href");
        if (!href) return null;

        try {
          const resolvedUrl = new URL(href, actualBaseUrl);
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
          href.startsWith(actualBaseUrl) &&
          !visited.has(href) &&
          !/\.(pdf|jpg|jpeg|png|gif|svg|css|js)$/i.test(href)
      );

    // Recursive calls with actual base URL
    await Promise.all(
      links.slice(0, 5).map(async (link, index) => {
        await new Promise((resolve) => setTimeout(resolve, index * 500));
        return scrapePage(link, actualBaseUrl, visited, pages);
      })
    );
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
  }
};
