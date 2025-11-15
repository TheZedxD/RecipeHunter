#!/bin/bash
################################################################################
# Recipe Hunter - Unified Startup Script (Linux/Mac)
################################################################################
#
# This script automatically detects and uses the best available runtime
# (Node.js or Python) to start the Recipe Hunter server.
#
# Features:
#   - Auto-detection of Node.js or Python
#   - Network access support (local and LAN)
#   - Detailed error messages and troubleshooting
#   - Version checking
#   - Color-coded output for better readability
#
# Usage:
#   chmod +x start.sh    (first time only - makes script executable)
#   ./start.sh           (run the script)
#
################################################################################

# Color codes for better terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Function to print colored headers
print_header() {
    echo -e "${CYAN}${BOLD}"
    echo "================================================================================"
    echo "$1"
    echo "================================================================================"
    echo -e "${NC}"
}

# Function to print section headers
print_section() {
    echo -e "${BLUE}${BOLD}$1${NC}"
    echo
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}   [✓] $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}   [✗] $1${NC}"
}

# Function to print info messages
print_info() {
    echo -e "${YELLOW}   [→] $1${NC}"
}

################################################################################
# SECTION 1: Display Welcome Banner
################################################################################

clear
print_header "Recipe Hunter - Server Startup"

echo "This script will start the Recipe Hunter server using the best available"
echo "runtime on your system (Node.js or Python)."
echo

################################################################################
# SECTION 1.5: Detect Linux Distribution for Better Error Messages
################################################################################

DISTRO="Unknown"
DISTRO_FAMILY="Unknown"
PKG_MANAGER="Unknown"

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$NAME

    # Detect distribution family and package manager
    case $ID in
        ubuntu|debian|linuxmint|pop|elementary|zorin)
            DISTRO_FAMILY="Debian/Ubuntu"
            PKG_MANAGER="apt"
            ;;
        fedora|rhel|centos|rocky|almalinux)
            DISTRO_FAMILY="Red Hat"
            PKG_MANAGER="dnf"
            ;;
        arch|manjaro|cachyos|endeavouros|garuda)
            DISTRO_FAMILY="Arch Linux"
            PKG_MANAGER="pacman"
            ;;
        opensuse|opensuse-leap|opensuse-tumbleweed|sles)
            DISTRO_FAMILY="SUSE"
            PKG_MANAGER="zypper"
            ;;
        gentoo)
            DISTRO_FAMILY="Gentoo"
            PKG_MANAGER="emerge"
            ;;
        void)
            DISTRO_FAMILY="Void Linux"
            PKG_MANAGER="xbps-install"
            ;;
        alpine)
            DISTRO_FAMILY="Alpine"
            PKG_MANAGER="apk"
            ;;
        *)
            # Try to detect from ID_LIKE
            if echo "$ID_LIKE" | grep -q "debian\|ubuntu"; then
                DISTRO_FAMILY="Debian/Ubuntu"
                PKG_MANAGER="apt"
            elif echo "$ID_LIKE" | grep -q "rhel\|fedora"; then
                DISTRO_FAMILY="Red Hat"
                PKG_MANAGER="dnf"
            elif echo "$ID_LIKE" | grep -q "arch"; then
                DISTRO_FAMILY="Arch Linux"
                PKG_MANAGER="pacman"
            elif echo "$ID_LIKE" | grep -q "suse"; then
                DISTRO_FAMILY="SUSE"
                PKG_MANAGER="zypper"
            fi
            ;;
    esac
elif [[ "$OSTYPE" == "darwin"* ]]; then
    DISTRO="macOS"
    DISTRO_FAMILY="macOS"
    PKG_MANAGER="brew"
fi

################################################################################
# SECTION 2: Detect and Use Node.js (Preferred Runtime)
################################################################################
# Node.js is the preferred runtime for Recipe Hunter because it provides:
#   - Better performance for concurrent connections
#   - Native async/await support
#   - Built-in HTTP server optimizations
#   - File locking mechanisms for data integrity
################################################################################

print_section "[1/3] Checking for Node.js..."

if [ "$DISTRO" != "Unknown" ]; then
    echo "   Detected: $DISTRO ($DISTRO_FAMILY)"
    echo
fi

if command -v node &> /dev/null; then
    print_success "Node.js is installed"
    echo

    # Display Node.js version
    NODE_VERSION=$(node --version)
    echo "   Runtime Information:"
    echo "      - Node.js Version: $NODE_VERSION"
    echo

    # Check if server.js exists
    if [ ! -f "server.js" ]; then
        print_error "server.js not found in current directory"
        echo
        echo "   Please ensure you are running this script from the RecipeHunter directory."
        echo
        exit 1
    fi

    print_section "[2/3] Starting Recipe Hunter server with Node.js..."
    echo

    print_header "Server Access Information"
    echo
    echo "The server will display two URLs below:"
    echo
    echo -e "${BOLD}   1. LOCALHOST ACCESS (This computer only):${NC}"
    echo "      http://localhost:8080"
    echo "      - Use this URL to access Recipe Hunter on this computer"
    echo "      - Works only on the machine running the server"
    echo "      - Fastest access method for local use"
    echo
    echo -e "${BOLD}   2. NETWORK ACCESS (LAN/WiFi - Other devices):${NC}"
    echo "      http://[LOCAL-IP]:8080"
    echo "      - Use this URL to access from phones, tablets, other computers"
    echo "      - All devices must be on the same WiFi network"
    echo "      - The server will detect and display your local IP address"
    echo
    print_header "Server Starting..."
    echo

    print_section "[3/3] Initializing server..."
    echo

    # Start the Node.js server
    node server.js

    # If we get here, the server has stopped
    echo
    print_header "Server has stopped"
    echo
    exit 0
fi

################################################################################
# SECTION 3: Fallback to Python (Alternative Runtime)
################################################################################
# If Node.js is not available, try to use Python as an alternative.
# Python provides a simple HTTP server suitable for development use.
################################################################################

print_info "Node.js is not installed"
echo

print_section "[1/3] Checking for Python..."

PYTHON_CMD=""

# Try python3 first
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
# Try python
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
fi

################################################################################
# SECTION 4: Start Server with Python
################################################################################

if [ -n "$PYTHON_CMD" ]; then
    print_success "Python is installed"
    echo

    # Display Python version
    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
    echo "   Runtime Information:"
    echo "      - Python Version: $PYTHON_VERSION"
    echo

    # Check if serve.py exists
    if [ ! -f "serve.py" ]; then
        print_error "serve.py not found in current directory"
        echo
        echo "   Please ensure you are running this script from the RecipeHunter directory."
        echo
        exit 1
    fi

    print_section "[2/3] Starting Recipe Hunter server with Python..."
    echo

    print_header "Server Access Information"
    echo
    echo "The server will display two URLs below:"
    echo
    echo -e "${BOLD}   1. LOCALHOST ACCESS (This computer only):${NC}"
    echo "      http://localhost:8080"
    echo "      - Use this URL to access Recipe Hunter on this computer"
    echo "      - Works only on the machine running the server"
    echo "      - Fastest access method for local use"
    echo
    echo -e "${BOLD}   2. NETWORK ACCESS (LAN/WiFi - Other devices):${NC}"
    echo "      http://[LOCAL-IP]:8080"
    echo "      - Use this URL to access from phones, tablets, other computers"
    echo "      - All devices must be on the same WiFi network"
    echo "      - The server will detect and display your local IP address"
    echo
    print_header "Server Starting..."
    echo

    print_section "[3/3] Initializing server..."
    echo

    # Start the Python server
    $PYTHON_CMD serve.py

    # If we get here, the server has stopped
    echo
    print_header "Server has stopped"
    echo
    exit 0
fi

################################################################################
# SECTION 5: Error Handling - No Runtime Found
################################################################################

print_info "Python is not installed"
echo

print_header "INSTALLATION REQUIRED"
echo
print_error "No suitable runtime found!"
echo
echo "Recipe Hunter requires either Node.js or Python to run."
echo "Please install one of the following:"
echo
echo "────────────────────────────────────────────────────────────────────────────────"
echo -e "${BOLD}   OPTION 1: Node.js (Recommended)${NC}"
echo "────────────────────────────────────────────────────────────────────────────────"
echo
echo "   Download from: https://nodejs.org/"
echo
echo "   Installation methods:"
echo

# Provide specific instructions based on detected distribution
if [ "$PKG_MANAGER" != "Unknown" ]; then
    echo -e "   ${BOLD}For Your System ($DISTRO):${NC}"
    case $PKG_MANAGER in
        apt)
            echo "      curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
            echo "      sudo apt-get install -y nodejs"
            echo
            echo "      Or for Linux Mint/Ubuntu:"
            echo "      sudo apt update && sudo apt install -y nodejs npm"
            ;;
        dnf)
            echo "      sudo dnf install nodejs"
            echo
            echo "      Or using NodeSource (recommended):"
            echo "      curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -"
            echo "      sudo dnf install -y nodejs"
            ;;
        pacman)
            echo "      sudo pacman -S nodejs npm"
            echo
            if [ "$ID" = "cachyos" ]; then
                echo "      ${GREEN}CachyOS Note:${NC} Use the standard Arch repos or CachyOS repos"
                echo "      Both contain nodejs. You can also use:"
                echo "      sudo pacman -Syu nodejs npm"
            fi
            ;;
        zypper)
            echo "      sudo zypper install nodejs npm"
            ;;
        brew)
            echo "      brew install node"
            echo
            echo "      Or download installer from: https://nodejs.org/"
            ;;
        emerge)
            echo "      sudo emerge --ask net-libs/nodejs"
            ;;
        xbps-install)
            echo "      sudo xbps-install -S nodejs"
            ;;
        apk)
            echo "      sudo apk add nodejs npm"
            ;;
        *)
            echo "      Download from: https://nodejs.org/"
            ;;
    esac
    echo
fi

# Show alternative package manager options
if [[ "$OSTYPE" == "linux-gnu"* ]] && [ "$PKG_MANAGER" != "Unknown" ]; then
    echo "   ${BOLD}Alternative Installation Methods:${NC}"

    case $DISTRO_FAMILY in
        "Debian/Ubuntu")
            echo "   • Ubuntu/Debian/Linux Mint:"
            echo "     sudo apt update && sudo apt install -y nodejs npm"
            ;;
        "Arch Linux")
            echo "   • Arch Linux/Manjaro/CachyOS/EndeavourOS:"
            echo "     sudo pacman -S nodejs npm"
            ;;
        "Red Hat")
            echo "   • Fedora/RHEL/CentOS:"
            echo "     sudo dnf install nodejs npm"
            ;;
    esac
    echo
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   ${BOLD}For macOS:${NC}"
    echo "      # Using Homebrew (recommended):"
    echo "      brew install node"
    echo
    echo "      # Or download installer from: https://nodejs.org/"
    echo
fi

echo "   Benefits:"
echo "     - Better performance and features"
echo "     - Full Recipe Hunter functionality"
echo "     - Automatic data sync and backup"
echo "     - Optimized for concurrent users"
echo
echo "────────────────────────────────────────────────────────────────────────────────"
echo -e "${BOLD}   OPTION 2: Python${NC}"
echo "────────────────────────────────────────────────────────────────────────────────"
echo
echo "   Download from: https://www.python.org/"
echo
echo "   Installation methods:"
echo

# Provide specific instructions based on detected distribution
if [ "$PKG_MANAGER" != "Unknown" ]; then
    echo -e "   ${BOLD}For Your System ($DISTRO):${NC}"
    case $PKG_MANAGER in
        apt)
            echo "      sudo apt-get update"
            echo "      sudo apt-get install python3"
            echo
            echo "      Or for Linux Mint/Ubuntu (includes pip):"
            echo "      sudo apt update && sudo apt install -y python3 python3-pip"
            ;;
        dnf)
            echo "      sudo dnf install python3"
            ;;
        pacman)
            echo "      sudo pacman -S python"
            echo
            if [ "$ID" = "cachyos" ]; then
                echo "      ${GREEN}CachyOS Note:${NC} Python is available in standard repos"
                echo "      sudo pacman -Syu python"
            fi
            ;;
        zypper)
            echo "      sudo zypper install python3"
            ;;
        brew)
            echo "      brew install python3"
            echo
            echo "      Or download installer from: https://www.python.org/"
            ;;
        emerge)
            echo "      sudo emerge --ask dev-lang/python"
            ;;
        xbps-install)
            echo "      sudo xbps-install -S python3"
            ;;
        apk)
            echo "      sudo apk add python3"
            ;;
        *)
            echo "      Download from: https://www.python.org/"
            ;;
    esac
    echo
fi

# Show alternative package manager options
if [[ "$OSTYPE" == "linux-gnu"* ]] && [ "$PKG_MANAGER" != "Unknown" ]; then
    echo "   ${BOLD}Alternative Installation Methods:${NC}"

    case $DISTRO_FAMILY in
        "Debian/Ubuntu")
            echo "   • Ubuntu/Debian/Linux Mint:"
            echo "     sudo apt update && sudo apt install -y python3"
            ;;
        "Arch Linux")
            echo "   • Arch Linux/Manjaro/CachyOS/EndeavourOS:"
            echo "     sudo pacman -S python"
            ;;
        "Red Hat")
            echo "   • Fedora/RHEL/CentOS:"
            echo "     sudo dnf install python3"
            ;;
    esac
    echo
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   ${BOLD}For macOS:${NC}"
    echo "      # Using Homebrew:"
    echo "      brew install python3"
    echo
    echo "      # Or download installer from: https://www.python.org/"
    echo
fi

echo "   Note: Python 3.8 or higher recommended"
echo
echo "────────────────────────────────────────────────────────────────────────────────"
echo
echo "After installation:"
echo "   1. Close this terminal"
echo "   2. Open a new terminal"
echo "   3. Navigate to the RecipeHunter directory"
echo "   4. Run this script again: ./start.sh"
echo
print_header "Installation Guide Complete"
echo

exit 1
