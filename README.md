# Trending News Feed (Express + Vanilla JS)

This project is a simple full-stack news feed app.

Backend: Node.js + Express
Frontend: Vanilla HTML/CSS/JS

Features:
- /api/news endpoint that returns news articles (from NewsAPI.org if you provide a key, otherwise mock data)
- Search bar to filter articles by keyword
- Clean card-based feed layout

How to run
1. Install dependencies for the backend

   npm install

   (run this inside the `backend` folder)

2. Optionally set a NewsAPI key to get live results:

   On Windows (cmd.exe):

   set NEWSAPI_KEY=your_key_here

3. Start the server (from `backend`):

   npm start

4. Open http://localhost:3000/ in your browser. The frontend is served by the Express server.

Notes:
- If no `NEWSAPI_KEY` environment variable is set, the backend returns sample mock articles.
- Frontend uses fetch() to call `/api/news`.

Developer note:
- The frontend shows a small developer note above the feed that indicates the backend `source` field (either `newsapi` or `mock`) and the query used. This helps developers quickly verify where the data came from.

Developer details (expanded):
- Click "Show details" in the developer note to see a JSON object `backendInfo` returned by the backend. It includes fields such as:
   - `provider` (e.g. `newsapi.org` or `mock`)
   - `apiUrl` (when using NewsAPI)
   - `timestamp` when the backend fetched or returned the data
   - `totalResults` returned by the provider


Project structure
```
backend/
  server.js
  package.json
frontend/
  index.html
  styles.css
  app.js
README.md
```

Development tips
- To change port, set PORT env var before starting server.
- The backend serves static files from `frontend/` so you only need one process.
 
Providers:
- The frontend includes a provider selector (top-left). Options:
   - `Reddit` — fetches popular posts using Reddit's public JSON endpoints (no key required).
   - `NewsAPI` — uses NewsAPI.org (requires `NEWSAPI_KEY` env var).
   - `Mock` — returns the sample/mock data.

To test Reddit quickly, select `Reddit` from the dropdown and click Search (or leave the query empty).
# My Python Project

## Overview
This project is a Python application that implements core functionality defined in the `my_package` module. It is structured to facilitate easy development, testing, and deployment.

## Installation
To install the required dependencies, run the following command:

```
pip install -r requirements.txt
```

## Usage
To run the application, execute the following command:

```
python -m src
```

This will invoke the main functionality defined in `my_package.main`.

## Testing
To run the tests, use the following command:

```
pytest tests/test_main.py
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.