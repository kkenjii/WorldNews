// Simple frontend script to fetch /api/news and render a social-feed style list.

const feed = document.getElementById('feed');
const tpl = document.getElementById('cardTpl');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const devNote = document.getElementById('devNote');
const devSummary = document.getElementById('devSummary');
const devToggle = document.getElementById('devToggle');
const devDetails = document.getElementById('devDetails');
const providerSelect = document.getElementById('providerSelect');

if (devToggle) {
  devToggle.addEventListener('click', () => {
    const expanded = devToggle.getAttribute('aria-expanded') === 'true';
    devToggle.setAttribute('aria-expanded', String(!expanded));
    devToggle.textContent = expanded ? 'Show details' : 'Hide details';
    devDetails.style.display = expanded ? 'none' : 'block';
  });
}

// Format ISO date to a short, readable string
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString();
}

// Create a card element from article data
function renderArticle(a) {
  const node = tpl.content.cloneNode(true);
  const img = node.querySelector('.thumb');
  const title = node.querySelector('.title');
  const desc = node.querySelector('.desc');
  const meta = node.querySelector('.meta');
  const badge = node.querySelector('.badge');
  const subredditEl = node.querySelector('.subreddit');

  img.src = a.image || 'https://via.placeholder.com/800x450.png?text=No+Image';
  img.alt = a.title || 'article image';
  title.textContent = a.title || '';
  desc.textContent = a.description || '';
  meta.textContent = `${a.source || 'Unknown'} · ${formatDate(a.publishedAt)}`;
  // Show which backend/source provided this article (e.g. newsapi or mock)
  if (badge) {
    const src = (a.fetchedFrom || 'unknown');
    badge.dataset.source = src;
    badge.textContent = src === 'newsapi' ? 'NewsAPI' : (src === 'mock' ? 'Mock' : 'Unknown');
  }
  if (subredditEl) {
    subredditEl.textContent = a.subreddit || a.source || '';
  }

  return node;
}

// Fetch articles from backend and render
async function loadArticles(q = '') {
  feed.innerHTML = '';
  const provider = (providerSelect && providerSelect.value) || 'reddit';
  const qp = [];
  if (q) qp.push(`q=${encodeURIComponent(q)}`);
  if (provider) qp.push(`provider=${encodeURIComponent(provider)}`);
  const qpstr = qp.length ? `?${qp.join('&')}` : '';
  try {
  const res = await fetch(`/api/news${qpstr}`);
    if (!res.ok) throw new Error('Network response not ok');
  const data = await res.json();
    const articles = data.articles || [];
    // Update developer note: show summary and populate details JSON
    if (devNote) {
      const source = data.source || (data.backendInfo && data.backendInfo.provider) || 'unknown';
      devSummary.textContent = `Backend source: ${source}. Returned ${articles.length} articles. Query: "${q}" Provider: "${provider}"`;
      try {
        devDetails.textContent = JSON.stringify(data.backendInfo || { source: data.source }, null, 2);
      } catch (err) {
        devDetails.textContent = String(data.backendInfo || data);
      }
      // hide details by default
      if (devToggle) {
        devToggle.setAttribute('aria-expanded', 'false');
        devToggle.textContent = 'Show details';
        devDetails.style.display = 'none';
      }
    }
    if (articles.length === 0) {
      const div = document.createElement('div');
      div.className = 'no-results';
      div.textContent = 'No articles found.';
      feed.appendChild(div);
      return;
    }

    // Render each article
    for (const a of articles) {
      const card = renderArticle(a);
      feed.appendChild(card);
    }
  } catch (err) {
    const div = document.createElement('div');
    div.className = 'no-results';
    div.textContent = 'Error loading articles.';
    feed.appendChild(div);
    console.error(err);
  }
}

searchBtn.addEventListener('click', () => loadArticles(searchInput.value.trim()));
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadArticles(searchInput.value.trim());
});

// Load default feed on page load
loadArticles();
