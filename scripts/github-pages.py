"""Publish only this project. Git credentials remain in memory and never print."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
REPO = 'b-bad-2026'

def credentials():
    env = dict(os.environ, GCM_INTERACTIVE='Never')
    result = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n', text=True, capture_output=True, env=env, timeout=45)
    values = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
    if not values.get('password'):
        raise RuntimeError('No existing GitHub credential is available. Sign in to GitHub before publishing.')
    return values['password']

def api(token, endpoint, method='GET', payload=None, allow_missing=False):
    body = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request('https://api.github.com' + endpoint, data=body, method=method, headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'B-Bad-2026-deployment'})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read() or b'{}')
    except urllib.error.HTTPError as error:
        if error.code == 404 and allow_missing:
            return None
        try:
            message = json.loads(error.read()).get('message', 'GitHub request failed')
        except (ValueError, UnicodeDecodeError):
            message = 'GitHub request failed'
        raise RuntimeError(f'GitHub HTTP {error.code}: {message}') from None

def git(*args):
    result = subprocess.run(['git', '-C', str(ROOT), *args], text=True, capture_output=True, timeout=90)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or 'Git operation failed')
    print(result.stdout.strip())

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--status', action='store_true')
    args = parser.parse_args()
    token = credentials()
    profile = api(token, '/user')
    owner = profile['login']
    full = owner + '/' + REPO
    repo = api(token, '/repos/' + full, allow_missing=True)
    print(json.dumps({'account': owner, 'repository': full, 'exists': repo is not None, 'empty': None if repo is None else repo.get('size') == 0}))
    if args.status:
        pages = api(token, '/repos/' + full + '/pages', allow_missing=True)
        print(json.dumps({k: pages.get(k) for k in ['html_url', 'status', 'source']} if pages else {'pages': None}))
        return
    if not args.publish:
        return
    if not (ROOT / '.git').is_dir():
        raise RuntimeError('Initialize and review this independent repository before publishing.')
    if repo is None:
        repo = api(token, '/user/repos', 'POST', {'name': REPO, 'description': 'B-Bad 2026 — bàn điều hành giải đơn cầu lông, xếp nhánh thủ công và tỉ số một set.', 'private': False, 'auto_init': False})
    remote = subprocess.run(['git', '-C', str(ROOT), 'remote', 'get-url', 'origin'], text=True, capture_output=True)
    expected = f'https://github.com/{full}.git'
    if remote.returncode:
        if repo.get('size', 0) != 0:
            raise RuntimeError('Existing repository contains files; refusing to overwrite unrelated work.')
        git('remote', 'add', 'origin', expected)
    elif remote.stdout.strip() != expected:
        raise RuntimeError('Origin does not match the dedicated B-Bad repository.')
    git('push', '-u', 'origin', 'main')
    pages = api(token, '/repos/' + full + '/pages', allow_missing=True)
    if pages is None:
        pages = api(token, '/repos/' + full + '/pages', 'POST', {'build_type': 'legacy', 'source': {'branch': 'main', 'path': '/'}})
    print(json.dumps({'repository': repo['html_url'], 'site': pages.get('html_url'), 'status': pages.get('status')}))

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error))
        raise SystemExit(1)
