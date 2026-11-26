"""Open every link and image in a built Mailchimp file and report the ones that don't load.

usage: python3 check_links.py <edition>/mailchimp-code-block.html [more files ...]

Prints one line per address: the HTTP status, then the address. Exits with 1 if anything fails.
Placeholders (PASTE-...) and Mailchimp merge tags (*|UNSUB|* ...) are listed separately, not fetched.

A project page that returns 404 usually just isn't published yet on polygood.com: tell the user
which ones, don't change the link. An image that fails will be broken for every subscriber: fix it
before anything else (push the file, or correct image_base_url).
"""
import re
import sys
import urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (newsletter link check)"


def status(url):
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.status
        except urllib.error.HTTPError as e:
            if method == "HEAD" and e.code in (403, 405, 501):
                continue  # some servers refuse HEAD; try GET
            return e.code
        except Exception as e:  # network error, TLS, timeout
            return f"error: {type(e).__name__}"
    return "error"


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    text = "".join(Path(p).read_text() for p in sys.argv[1:])
    found = re.findall(r'(?:href|src)="([^"]+)"', text)
    urls = sorted({u for u in found if u.startswith("http")})
    other = sorted({u for u in found if not u.startswith("http") and not u.startswith("mailto:") and not u.startswith("#")})
    bad = 0
    for u in urls:
        s = status(u)
        ok = s == 200
        bad += not ok
        print(f"{'ok ' if ok else 'BAD'} {s}  {u}")
    for u in other:
        print(f"--- not fetched: {u}")
    print(f"\n{len(urls)} addresses, {bad} not loading")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
