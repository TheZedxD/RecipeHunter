#!/usr/bin/env python3

"""
Simple HTTP server for Recipe Hunter
This server allows the app to run without CORS issues
"""

import http.server
import socketserver
import sys
import os

PORT = int(os.environ.get('PORT', 8080))

class RecipeHunterHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add cache control headers
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, format, *args):
        # Custom logging format
        print(f"✓ Served: {args[0]}")

if __name__ == '__main__':
    try:
        with socketserver.TCPServer(("", PORT), RecipeHunterHandler) as httpd:
            print('\n🍳 Recipe Hunter Server Started!\n')
            print(f'   Local:   http://localhost:{PORT}')
            print(f'   Network: http://127.0.0.1:{PORT}\n')
            print('Press Ctrl+C to stop the server\n')
            httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n\nShutting down server...')
        print('Server stopped')
        sys.exit(0)
    except OSError as e:
        if e.errno == 48 or e.errno == 98:  # Address already in use
            print(f'\n❌ Error: Port {PORT} is already in use.')
            print('Please stop the other server or use a different port:')
            print(f'   PORT=3000 python3 serve.py\n')
            sys.exit(1)
        else:
            raise
