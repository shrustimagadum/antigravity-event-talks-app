import logging
from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_atom_feed(xml_content):
    """
    Parses Atom XML feed and returns a list of dictionaries.
    """
    try:
        root = ET.fromstring(xml_content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns)
            entry_id = entry.find('atom:id', ns)
            updated = entry.find('atom:updated', ns)
            link = entry.find('atom:link[@rel="alternate"]', ns)
            if link is None:
                link = entry.find('atom:link', ns)
            
            content = entry.find('atom:content', ns)
            
            link_href = link.attrib.get('href', '') if link is not None else ''
            
            entries.append({
                'title': title.text if title is not None else '',
                'id': entry_id.text if entry_id is not None else '',
                'updated': updated.text if updated is not None else '',
                'link': link_href,
                'content': content.text if content is not None else ''
            })
        return entries
    except Exception as e:
        logger.error(f"Error parsing Atom feed: {e}")
        raise

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        logger.info(f"Fetching release notes from {FEED_URL}")
        # Disable cache to get fresh results
        headers = {'Cache-Control': 'no-cache', 'Pragma': 'no-cache'}
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        
        if response.status_code != 200:
            return jsonify({
                'error': f'Failed to fetch feed, status code: {response.status_code}'
            }), response.status_code
            
        entries = parse_atom_feed(response.content)
        return jsonify({
            'success': True,
            'entries': entries
        })
        
    except requests.exceptions.RequestException as re:
        logger.error(f"Network error fetching release notes: {re}")
        return jsonify({
            'success': False,
            'error': f'Network error: {str(re)}'
        }), 502
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
