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

if __name__ == '__main__':
    import io
    import tarfile
    manifest = json.loads(pathlib.Path('scripts/source-manifest.json').read_text())
    data = b''.join(p.read_bytes() for p in sorted(pathlib.Path('release').glob('game.part-*')))
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        for item in manifest:
            data = archive.extractfile(item['path']).read()
            if hashlib.sha256(data).hexdigest() != item['sha256']:
                raise ValueError('Checksum mismatch: ' + item['path'])
            path = pathlib.Path('docs') / item['path']
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(prepare(path, data))
    pathlib.Path('docs/.nojekyll').touch()
    print(f"Imported and verified {len(manifest)} files.")
