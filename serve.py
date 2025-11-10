#!/usr/bin/env python3

"""
Simple HTTP server for Recipe Hunter
This server allows the app to run without CORS issues
"""

import http.server
import socketserver
import sys
import os
import socket
import argparse

PORT = int(os.environ.get('PORT', 8080))

def get_network_ip():
    """Get the local network IP address"""
    try:
        # Create a socket to find the local network IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Connect to a remote address (doesn't actually send data)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

class RecipeHunterHandler(http.server.SimpleHTTPRequestHandler):
    # Class variable to control header behavior
    add_cache_headers = True

    def end_headers(self):
        # Add cache control headers if enabled
        if self.add_cache_headers:
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, format, *args):
        # Custom logging format
        print(f"✓ Served: {args[0]}")

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description='Recipe Hunter HTTP Server',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python3 serve.py                    # Start with default settings
  python3 serve.py --no-cache-header  # Run without Cache-Control header
  python3 serve.py --port 3000        # Run on custom port

For verbose terminal output, use terminal_serve.py instead.
        '''
    )

    parser.add_argument(
        '--port', '-p',
        type=int,
        default=PORT,
        help=f'Port to run the server on (default: {PORT})'
    )

    parser.add_argument(
        '--no-cache-header',
        action='store_true',
        help='Disable Cache-Control: no-cache header'
    )

    return parser.parse_args()

if __name__ == '__main__':
    args = parse_arguments()

    # Set the port from arguments
    port = args.port

    # Configure handler based on arguments
    RecipeHunterHandler.add_cache_headers = not args.no_cache_header

    try:
        network_ip = get_network_ip()
        with socketserver.TCPServer(("0.0.0.0", port), RecipeHunterHandler) as httpd:
            print('\n🍳 Recipe Hunter Server Started!\n')
            print(f'   Local:   http://localhost:{port}')
            print(f'   Network: http://{network_ip}:{port}\n')
            print(f'   Cache-Control Header: {"Enabled" if RecipeHunterHandler.add_cache_headers else "Disabled"}\n')
            print('📱 Access from other devices on your network using the Network URL above\n')
            print('Press Ctrl+C to stop the server\n')
            httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n\nShutting down server...')
        print('Server stopped')
        sys.exit(0)
    except OSError as e:
        if e.errno == 48 or e.errno == 98:  # Address already in use
            print(f'\n❌ Error: Port {port} is already in use.')
            print('Please stop the other server or use a different port:')
            print(f'   python3 serve.py --port 3000\n')
            sys.exit(1)
        else:
            raise
