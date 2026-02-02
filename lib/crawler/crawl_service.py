import sys
import asyncio
import json
import argparse
from crawl4ai import AsyncWebCrawler

async def crawl_url(url: str):
    """
    Crawls a single URL using Crawl4AI and returns the result as JSON.
    """
    async with AsyncWebCrawler(verbose=True) as crawler:
        result = await crawler.arun(url=url)
        
        # We focus on returning the clean markdown content which is most useful for LLMs
        output = {
            "title": result.metadata.get("title", "No Title"),
            "url": url,
            "markdown": result.markdown,
            "media": result.media,
            "success": result.success,
            "error_message": result.error_message
        }
        
        # Print JSON to stdout for the calling process to capture
        print(json.dumps(output, ensure_ascii=False))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Crawl a URL using Crawl4AI")
    parser.add_argument("url", help="The URL to crawl")
    args = parser.parse_args()

    # Run the crawler
    try:
        asyncio.run(crawl_url(args.url))
    except Exception as e:
        # Fallback error handling
        error_out = {
            "success": False,
            "url": args.url,
            "error_message": str(e),
            "markdown": ""
        }
        print(json.dumps(error_out))
