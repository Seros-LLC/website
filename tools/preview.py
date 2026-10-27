#!/usr/bin/env python3
"""Local preview server that emulates the two Vercel settings the site relies on.

vercel.json sets "cleanUrls": true and "trailingSlash": false, so in production
/services is served from services.html. Python's plain http.server does not do
that, which makes every in-page link 404 during a local click-through and gives
a false impression that the site is broken.

Usage:  python3 tools/preview.py [port]     # default 8080
This file is a development convenience. It is not deployed.
"""
import http.server
import os
import socketserver
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        resolved = super().translate_path(path)
        # A bare path with no extension maps onto the matching .html file,
        # mirroring Vercel's cleanUrls behaviour.
        if not os.path.exists(resolved) and not os.path.splitext(resolved)[1]:
            candidate = resolved.rstrip("/") + ".html"
            if os.path.exists(candidate):
                return candidate
        return resolved

    def send_error(self, code, message=None, explain=None):
        # Serve the real 404 page so it can be reviewed like any other page.
        if code == 404:
            page = ROOT / "404.html"
            if page.exists():
                body = page.read_bytes()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(body)
                return
        super().send_error(code, message, explain)

    def log_message(self, format, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), format % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    socketserver.ThreadingTCPServer.daemon_threads = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", port), CleanURLHandler) as httpd:
        print(f"preview: http://localhost:{port}/  (clean URLs on, ctrl-c to stop)")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
