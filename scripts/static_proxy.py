"""Serve frontend/dist and forward /api to the backend (local testing only).
Usage: python scripts/static_proxy.py DIST_DIR [PORT] [API_URL]"""
import http.server, urllib.request, urllib.error, os, sys
DIST=sys.argv[1]; PORT=int(sys.argv[2]) if len(sys.argv)>2 else 5180; API=sys.argv[3] if len(sys.argv)>3 else 'http://127.0.0.1:8000'
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=DIST,**k)
    def proxy(s):
        body=s.rfile.read(int(s.headers.get('Content-Length') or 0)) or None
        req=urllib.request.Request(API+s.path,data=body,method=s.command,headers={k:v for k,v in s.headers.items() if k.lower() not in('host',)})
        try: r=urllib.request.urlopen(req)
        except urllib.error.HTTPError as e: r=e
        data=r.read(); s.send_response(r.status)
        for k,v in r.headers.items():
            if k.lower() not in('transfer-encoding','connection','content-length'): s.send_header(k,v)
        s.send_header('Content-Length',str(len(data))); s.end_headers(); s.wfile.write(data)
    def do_GET(s):
        if s.path.startswith('/api'): return s.proxy()
        p=s.translate_path(s.path)
        if not os.path.exists(p): s.path='/index.html'
        super().do_GET()
    do_POST=do_PUT=do_PATCH=do_DELETE=proxy
http.server.ThreadingHTTPServer(('127.0.0.1',PORT),H).serve_forever()
