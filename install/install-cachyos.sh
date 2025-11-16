#!/bin/bash
################################################################################
# Recipe Hunter - Installation Script for CachyOS / Arch Linux
################################################################################
#
# This script automatically installs all dependencies required to run
# Recipe Hunter on CachyOS, Arch Linux, Manjaro, EndeavourOS, and other
# Arch-based distributions.
#
# What this script installs:
#   - Node.js (LTS version) - Primary runtime for Recipe Hunter
#   - npm (Node Package Manager) - Comes with Node.js
#   - Python 3 (fallback runtime) - Optional but recommended
#
# Usage:
#   chmod +x install-cachyos.sh
#   ./install-cachyos.sh
#
# Or run with sudo:
#   sudo ./install-cachyos.sh
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

# Function to print section headers
print_section() {
    echo -e "${BLUE}${BOLD}$1${NC}"
    echo
}

################################################################################
# SECTION 1: Welcome and Prerequisite Checks
################################################################################

clear
print_header "Recipe Hunter - Installation for CachyOS / Arch Linux"

echo "This script will install all dependencies required to run Recipe Hunter."
echo
echo "The following will be installed:"
echo "  • Node.js (LTS version) - Primary runtime"
echo "  • npm - Node Package Manager"
echo "  • Python 3 - Fallback runtime (if not already installed)"
echo
echo "Press Ctrl+C to cancel, or press Enter to continue..."
read

################################################################################
# SECTION 2: Check if running as root/sudo
################################################################################

print_section "[1/5] Checking permissions..."

if [ "$EUID" -ne 0 ]; then
    print_info "This script requires sudo privileges to install packages."
    echo
    echo "Please enter your password when prompted..."
    echo

    # Re-run script with sudo
    sudo "$0" "$@"
    exit $?
fi

print_success "Running with sudo privileges"
echo

################################################################################
# SECTION 3: Update package database
################################################################################

print_section "[2/5] Updating package database..."

if pacman -Sy; then
    print_success "Package database updated successfully"
else
    print_error "Failed to update package database"
    echo
    echo "Please check your internet connection and try again."
    exit 1
fi
echo

################################################################################
# SECTION 4: Install Node.js
################################################################################

print_section "[3/5] Installing Node.js (LTS version)..."

# Check if Node.js is already installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_info "Node.js is already installed: $NODE_VERSION"
    echo
    read -p "Do you want to reinstall/update Node.js? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Skipping Node.js installation"
        echo
    else
        # Install Node.js
        if pacman -S --noconfirm nodejs npm; then
            NODE_VERSION=$(node --version)
            NPM_VERSION=$(npm --version)
            print_success "Node.js updated successfully: $NODE_VERSION"
            print_success "npm updated successfully: $NPM_VERSION"
        else
            print_error "Failed to update Node.js"
            exit 1
        fi
    fi
else
    # Install Node.js
    print_info "Installing Node.js from official Arch repositories..."

    if pacman -S --noconfirm nodejs npm; then
        NODE_VERSION=$(node --version)
        NPM_VERSION=$(npm --version)
        print_success "Node.js installed successfully: $NODE_VERSION"
        print_success "npm installed successfully: $NPM_VERSION"
    else
        print_error "Failed to install Node.js"
        echo
        echo "You can try installing manually with:"
        echo "  sudo pacman -S nodejs npm"
        exit 1
    fi
fi
echo

################################################################################
# SECTION 5: Install Python 3 (optional but recommended)
################################################################################

print_section "[4/5] Installing Python 3 (fallback runtime)..."

if command -v python3 &> /dev/null || command -v python &> /dev/null; then
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
    else
        PYTHON_VERSION=$(python --version)
    fi
    print_info "Python is already installed: $PYTHON_VERSION"
    print_success "Python is available as fallback runtime"
else
    print_info "Installing Python..."

    if pacman -S --noconfirm python python-pip; then
        PYTHON_VERSION=$(python --version)
        print_success "Python installed successfully: $PYTHON_VERSION"
    else
        print_error "Failed to install Python (optional)"
        echo
        print_info "Python is optional - Recipe Hunter will work with Node.js alone"
    fi
fi
echo

################################################################################
# SECTION 6: Verification and Summary
################################################################################

print_section "[5/5] Verifying installation..."

INSTALLATION_SUCCESS=true

# Verify Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js is installed: $NODE_VERSION"
else
    print_error "Node.js installation verification failed"
    INSTALLATION_SUCCESS=false
fi

# Verify npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm is installed: $NPM_VERSION"
else
    print_error "npm installation verification failed"
    INSTALLATION_SUCCESS=false
fi

# Verify Python (optional)
if command -v python3 &> /dev/null || command -v python &> /dev/null; then
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
    else
        PYTHON_VERSION=$(python --version)
    fi
    print_success "Python is installed: $PYTHON_VERSION"
else
    print_info "Python is not installed (optional)"
fi

echo

################################################################################
# SECTION 7: Installation Complete
################################################################################

if [ "$INSTALLATION_SUCCESS" = true ]; then
    print_header "INSTALLATION COMPLETE!"
    echo
    print_success "All required dependencies have been installed successfully!"
    echo
    echo "You can now run Recipe Hunter using one of these methods:"
    echo
    echo "  1. Using the startup script (recommended):"
    echo "     ${BOLD}./start.sh${NC}"
    echo
    echo "  2. Using Node.js directly:"
    echo "     ${BOLD}node server.js${NC}"
    echo
    echo "  3. Using npm:"
    echo "     ${BOLD}npm start${NC}"
    echo
    echo "The server will start on http://localhost:8080"
    echo
    echo "${CYAN}${BOLD}CachyOS Note:${NC} If you're using CachyOS-optimized packages,"
    echo "the installed Node.js version may have performance optimizations"
    echo "specific to your CPU architecture."
    echo
    print_header "Thank you for installing Recipe Hunter!"
    echo
else
    print_header "INSTALLATION INCOMPLETE"
    echo
    print_error "Some components failed to install."
    echo
    echo "Please check the error messages above and try again."
    echo "You may need to install Node.js manually with:"
    echo "  sudo pacman -S nodejs npm"
    echo
    exit 1
fi

exit 0
