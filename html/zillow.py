import requests
import json
import os
import re
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def clean_filename(title):
    """Removes invalid characters for filenames."""
    return re.sub(r'[\\/*?:"<>|]', "", title)

import sys

def get_zillow_images(url):
    # Zillow requires a user-agent that looks like a real browser to avoid blocking
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.zillow.com/'
    }

    # print(f"Fetching data from: {url}", file=sys.stderr)
    session = requests.Session()
    
    try:
        response = session.get(url, headers=headers)
        response.raise_for_status()
    except requests.exceptions.HTTPError as err:
        print(json.dumps({"error": f"HTTP Error: {err}", "details": "Zillow blocked request"}), file=sys.stdout)
        return

    soup = BeautifulSoup(response.content, 'html.parser')

    # Zillow stores data in a script tag with id="__NEXT_DATA__"
    script_data = soup.find('script', id='__NEXT_DATA__')

    if not script_data:
        print(json.dumps({"error": "Structure changed or CAPTCHA"}), file=sys.stdout)
        return

    try:
        json_data = json.loads(script_data.string)
        
        props = json_data.get('props', {}).get('pageProps', {}).get('componentProps', {})
        gdp_client_cache = props.get('gdpClientCache', {})
        
        photo_urls = []
        
        for key, value in gdp_client_cache.items():
            if 'property' in value:
                property_data = value['property']
                
                # Extract original photos
                if 'photos' in property_data:
                    for photo in property_data['photos']:
                        if 'mixedSources' in photo and 'jpeg' in photo['mixedSources']:
                            highest_res = photo['mixedSources']['jpeg'][-1]['url']
                            photo_urls.append(highest_res)
                        elif 'url' in photo:
                             photo_urls.append(photo['url'])
                
                if photo_urls:
                    break
        
        if not photo_urls:
             print(json.dumps([]), file=sys.stdout)
             return

        # Output JSON to stdout
        print(json.dumps(photo_urls), file=sys.stdout)

    except json.JSONDecodeError:
         print(json.dumps({"error": "Failed to parse JSON data"}), file=sys.stdout)
    except Exception as e:
         print(json.dumps({"error": str(e)}), file=sys.stdout)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_url = sys.argv[1]
    else:
        # Fallback for manual testing
        target_url = input("Enter Zillow URL: ")
    
    if "zillow.com" in target_url:
        get_zillow_images(target_url)
    else:
         print(json.dumps({"error": "Invalid Zillow URL"}), file=sys.stdout)