# Recipe Hunter - Installation Scripts

This directory contains platform-specific installation scripts to help you quickly set up all dependencies required to run Recipe Hunter.

## Available Installation Scripts

### 1. Linux Mint / Ubuntu / Debian
**File:** `install-linux-mint.sh`

**Usage:**
```bash
chmod +x install-linux-mint.sh
./install-linux-mint.sh
```

Or run with sudo directly:
```bash
sudo ./install-linux-mint.sh
```

**What it installs:**
- Node.js (LTS version from NodeSource repository)
- npm (Node Package Manager)
- Python 3 (optional fallback runtime)

**Compatible with:**
- Linux Mint (all versions)
- Ubuntu (18.04+)
- Debian (10+)
- Pop!_OS
- Elementary OS
- Zorin OS
- Any Debian-based distribution

---

### 2. CachyOS / Arch Linux
**File:** `install-cachyos.sh`

**Usage:**
```bash
chmod +x install-cachyos.sh
./install-cachyos.sh
```

Or run with sudo directly:
```bash
sudo ./install-cachyos.sh
```

**What it installs:**
- Node.js (from official Arch repositories)
- npm (Node Package Manager)
- Python (optional fallback runtime)

**Compatible with:**
- CachyOS
- Arch Linux
- Manjaro
- EndeavourOS
- Garuda Linux
- ArcoLinux
- Any Arch-based distribution

**Note:** On CachyOS, the installed Node.js may include CPU-specific optimizations for better performance.

---

### 3. Windows
**File:** `install-windows.bat`

**Usage:**
- Double-click the file to run
- Or run from Command Prompt: `install-windows.bat`
- If you encounter permission issues, right-click and select "Run as Administrator"

**What it checks:**
- Node.js installation status
- Python installation status
- Provides download links and installation instructions if not installed

**Compatible with:**
- Windows 10 (all versions)
- Windows 11
- Windows Server 2019+

**Note:** This script checks for installed dependencies and provides guidance. You'll need to manually download and install Node.js/Python from the provided links if they're not already installed.

---

## What Gets Installed?

All installation scripts set up the following:

### Primary Runtime: Node.js (Recommended)
- **Version:** LTS (Long Term Support)
- **Why Node.js?**
  - Better performance and faster response times
  - Full Recipe Hunter functionality
  - Automatic data synchronization and backup
  - Optimized for concurrent users
  - Lower memory footprint

### Package Manager: npm
- Comes bundled with Node.js
- Used for managing JavaScript dependencies

### Fallback Runtime: Python 3 (Optional)
- **Version:** 3.8 or higher
- **Purpose:** Alternative runtime if Node.js is unavailable
- Basic functionality only

---

## After Installation

Once the installation is complete, you can start Recipe Hunter using any of these methods:

### Method 1: Using the startup script (Recommended)
```bash
./start.sh          # Linux/Mac
START-SERVER.bat    # Windows
```

### Method 2: Using Node.js directly
```bash
node server.js
```

### Method 3: Using npm
```bash
npm start
```

The server will start on `http://localhost:8080`

---

## Troubleshooting

### Linux: "Permission denied" error
Make sure the script is executable:
```bash
chmod +x install-*.sh
```

### Linux: "command not found: sudo"
Run the script as root:
```bash
su
./install-*.sh
```

### Windows: "Node.js not found" after installation
1. Restart your computer
2. Open a new Command Prompt window
3. Run `node --version` to verify installation

### All Platforms: Installation verification
After installation, verify that everything is working:

```bash
# Check Node.js
node --version

# Check npm
npm --version

# Check Python (optional)
python --version
# or
python3 --version
```

---

## Manual Installation

If the automatic installation scripts don't work for your system, you can install the dependencies manually:

### Node.js
- Download from: https://nodejs.org/
- Choose the LTS (Long Term Support) version
- Follow the installer instructions

### Python (Optional)
- Download from: https://www.python.org/downloads/
- Choose version 3.8 or higher
- **Windows:** Make sure to check "Add Python to PATH" during installation

---

## Support

If you encounter any issues with the installation scripts:

1. Check the error messages for specific details
2. Ensure you have an active internet connection
3. Try running the script again with sudo/administrator privileges
4. Consult the main README.md in the project root directory
5. Report issues on the project's GitHub repository

---

## License

These installation scripts are part of the Recipe Hunter project and are provided as-is to help with dependency installation.
