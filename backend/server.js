// Simple Express server that serves a /api/news endpoint.
// It attempts to fetch from NewsAPI if NEWSAPI_KEY is provided in env.
// Otherwise it returns mock data.

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files from ../frontend
app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

// Helper: format article fields we care about
function formatArticle(a) {
  return {
    title: a.title || '',
    description: a.description || '',
    image: a.urlToImage || '',
    source: (a.source && a.source.name) || '',
    publishedAt: a.publishedAt || ''
  };
}

// Mock data returned if no API key
const MOCK = [
  {
    title: 'Tech startups in the Philippines see surge in funding',
    description: 'A wave of investments is flowing into Filipino startups focused on fintech and e-commerce.',
    urlToImage: 'https://via.placeholder.com/800x450.png?text=Philippines+Tech',
    source: { name: 'TechDaily' },
    publishedAt: new Date().toISOString()
  },
  {
    title: 'New gaming laptops announced with powerful GPUs',
    description: 'Major manufacturers released next-gen models optimized for creators and gamers.',
    urlToImage: 'https://via.placeholder.com/800x450.png?text=Gaming+Laptops',
    source: { name: 'GamerNews' },
    publishedAt: new Date(Date.now()-1000*60*60*6).toISOString()
  },
  {
    title: 'Climate initiatives push for cleaner cities',
    description: 'Local governments are adopting greener policies to reduce emissions.',
    urlToImage: 'https://via.placeholder.com/800x450.png?text=Climate',
    source: { name: 'WorldReport' },
    publishedAt: new Date(Date.now()-1000*60*60*24).toISOString()
  }
];

// /api/news?q=keyword
app.get('/api/news', async (req, res) => {
  const q = req.query.q || '';
  const providerParam = req.query.provider || '';

  const apiKey = process.env.NEWSAPI_KEY;

  // If provider=reddit requested, fetch from Reddit public JSON endpoints
  if (providerParam === 'reddit') {
    try {
      // If query provided, use reddit search (site-wide).
      if (q) {
        const base = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&limit=30&sort=hot&type=link`;
        const r = await fetch(base, { headers: { 'User-Agent': 'news-feed-app/1.0' } });
        if (!r.ok) return res.status(502).json({ error: 'Reddit fetch failed', status: r.status });
        const data = await r.json();
        const items = (data && data.data && data.data.children) || [];
        const articles = items.map((it) => {
          const d = it.data || {};
          let image = '';
          try {
            if (d.preview && d.preview.images && d.preview.images[0]) {
              image = d.preview.images[0].source.url.replace(/&amp;/g, '&');
            } else if (d.thumbnail && d.thumbnail.startsWith('http')) {
              image = d.thumbnail;
            }
          } catch (e) { image = ''; }
          return {
            title: d.title || '',
            description: d.selftext || d.title || '',
            image,
            source: d.subreddit_name_prefixed || (`u/${d.author}`),
            subreddit: d.subreddit || '',
            publishedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : '',
            fetchedFrom: 'reddit',
            id: d.id || d.url || d.permalink || ''
          };
        });
        const backendInfo = { provider: 'reddit', apiUrl: base, timestamp: new Date().toISOString(), totalResults: articles.length };
        return res.json({ source: 'reddit', articles, backendInfo });
      }

      // No query: aggregate hot posts from a list of common news subreddits
      const newsSubs = ['news', 'worldnews', 'technology', 'politics', 'business'];
      const fetches = newsSubs.map(sub => fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=30`, { headers: { 'User-Agent': 'news-feed-app/1.0' } }).then(r => r.ok ? r.json() : null).catch(() => null));
      const results = await Promise.all(fetches);
      let items = [];
      results.forEach((data, idx) => {
        if (data && data.data && Array.isArray(data.data.children)) {
          data.data.children.forEach((it) => {
            const d = it.data || {};
            items.push({ data: d, fromSub: newsSubs[idx] });
          });
        }
      });

      // Map and dedupe by id or url, then sort by date
      const seen = new Set();
      const articles = items.map(({ data: d, fromSub }) => {
        let image = '';
        try {
          if (d.preview && d.preview.images && d.preview.images[0]) image = d.preview.images[0].source.url.replace(/&amp;/g, '&');
          else if (d.thumbnail && d.thumbnail.startsWith('http')) image = d.thumbnail;
        } catch (e) { image = ''; }
        return {
          id: d.id || d.url || d.permalink || `${fromSub}-${d.title}`,
          title: d.title || '',
          description: d.selftext || d.title || '',
          image,
          source: d.subreddit_name_prefixed || (`u/${d.author}`),
          subreddit: d.subreddit || fromSub,
          publishedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : '',
          fetchedFrom: 'reddit'
        };
      }).filter(a => {
        if (!a.id) return false;
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      }).sort((a,b) => (new Date(b.publishedAt)).getTime() - (new Date(a.publishedAt)).getTime());

      const backendInfo = { provider: 'reddit', apiUrl: 'multiple r/*/hot', timestamp: new Date().toISOString(), totalResults: articles.length, subsQueried: newsSubs };
      return res.json({ source: 'reddit', articles, backendInfo });
    } catch (err) {
      console.error('Reddit fetch error', err);
      return res.status(500).json({ error: 'reddit_error', details: String(err) });
    }
  }

  if (!apiKey) {
    // Filter mock by keyword if provided
    const filtered = MOCK.filter(a => {
      if (!q) return true;
      const s = (a.title + ' ' + a.description).toLowerCase();
      return s.includes(q.toLowerCase());
    }).map(formatArticle).map(a => ({ ...a, fetchedFrom: 'mock' }));
    const backendInfo = {
      provider: 'mock',
      note: 'Sample/mock data returned because NEWSAPI_KEY is not set',
      timestamp: new Date().toISOString(),
      totalResults: filtered.length
    };
    return res.json({ source: 'mock', articles: filtered, backendInfo });
  }

  // Use NewsAPI.org top-headlines endpoint as an example
  const base = 'https://newsapi.org/v2/top-headlines';
  const params = new URLSearchParams({
    apiKey,
    language: 'en',
    pageSize: '30'
  });
  if (q) params.set('q', q);

  const url = `${base}?${params.toString()}`;

  try {
    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'NewsAPI error', details: text });
    }
    const data = await r.json();
    const articles = (data.articles || []).map(formatArticle).map(a => ({ ...a, fetchedFrom: 'newsapi' }));
    const backendInfo = {
      provider: 'newsapi.org',
      apiUrl: url,
      apiKeyUsed: !!apiKey,
      totalResults: data.totalResults || articles.length,
      timestamp: new Date().toISOString()
    };
    return res.json({ source: 'newsapi', articles, backendInfo });
  } catch (err) {
    console.error('Fetch error', err);
    return res.status(500).json({ error: 'server_error', details: String(err) });
  }
});

function startServer(port) {
  const s = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
    console.log('Set NEWSAPI_KEY env var to enable real NewsAPI results.');
  });

  s.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      const nextPort = Math.floor(2000 + Math.random() * 60000);
      console.warn(`Port ${port} in use, retrying on ${nextPort}`);
      setTimeout(() => startServer(nextPort), 200);
    } else {
      console.error('Server error', err);
      process.exit(1);
    }
  });
}

startServer(PORT);
