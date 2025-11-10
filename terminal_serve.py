#!/usr/bin/env python3

"""
Verbose HTTP server for Recipe Hunter with full terminal output
This server shows detailed logging and allows configuration of cache headers
"""

import http.server
import socketserver
import sys
import os
import socket
import argparse
from datetime import datetime

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

class VerboseRecipeHunterHandler(http.server.SimpleHTTPRequestHandler):
    # Class variable to control header behavior
    add_cache_headers = True

    def end_headers(self):
        # Add cache control headers if enabled
        if self.add_cache_headers:
            self.send_header('Cache-Control', 'no-cache')
            if hasattr(self.server, 'verbose') and self.server.verbose:
                print(f"    → Added header: Cache-Control: no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        # Show full verbose logging with timestamps
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        client_ip = self.client_address[0]
        message = format % args

        # Color coding for different status codes
        status_code = args[1] if len(args) > 1 else ''
        if status_code.startswith('2'):
            status_symbol = '✓'
        elif status_code.startswith('3'):
            status_symbol = '↻'
        elif status_code.startswith('4'):
            status_symbol = '⚠'
        elif status_code.startswith('5'):
            status_symbol = '✗'
        else:
            status_symbol = '→'

        print(f"[{timestamp}] {status_symbol} {client_ip} - {message}")

    def do_GET(self):
        # Log additional request details if verbose mode is enabled
        if hasattr(self.server, 'verbose') and self.server.verbose:
            print(f"\n{'='*60}")
            print(f"📥 Incoming Request:")
            print(f"   Method: {self.command}")
            print(f"   Path: {self.path}")
            print(f"   Client: {self.client_address[0]}:{self.client_address[1]}")
            print(f"   Headers:")
            for header, value in self.headers.items():
                print(f"      {header}: {value}")
            print(f"{'='*60}\n")

        # Call the parent GET handler
        super().do_GET()

        if hasattr(self.server, 'verbose') and self.server.verbose:
            print()  # Add newline for readability

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description='Recipe Hunter HTTP Server with verbose terminal output',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python3 terminal_serve.py                    # Start with default settings
  python3 terminal_serve.py --no-cache-header  # Run without Cache-Control header
  python3 terminal_serve.py --verbose          # Show detailed request information
  python3 terminal_serve.py --port 3000        # Run on custom port
  python3 terminal_serve.py -v --no-cache-header  # Combine options
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

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Show detailed request information including headers'
    )

    return parser.parse_args()

if __name__ == '__main__':
    args = parse_arguments()

    # Set the port from arguments
    port = args.port

    # Configure handler based on arguments
    VerboseRecipeHunterHandler.add_cache_headers = not args.no_cache_header

    try:
        network_ip = get_network_ip()

        # Create server with custom TCPServer to add verbose flag
        class CustomTCPServer(socketserver.TCPServer):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                self.verbose = False

        with CustomTCPServer(("0.0.0.0", port), VerboseRecipeHunterHandler) as httpd:
            httpd.verbose = args.verbose

            print('\n' + '='*70)
            print('🍳 Recipe Hunter Server Started (Terminal Mode)')
            print('='*70)
            print(f'\n📍 Server Information:')
            print(f'   Local:   http://localhost:{port}')
            print(f'   Network: http://{network_ip}:{port}')
            print(f'\n⚙️  Configuration:')
            print(f'   Cache-Control Header: {"Enabled" if VerboseRecipeHunterHandler.add_cache_headers else "Disabled"}')
            print(f'   Verbose Logging: {"Enabled" if args.verbose else "Disabled"}')
            print(f'\n📱 Access from other devices using the Network URL')
            print(f'\n💡 Tips:')
            print(f'   • Press Ctrl+C to stop the server')
            print(f'   • Use --help to see all available options')
            print(f'   • Use --verbose for detailed request information')
            print(f'   • Use --no-cache-header to disable cache control')
            print('\n' + '='*70)
            print('📊 Server Logs:\n')

            httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n\n' + '='*70)
        print('🛑 Shutting down server...')
        print('='*70)
        print('Server stopped gracefully')
        sys.exit(0)
    except OSError as e:
        if e.errno == 48 or e.errno == 98:  # Address already in use
            print(f'\n❌ Error: Port {port} is already in use.')
            print('Please stop the other server or use a different port:')
            print(f'   python3 terminal_serve.py --port 3000\n')
            sys.exit(1)
        else:
            raise
    except Exception as e:
        print(f'\n❌ Error: {str(e)}')
        sys.exit(1)
