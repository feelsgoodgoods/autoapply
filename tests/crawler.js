const { crawlUrl } = require('../utils/crawler'); // Replace with the actual file name

async function testCrawl() {
  const testUrl = 'https://charleskarpatixxx xdsz.com'; // Replace with a URL for testing
  console.log(`Starting crawl test for ${testUrl}`);

  try {
    const links = await crawlUrl(testUrl);
    if (links) {
      console.log(`Crawl completed. Number of links found: ${links.length}`);
      console.log('First few links:', links.slice(0, 10)); // Display the first few links for inspection
    } else {
      console.log('Crawl completed. No links found.');
    }
  } catch (error) {
    console.error('Crawl test failed:', error.message);
  }
}

testCrawl();
