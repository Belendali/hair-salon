import concurrent.futures
import hashlib
import json
import pathlib
import re
import time
import urllib.request

ORIGIN = 'https://panic-salon-bella.belendali.chatgpt.site'
BASE = '/hair-salon/'

def prepare(path, data):
    if path.suffix in {'.html', '.css', '.js', '.mjs'} and 'vendor' not in path.parts:
        text = data.decode('utf-8')
        text = text.replace('href="/versions/"', 'href="' + ORIGIN + '/versions/"')
        text = re.sub(r'([\"\x27`(])/(?!/)', lambda m: m[1] + BASE, text)
        data = text.encode('utf-8')
    return data

def download(item):
    path = pathlib.Path('docs') / item['path']
    for attempt in range(4):
        try:
            with urllib.request.urlopen(ORIGIN + '/' + item['path'], timeout=90) as response:
                data = response.read()
            if hashlib.sha256(data).hexdigest() != item['sha256']:
                raise ValueError('Source checksum mismatch: ' + item['path'])
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(prepare(path, data))
            return
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)

if __name__ == '__main__':
    manifest = json.loads(pathlib.Path('scripts/source-manifest.json').read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(download, manifest))
    pathlib.Path('docs/.nojekyll').touch()
    print(f'Imported and verified {len(manifest)} files.')
