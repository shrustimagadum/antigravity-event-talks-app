# BigQuery Release Pulse

An interactive, premium dashboard application built with Python Flask, plain HTML, CSS, and JavaScript. It fetches the latest Google Cloud BigQuery release notes feed in real-time, splits the notes into granular categories, and includes an assistant interface to tweet updates.

---

## 🌟 Features

*   **Real-time Proxy Parser**: Fetches the GCP XML feed directly from Flask backend to bypass browser CORS policies.
*   **Granular Parsing**: Deconstructs HTML release notes into individual bullet points/updates.
*   **Glassmorphic Design**: Clean aesthetic utilizing transparent panel blurs, neon accents, dark backgrounds, and responsive sizing.
*   **Live Search and Category Tagging**: Search note descriptions or isolate entries by badges: `Feature`, `Changed`, `Deprecated`, or `Fixed`.
*   **Tweet Assistant**: Select a release note and auto-draft a post with character limit checking (280 characters max) and hashtag toggle buttons.

---

## 🏗️ Tech Stack

*   **Backend**: Python 3.14.x, Flask, Requests, XML ElementTree
*   **Frontend**: Plain HTML5, Vanilla CSS3 (Custom Variables, Flexbox/Grid, Animations), Javascript (ES6+, DOMParser, Fetch API)
*   **Icons**: Lucide Icons
*   **Fonts**: Outfit & Plus Jakarta Sans via Google Fonts

---

## 📂 Directory Structure

```text
bigquery_release_notes/
│
├── static/
│   ├── app.js          # Client-side controller (XML parsing, event binding)
│   └── styles.css       # Premium custom stylesheets (Themes, layouts, animations)
│
├── templates/
│   └── index.html      # Main user dashboard interface
│
├── .gitignore          # Excludes python logs, bytecode, IDE folders
├── app.py              # Main Flask server proxy
├── README.md           # This file
└── requirements.txt    # Application dependencies
```

---

## 🚀 Setup & Running Locally

### 1. Prerequisites
Make sure you have **Python 3.10+** and **Git** installed on your system.

### 2. Clone the repository
```bash
git clone https://github.com/shrustimagadum/antigravity-event-talks-app.git
cd antigravity-event-talks-app
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```
*(Dependencies required: `Flask`, `requests`)*

### 4. Run the development server
```bash
python app.py
```

### 5. Access the app
Open your web browser and navigate to:
**[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🧪 Testing the Application

1.  **Refreshes**: Click the **Refresh** button in the header; the icon will spin, fetching the latest real-time notes.
2.  **Filtering & Search**:
    *   Enter terms (e.g., `JSON`, `security`) in the search input to see results update instantly.
    *   Click category pills (`Feature`, `Changed`, `Deprecated`, `Fixed`) to filter by the update type.
3.  **Drafting Tweets**:
    *   Click any individual list item in the date cards.
    *   The composer on the right will reveal the selected content and compute your character count.
    *   Toggle hashtag options (`#BigQuery`, `#GoogleCloud`) and click **Tweet this Update** to trigger Twitter's post editor.
