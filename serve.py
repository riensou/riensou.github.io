#!/usr/bin/env python3
"""Dev server: like `python3 -m http.server` but disables caching,
so edits to js/css/md always show up on plain refresh."""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print('Serving on http://localhost:%d (no caching)' % port)
    ThreadingHTTPServer(('', port), NoCacheHandler).serve_forever()
