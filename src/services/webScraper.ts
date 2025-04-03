import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapedPage {
  url: string;
  selected: boolean;
  content?: string;
}

interface PageInfo {
  url: string;
  linkCount: number; // How many times this page is linked from other pages
  depth: number; // How far from the homepage
  isTopLevel: boolean; // Is it a top-level page
}

export const scrapeWebsite = async (
  url: string,
  maxPages: number = 20
): Promise<ScrapedPage[]> => {
  try {
    const normalizedUrl = await normalizeUrl(url);
    const baseUrl = new URL(normalizedUrl).origin;

    // First, get the most important pages
    const importantUrls = await collectImportantPages(
      normalizedUrl,
      baseUrl,
      2,
      maxPages
    );

    // Then scrape only those important pages
    const visited = new Set<string>();
    const pages: ScrapedPage[] = [];

    // Use concurrency to speed up scraping
    const concurrencyLimit = 3;
    const chunks: string[][] = [];

    for (let i = 0; i < importantUrls.length; i += concurrencyLimit) {
      chunks.push(importantUrls.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map((url) => scrapePage(url, baseUrl, visited, pages, maxPages))
      );

      // Small pause between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return pages;
  } catch (error) {
    console.error("Scraping error:", error);
    throw error;
  }
};

// Enhanced function to check if a website can be scraped and how many pages it has
export const checkScrapablePages = async (
  url: string
): Promise<{
  canScrape: boolean;
  pagesCount: number;
  message: string;
}> => {
  try {
    const normalizedUrl = await normalizeUrl(url);
    const baseUrl = new URL(normalizedUrl).origin;

    // First, check if we can access the site
    try {
      const response = await axios.get(normalizedUrl, {
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; YourBot/1.0)" },
      });

      // Check if we got a successful response
      if (response.status < 200 || response.status >= 300) {
        return {
          canScrape: false,
          pagesCount: 0,
          message: `Site returned status code: ${response.status}`,
        };
      }

      // Check if we can extract links (basic content check)
      const $ = cheerio.load(response.data);
      const links = $("a[href]");

      if (links.length === 0) {
        return {
          canScrape: false,
          pagesCount: 1, // The main page exists but has no links
          message: "Site has no internal links to crawl",
        };
      }

      // Check for robots.txt
      // try {
      //   const robotsUrl = new URL("/robots.txt", baseUrl).href;
      //   const robotsResponse = await axios.get(robotsUrl, {
      //     timeout: 5000,
      //     headers: { "User-Agent": "Mozilla/5.0 (compatible; YourBot/1.0)" },
      //   });

      //   // Very simple robots.txt check - if it contains "Disallow: /" for all or our user agent
      //   if (
      //     robotsResponse.data.includes("User-agent: *") &&
      //     robotsResponse.data.includes("Disallow: /")
      //   ) {
      //     return {
      //       canScrape: false,
      //       pagesCount: 0,
      //       message: "Site disallows crawling in robots.txt",
      //     };
      //   }
      // } catch (robotsError) {
      //   // No robots.txt or couldn't fetch it - we can proceed
      //   console.log("No robots.txt or couldn't fetch it", robotsError);
      // }

      // If we got here, we can scrape - collect important pages
      const importantUrls = await collectImportantPages(
        normalizedUrl,
        baseUrl,
        2,
        100
      );

      return {
        canScrape: true,
        pagesCount: importantUrls.length,
        message: `Found ${importantUrls.length} important pages that can be scraped`,
      };
    } catch (accessError) {
      return {
        canScrape: false,
        pagesCount: 0,
        message: `Cannot access website: ${
          accessError instanceof Error
            ? accessError.message
            : String(accessError)
        }`,
      };
    }
  } catch (error) {
    console.error("Check scrapable pages error:", error);
    return {
      canScrape: false,
      pagesCount: 0,
      message: `Error checking website: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
};

// Helper function to normalize URLs
const normalizeUrl = async (url: string): Promise<string> => {
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

  return normalizedUrl;
};

// Enhanced function to collect and prioritize important pages
export const collectImportantPages = async (
  url: string,
  baseUrl: string,
  maxDepth: number = 2,
  maxPages: number = 100
): Promise<string[]> => {
  const visited = new Set<string>([url]);
  const toVisit = [{ url, depth: 0 }];
  const pageInfo: Map<string, PageInfo> = new Map();

  // Initialize the starting page
  pageInfo.set(url, {
    url,
    linkCount: 1,
    depth: 0,
    isTopLevel: true,
  });

  // First pass: collect links and count references
  while (toVisit.length > 0 && visited.size < maxPages * 2) {
    // Collect more than we need to rank them
    const { url: currentUrl, depth } = toVisit.shift()!;

    if (depth >= maxDepth) continue;

    try {
      const response = await axios.get(currentUrl, {
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; YourBot/1.0)" },
      });

      const finalUrl = response.config.url || currentUrl;
      const actualBaseUrl = new URL(finalUrl).origin;
      const $ = cheerio.load(response.data);

      // Process links and count references
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        try {
          const resolvedUrl = new URL(href, actualBaseUrl);
          resolvedUrl.hash = "";
          resolvedUrl.search = "";
          const linkUrl = resolvedUrl.href;

          if (
            linkUrl.startsWith(actualBaseUrl) &&
            !/\.(pdf|jpg|jpeg|png|gif|svg|css|js)$/i.test(linkUrl)
          ) {
            // Update link count for this URL
            if (pageInfo.has(linkUrl)) {
              const info = pageInfo.get(linkUrl)!;
              info.linkCount += 1;
              pageInfo.set(linkUrl, info);
            } else {
              // Calculate if it's a top-level page (e.g., /about/, /contact/)
              const urlPath = new URL(linkUrl).pathname;
              const pathSegments = urlPath.split("/").filter(Boolean);
              const isTopLevel = pathSegments.length <= 1;

              pageInfo.set(linkUrl, {
                url: linkUrl,
                linkCount: 1,
                depth: depth + 1,
                isTopLevel,
              });
            }

            // Add to visit queue if not visited
            if (!visited.has(linkUrl)) {
              visited.add(linkUrl);
              if (depth + 1 < maxDepth) {
                toVisit.push({ url: linkUrl, depth: depth + 1 });
              }
            }
          }
        } catch {
          // Invalid URL - ignore
        }
      });
    } catch (error) {
      console.error(`Error collecting links from ${currentUrl}:`, error);
    }
  }

  // Second pass: Score and prioritize pages
  const scoredPages = Array.from(pageInfo.values()).map((page) => {
    // Scoring algorithm:
    // - Higher link count is better (pages linked from many places are important)
    // - Lower depth is better (closer to homepage)
    // - Top-level pages get a bonus
    const linkScore = Math.min(page.linkCount, 10) / 10; // Normalize to 0-1 range, cap at 10
    const depthScore = (maxDepth - page.depth) / maxDepth; // Higher for lower depth
    const topLevelBonus = page.isTopLevel ? 0.5 : 0;

    // Calculate overall importance score (0-2 range)
    const score = linkScore + depthScore + topLevelBonus;

    return {
      url: page.url,
      score,
    };
  });

  // Sort by score (descending) and return top URLs
  return scoredPages
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPages)
    .map((page) => page.url);
};

const scrapePage = async (
  url: string,
  baseUrl: string,
  visited: Set<string>,
  pages: ScrapedPage[],
  maxPages: number = 20
): Promise<void> => {
  if (visited.has(url) || visited.size >= maxPages) {
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
    $("script, style, comment, iframe, noscript, svg").remove();

    // Get cleaned text content
    const content = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 50000); // Limit content size

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

    // Use concurrency control with Promise.all and a semaphore pattern
    const concurrencyLimit = 3;
    const chunks: string[][] = [];

    for (let i = 0; i < Math.min(links.length, 10); i += concurrencyLimit) {
      chunks.push(links.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map((link) =>
          scrapePage(link, actualBaseUrl, visited, pages, maxPages)
        )
      );

      // Small pause between chunks to be gentler on the server
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
  }
};
