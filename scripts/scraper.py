import requests
from bs4 import BeautifulSoup
import psycopg2
from datetime import date
import time

# ============================================
# DATABASE CONNECTION
# ============================================
DB_CONFIG = {
    "host": "localhost",
    "database": "inventory_db",
    "user": "postgres",
    "password": "simiyu"
}

# ============================================
# KEYWORDS THAT AFFECT SUPPLY
# ============================================
SUPPLY_KEYWORDS = [
    "shortage", "supply chain", "drought", "flood", "war", "sanctions",
    "trade ban", "export ban", "price surge", "inflation", "disruption",
    "wheat", "grain", "milk", "dairy", "sugar", "fuel", "transport",
    "strike", "port", "shipment", "harvest", "crop"
]

# ============================================
# CREATE TABLE IF NOT EXISTS
# ============================================
def create_table(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS supply_risk_events (
                event_id     SERIAL PRIMARY KEY,
                headline     TEXT NOT NULL,
                source       VARCHAR(100),
                url          TEXT,
                scraped_date DATE DEFAULT CURRENT_DATE,
                keywords_matched TEXT,
                created_at   TIMESTAMP DEFAULT NOW()
            );
        """)
        conn.commit()
    print("Table supply_risk_events ready.")

# ============================================
# SCRAPE BBC NEWS
# ============================================
def scrape_bbc():
    print("Scraping BBC News...")
    url = "https://feeds.bbci.co.uk/news/world/rss.xml"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.content, "lxml-xml")
        items = soup.find_all("item")
        articles = []
        for item in items:
            title = item.find("title").text if item.find("title") else ""
            link = item.find("link").text if item.find("link") else ""
            articles.append({"headline": title, "url": link, "source": "BBC News"})
        print(f"  Found {len(articles)} articles from BBC News")
        return articles
    except Exception as e:
        print(f"  BBC scrape failed: {e}")
        return []

# ============================================
# SCRAPE GOOGLE NEWS
# ============================================
def scrape_google_news():
    print("Scraping Google News...")
    url = "https://news.google.com/rss/search?q=supply+chain+shortage+food&hl=en-US&gl=US&ceid=US:en"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.content, "lxml-xml")
        items = soup.find_all("item")
        articles = []
        for item in items:
            title = item.find("title").text if item.find("title") else ""
            link = item.find("link").text if item.find("link") else ""
            articles.append({"headline": title, "url": link, "source": "Google News"})
        print(f"  Found {len(articles)} articles from Google News")
        return articles
    except Exception as e:
        print(f"  Google News scrape failed: {e}")
        return []

# ============================================
# FILTER BY SUPPLY KEYWORDS
# ============================================
def filter_relevant(articles):
    relevant = []
    for article in articles:
        headline_lower = article["headline"].lower()
        matched = [kw for kw in SUPPLY_KEYWORDS if kw in headline_lower]
        if matched:
            article["keywords_matched"] = ", ".join(matched)
            relevant.append(article)
    print(f"\nRelevant supply-risk articles found: {len(relevant)}")
    return relevant

# ============================================
# SAVE TO DATABASE
# ============================================
def save_to_db(conn, articles):
    with conn.cursor() as cur:
        inserted = 0
        for article in articles:
            cur.execute(
                "SELECT 1 FROM supply_risk_events WHERE headline = %s AND scraped_date = %s",
                (article["headline"], date.today())
            )
            if cur.fetchone():
                continue
            cur.execute("""
                INSERT INTO supply_risk_events
                    (headline, source, url, scraped_date, keywords_matched)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                article["headline"],
                article["source"],
                article["url"],
                date.today(),
                article.get("keywords_matched", "")
            ))
            inserted += 1
        conn.commit()
        print(f"Saved {inserted} new supply risk events to database.")

# ============================================
# MAIN
# ============================================
def main():
    print("=" * 50)
    print("SUPPLY RISK EVENT SCRAPER")
    print(f"Date: {date.today()}")
    print("=" * 50)
    conn = psycopg2.connect(**DB_CONFIG)
    print("Connected to inventory_db")
    create_table(conn)
    all_articles = []
    all_articles += scrape_bbc()
    time.sleep(2)
    all_articles += scrape_google_news()
    relevant = filter_relevant(all_articles)
    if relevant:
        save_to_db(conn, relevant)
    else:
        print("No relevant supply risk articles found today.")
    conn.close()
    print("\nScraper completed successfully!")
    print("=" * 50)

if __name__ == "__main__":
    main()