const puppeteer = require('puppeteer');

(async () => {
  let links = ['https://example.com']
  console.log('scrapeLinks:', links)
  const browser = await puppeteer.launch({ headless: "new" }); // Launch browser instance here
  console.log('scrapeLinks - Browser launched')
  const allChunks = []; 
  for (const link of links) {
    console.log('scrapeLinks Scraping Link')
    const chunks = await scrapeLink(browser, link); // Pass the browser instance to scrapeLink
    allChunks.push(chunks);
    console.log('scrapeLinks Finished', allChunks.length)
  }
  await browser.close(); // Close browser after all links are processed
})();


async function scrapeLink(browser, link) {
  const maxChunkSize = 24000;
  const overlapFraction = .2;

  const page = await browser.newPage(); // Use the passed browser instance
  let chunks = [];

  try {
    await page.goto(link, { waitUntil: 'networkidle2', timeout: 10000 });
    // Extract text content
    const textContent = await page.evaluate(() => {
      document.querySelectorAll('script, style, img, link, svg, head, header, footer, nav, noscript, iframe').forEach(el => el.remove());
      document.querySelectorAll('*').forEach(el => {
        ['class', 'style', 'id', 'role', 'tabindex', 'hidden', 'target', 'rel', 'lang'].forEach(attr => el.removeAttribute(attr));
        Array.from(el.attributes).forEach(attr => {
          if (/^(aria-|data-)/.test(attr.name)) el.removeAttribute(attr.name);
        });
      });
      let text = document.body.innerHTML.replace(/(\r\n|\n|\r)/gm, " ");
      return text;
    });

    // Assuming splitTextIntoChunks is a function that you've implemented
    const textChunks = splitTextIntoChunks(textContent, maxChunkSize, overlapFraction);
    chunks = textChunks;
  } catch (error) {
    console.error(`Failed to scrape ${link}:`, error.message);
  } finally {
    await page.close(); // Close the page, but not the browser
  }
  return chunks;
}