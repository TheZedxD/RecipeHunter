// Recipe Hunter - Main Application JavaScript

// ===== Mobile Detection =====
const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
};

const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// ===== State Management =====
const state = {
    recipes: [],
    tags: [],
    shoppingList: [],
    currentRecipe: null,
    currentFilter: '',
    selectedTags: new Set(),
    currentPage: 'home',
    currentImageData: null,
    isMobile: isMobile(),
    isIOS: isIOS(),
    isTouchDevice: isTouchDevice(),
    showFavoritesOnly: false,
    settings: {
        defaultView: 'all', // 'all' or 'favorites'
        sortOrder: 'newest', // 'newest', 'oldest', 'alphabetical'
        showImages: true,
        compactView: false
    },
    contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        targetRecipe: null
    },
    touchTimer: null,
    touchStartX: 0,
    touchStartY: 0,
    scrollPosition: 0,
    sync: {
        status: 'synced', // 'synced', 'syncing', 'offline', 'error'
        lastSync: null,
        isOnline: navigator.onLine,
        pendingOperations: [],
        healthCheckInterval: null,
        lastHealthCheck: null,
        serverHealthy: false
    },
    conflictResolution: {
        pendingConflicts: [],
        currentConflict: null
    }
};

// ===== Modal Animation Helper =====
function closeModalWithAnimation(modal, callback) {
    if (!modal || !modal.classList.contains('visible')) return;

    // Add closing class to trigger exit animation
    modal.classList.add('closing');

    // Wait for animation to complete
    setTimeout(() => {
        modal.classList.remove('visible', 'closing');

        // Restore scroll position properly
        document.body.classList.remove('modal-open');
        const scrollY = parseInt(document.body.style.top || '0') * -1;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);

        // Execute callback if provided
        if (callback) callback();
    }, 250);
}

// ===== Keyboard Visibility Detection =====
function handleKeyboardVisibility() {
    let viewportHeight = window.innerHeight;

    window.addEventListener('resize', () => {
        const newHeight = window.innerHeight;
        const isKeyboardVisible = newHeight < viewportHeight - 150;

        if (isKeyboardVisible) {
            document.body.classList.add('keyboard-visible');
        } else {
            document.body.classList.remove('keyboard-visible');
        }
    });
}

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Set up online/offline detection first
    setupOnlineOfflineDetection();

    // Initialize sync status
    updateSyncStatus(navigator.onLine ? 'synced' : 'offline');

    // Check server health on init
    if (navigator.onLine) {
        await checkServerHealth();
    }

    await loadDataFromStorage();

    // Pre-populate with sample recipes on first load
    await loadInitialSampleRecipes();

    setupEventListeners();
    setupRealTimeSearch();
    applyTheme();
    renderInitialView();
    setupMobileFeatures();
    setupFirstTimeGuide();
    initializeTooltips();
    handleKeyboardVisibility();

    // Start periodic health check pings
    if (navigator.onLine) {
        startHealthCheckPing();
    }

    // Stop health checks when page is hidden to save resources
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            // Don't stop entirely, just reduce frequency via the interval check
        } else {
            // Resume checking when page becomes visible
            if (navigator.onLine && !state.sync.healthCheckInterval) {
                startHealthCheckPing();
            }
        }
    });
}

// ===== Mobile-Specific Features =====
function setupMobileFeatures() {
    if (!state.isTouchDevice) return;

    // Add mobile class to body for CSS targeting
    document.body.classList.add('is-mobile');
    if (state.isIOS) {
        document.body.classList.add('is-ios');
    }

    // Setup touch event handlers for recipe cards (long press for context menu)
    setupTouchHandlers();

    // Prevent default context menu on touch devices
    document.addEventListener('contextmenu', (e) => {
        if (state.isTouchDevice) {
            e.preventDefault();
        }
    });

    // Handle window resize for orientation changes with debouncing
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            state.isMobile = isMobile();
            hideContextMenu();
            hideSearchPreview();
        }, 150);
    });

    // Show mobile helper on first visit
    showMobileHelperIfNeeded();
}

function showMobileHelperIfNeeded() {
    const helperShown = isLocalStorageAvailable() ?
        localStorage.getItem('mobileHelperShown') : null;

    if (!helperShown && state.isMobile) {
        setTimeout(() => {
            const helper = document.getElementById('mobileHelper');
            if (helper) {
                helper.style.display = 'block';

                // Setup close button
                const closeBtn = document.getElementById('mobileHelperClose');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        helper.style.animation = 'slideDown 0.3s ease-out';
                        setTimeout(() => {
                            helper.style.display = 'none';
                        }, 300);

                        if (isLocalStorageAvailable()) {
                            try {
                                localStorage.setItem('mobileHelperShown', 'true');
                            } catch (e) {
                                console.warn('Unable to save mobile helper state:', e);
                            }
                        }
                    });
                }

                // Auto-hide after 10 seconds
                setTimeout(() => {
                    if (helper.style.display !== 'none') {
                        helper.style.animation = 'slideDown 0.3s ease-out';
                        setTimeout(() => {
                            helper.style.display = 'none';
                        }, 300);

                        if (isLocalStorageAvailable()) {
                            try {
                                localStorage.setItem('mobileHelperShown', 'true');
                            } catch (e) {
                                console.warn('Unable to save mobile helper state:', e);
                            }
                        }
                    }
                }, 10000);
            }
        }, 2000); // Show after 2 seconds
    }
}

// ===== First-Time User Guide =====
function setupFirstTimeGuide() {
    // Check if user has seen the guide before
    const guideShown = isLocalStorageAvailable() ?
        localStorage.getItem('firstTimeGuideShown') : null;

    // Show guide if this is the first visit
    if (!guideShown) {
        showFirstTimeGuide();
    } else {
        // Hide the overlay if it was already shown
        const overlay = document.getElementById('firstTimeOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    // Setup event listeners for the guide
    setupFirstTimeGuideListeners();
}

function showFirstTimeGuide() {
    const overlay = document.getElementById('firstTimeOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideFirstTimeGuide() {
    const overlay = document.getElementById('firstTimeOverlay');
    if (overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.animation = '';
        }, 300);
    }
}

function setupFirstTimeGuideListeners() {
    const gotItBtn = document.getElementById('gotItBtn');
    const dontShowAgainCheckbox = document.getElementById('dontShowAgain');

    if (!gotItBtn) {
        console.warn('setupFirstTimeGuideListeners: gotItBtn element not found');
    }

    if (!dontShowAgainCheckbox) {
        console.warn('setupFirstTimeGuideListeners: dontShowAgain checkbox not found');
    }

    if (gotItBtn) {
        gotItBtn.addEventListener('click', () => {
            const dontShow = dontShowAgainCheckbox && dontShowAgainCheckbox.checked;

            // Save preference to localStorage
            if (isLocalStorageAvailable()) {
                try {
                    localStorage.setItem('firstTimeGuideShown', 'true');
                    if (dontShow) {
                        localStorage.setItem('firstTimeGuideDontShow', 'true');
                    }
                } catch (e) {
                    console.warn('Unable to save first-time guide state:', e);
                }
            }

            // Hide the overlay
            hideFirstTimeGuide();
        });
    }

    // Close overlay when clicking outside the content
    const overlay = document.getElementById('firstTimeOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                // Just hide without saving preference when clicking outside
                hideFirstTimeGuide();

                // Still mark as shown so it doesn't appear again this session
                if (isLocalStorageAvailable()) {
                    try {
                        localStorage.setItem('firstTimeGuideShown', 'true');
                    } catch (e) {
                        console.warn('Unable to save first-time guide state:', e);
                    }
                }
            }
        });
    } else {
        console.warn('setupFirstTimeGuideListeners: firstTimeOverlay element not found');
    }
}

function setupTouchHandlers() {
    // This will be called when recipe cards are rendered
    // We'll add touch handlers dynamically to recipe cards
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function handleTouchStart(e) {
    const recipeCard = e.target.closest('.recipe-card');
    if (!recipeCard || !state.isTouchDevice) return;

    state.touchStartX = e.touches[0].clientX;
    state.touchStartY = e.touches[0].clientY;

    // Start long-press timer
    state.touchTimer = setTimeout(() => {
        // Get recipe from card
        const recipeId = recipeCard.dataset.recipeId;
        const recipe = state.recipes.find(r => r.id === recipeId);

        if (recipe) {
            // Vibrate if supported
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }

            // Show context menu at touch position
            showContextMenu({
                clientX: state.touchStartX,
                clientY: state.touchStartY,
                preventDefault: () => {},
                stopPropagation: () => {}
            }, recipe);
        }
    }, 500); // 500ms long press
}

function handleTouchMove(e) {
    if (!state.touchTimer) return;

    const touch = e.touches[0];
    const moveX = Math.abs(touch.clientX - state.touchStartX);
    const moveY = Math.abs(touch.clientY - state.touchStartY);

    // Cancel long press if finger moved too much
    if (moveX > 10 || moveY > 10) {
        clearTimeout(state.touchTimer);
        state.touchTimer = null;
    }
}

function handleTouchEnd(e) {
    if (state.touchTimer) {
        clearTimeout(state.touchTimer);
        state.touchTimer = null;
    }
}

// ===== Server API Communication =====
const API_BASE = window.location.origin;

// Retry logic with exponential backoff
async function apiRequestWithRetry(endpoint, options = {}, retries = 3) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const url = `${API_BASE}${endpoint}`;

            // Create AbortController for timeout (compatible approach)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        } catch (error) {
            lastError = error;
            console.warn(`API request attempt ${attempt + 1} failed:`, error);

            // Don't retry on certain errors
            if (error.name === 'AbortError' || (error.message && error.message.includes('400'))) {
                throw error;
            }

            // If this isn't the last attempt, wait before retrying
            if (attempt < retries) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries failed
    throw lastError;
}

async function apiRequest(endpoint, options = {}) {
    return apiRequestWithRetry(endpoint, options, 3);
}

// Update sync status in UI
function updateSyncStatus(status) {
    state.sync.status = status;
    const syncIndicator = document.getElementById('syncIndicator');
    if (!syncIndicator) return;

    const statusMap = {
        'synced': { icon: '✓', text: 'Synced', class: 'synced' },
        'syncing': { icon: '⟳', text: 'Syncing', class: 'syncing' },
        'offline': { icon: '⚠', text: 'Offline', class: 'offline' },
        'error': { icon: '✕', text: 'Sync Error', class: 'error' }
    };

    const statusInfo = statusMap[status] || statusMap['synced'];
    syncIndicator.className = `sync-indicator ${statusInfo.class}`;
    syncIndicator.innerHTML = `<span class="sync-icon">${statusInfo.icon}</span><span class="sync-text">${statusInfo.text}</span>`;

    // Update last sync time if synced successfully
    if (status === 'synced') {
        state.sync.lastSync = new Date();
    }
}

// Online/offline detection
function setupOnlineOfflineDetection() {
    window.addEventListener('online', () => {
        state.sync.isOnline = true;
        updateSyncStatus('synced');
        showToast('Connection restored - syncing data...', 'success');
        // Start health check pings
        startHealthCheckPing();
        // Attempt to sync any pending operations
        syncAllData();
    });

    window.addEventListener('offline', () => {
        state.sync.isOnline = false;
        updateSyncStatus('offline');
        showToast('You are offline - changes will sync when connection is restored', 'info');
        // Stop health check pings
        stopHealthCheckPing();
    });
}

async function loadRecipesFromServer() {
    try {
        const recipes = await apiRequest('/api/recipes');
        return recipes;
    } catch (error) {
        console.warn('Failed to load recipes from server, using cache:', error);
        return null;
    }
}

async function saveRecipesToServer(recipes) {
    try {
        await apiRequest('/api/recipes', {
            method: 'POST',
            body: JSON.stringify(recipes)
        });
        return true;
    } catch (error) {
        console.error('Failed to save recipes to server:', error);
        return false;
    }
}

async function loadTagsFromServer() {
    try {
        const tags = await apiRequest('/api/tags');
        return tags;
    } catch (error) {
        console.warn('Failed to load tags from server, using cache:', error);
        return null;
    }
}

async function saveTagsToServer(tags) {
    try {
        await apiRequest('/api/tags', {
            method: 'POST',
            body: JSON.stringify(tags)
        });
        return true;
    } catch (error) {
        console.error('Failed to save tags to server:', error);
        return false;
    }
}

async function loadSettingsFromServer() {
    try {
        const settings = await apiRequest('/api/settings');
        return settings;
    } catch (error) {
        console.warn('Failed to load settings from server, using cache:', error);
        return null;
    }
}

async function saveSettingsToServer(settings) {
    try {
        await apiRequest('/api/settings', {
            method: 'POST',
            body: JSON.stringify(settings)
        });
        return true;
    } catch (error) {
        console.error('Failed to save settings to server:', error);
        return false;
    }
}

// ===== Local Storage Management =====
function isLocalStorageAvailable() {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

async function loadDataFromStorage() {
    // Check if localStorage is available (can be disabled in iOS private browsing)
    const hasLocalStorage = isLocalStorageAvailable();

    if (!hasLocalStorage) {
        console.warn('localStorage is not available. Data will not persist across sessions.');
    }

    try {
        // Load from both sources for conflict detection
        let localRecipes = null;
        let localTags = null;
        let localSettings = null;

        if (hasLocalStorage) {
            try {
                const storedRecipes = localStorage.getItem('recipes');
                if (storedRecipes) {
                    localRecipes = JSON.parse(storedRecipes);
                }
            } catch (e) {
                console.error('Error loading local recipes:', e);
            }

            try {
                const storedTags = localStorage.getItem('tags');
                if (storedTags) {
                    localTags = JSON.parse(storedTags);
                }
            } catch (e) {
                console.error('Error loading local tags:', e);
            }

            try {
                const storedSettings = localStorage.getItem('settings');
                if (storedSettings) {
                    localSettings = JSON.parse(storedSettings);
                }
            } catch (e) {
                console.error('Error loading local settings:', e);
            }
        }

        // Try to load from server
        const serverRecipes = await loadRecipesFromServer();
        const serverTags = await loadTagsFromServer();
        const serverSettings = await loadSettingsFromServer();

        // Detect conflicts
        const conflicts = detectConflicts(
            localRecipes,
            serverRecipes,
            localTags,
            serverTags,
            localSettings,
            serverSettings
        );

        // If conflicts exist, resolve them
        if (conflicts.length > 0) {
            console.log(`Found ${conflicts.length} conflict(s), showing resolution UI`);
            // Set initial data from server
            if (serverRecipes) state.recipes = serverRecipes;
            if (serverTags) state.tags = serverTags;
            if (serverSettings) state.settings = { ...state.settings, ...serverSettings };

            // Show conflict resolution modal and wait for user input
            await resolveConflicts(conflicts);
        } else {
            // No conflicts - use server data if available, fallback to local
            if (serverRecipes && Array.isArray(serverRecipes)) {
                state.recipes = serverRecipes;
                // Cache to localStorage
                if (hasLocalStorage) {
                    try {
                        localStorage.setItem('recipes', JSON.stringify(serverRecipes));
                    } catch (e) {
                        console.warn('Failed to cache recipes to localStorage:', e);
                    }
                }
            } else if (localRecipes && Array.isArray(localRecipes)) {
                state.recipes = localRecipes;
            }

            if (serverTags && Array.isArray(serverTags)) {
                state.tags = serverTags;
                if (hasLocalStorage) {
                    try {
                        localStorage.setItem('tags', JSON.stringify(serverTags));
                    } catch (e) {
                        console.warn('Failed to cache tags to localStorage:', e);
                    }
                }
            } else if (localTags && Array.isArray(localTags)) {
                state.tags = localTags;
            }

            if (serverSettings && typeof serverSettings === 'object') {
                state.settings = { ...state.settings, ...serverSettings };
                if (hasLocalStorage) {
                    try {
                        localStorage.setItem('settings', JSON.stringify(serverSettings));
                    } catch (e) {
                        console.warn('Failed to cache settings to localStorage:', e);
                    }
                }
            } else if (localSettings && typeof localSettings === 'object') {
                state.settings = { ...state.settings, ...localSettings };
            }
        }

        // Ensure all recipes have required fields
        state.recipes.forEach(recipe => {
            if (!recipe.id) {
                recipe.id = generateId();
            }
            if (!recipe.name) {
                recipe.name = 'Untitled Recipe';
            }
            if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
                recipe.ingredients = [];
            }
            if (!recipe.instructions || !Array.isArray(recipe.instructions)) {
                recipe.instructions = [];
            }
            if (!recipe.tags || !Array.isArray(recipe.tags)) {
                recipe.tags = [];
            }
            if (!recipe.createdAt) {
                recipe.createdAt = new Date().toISOString();
            }
            if (!recipe.updatedAt) {
                recipe.updatedAt = recipe.createdAt;
            }
            if (recipe.isFavorite === undefined) {
                recipe.isFavorite = false;
            }
        });

        // Process tags from server
        if (serverTags && Array.isArray(serverTags)) {
            state.tags = serverTags;
            // Cache to localStorage
            if (hasLocalStorage) {
                try {
                    localStorage.setItem('tags', JSON.stringify(serverTags));
                } catch (e) {
                    console.warn('Failed to cache tags to localStorage:', e);
                }
            }
        } else if (hasLocalStorage) {
            // Fallback to localStorage cache
            const storedTags = localStorage.getItem('tags');
            if (storedTags) {
                try {
                    const parsedTags = JSON.parse(storedTags);
                    if (Array.isArray(parsedTags)) {
                        state.tags = parsedTags;
                    }
                } catch (e) {
                    console.error('Error parsing cached tags:', e);
                }
            }
        }

        // Process settings from server
        if (serverSettings && typeof serverSettings === 'object') {
            state.settings = { ...state.settings, ...serverSettings };
            // Cache to localStorage
            if (hasLocalStorage) {
                try {
                    localStorage.setItem('settings', JSON.stringify(serverSettings));
                } catch (e) {
                    console.warn('Failed to cache settings to localStorage:', e);
                }
            }
        } else if (hasLocalStorage) {
            // Fallback to localStorage cache
            const storedSettings = localStorage.getItem('settings');
            if (storedSettings) {
                try {
                    const parsedSettings = JSON.parse(storedSettings);
                    state.settings = { ...state.settings, ...parsedSettings };
                } catch (e) {
                    console.error('Error parsing cached settings:', e);
                }
            }
        }

        // Load shopping list from localStorage (not synced to server)
        if (hasLocalStorage) {
            loadShoppingListFromStorage();
        }
    } catch (e) {
        console.error('Error loading data:', e);
        showToast('Using cached data. Server connection may be unavailable.', 'warning');
    }

    // Add default tags if none exist
    if (state.tags.length === 0) {
        state.tags = getDefaultTags();
        saveTagsToStorage();
    }

    // Ensure existing tags have required properties
    let needsSave = false;
    state.tags.forEach(tag => {
        if (tag.defaultVisible === undefined) {
            tag.defaultVisible = true;
            needsSave = true;
        }
        if (!tag.id) {
            tag.id = generateId();
            needsSave = true;
        }
    });

    // Save if we had to add missing properties
    if (needsSave) {
        saveTagsToStorage();
    }

    // Apply default view setting
    if (state.settings.defaultView === 'favorites') {
        state.showFavoritesOnly = true;
    }

    // Apply compact view setting
    if (state.settings.compactView) {
        document.body.classList.add('compact-view');
    }
}

function getDefaultTags() {
    return [
        { id: generateId(), name: 'Breakfast', color: '#F59E0B', defaultVisible: true },
        { id: generateId(), name: 'Lunch', color: '#10B981', defaultVisible: true },
        { id: generateId(), name: 'Dinner', color: '#3B82F6', defaultVisible: true },
        { id: generateId(), name: 'Dessert', color: '#EC4899', defaultVisible: true },
        { id: generateId(), name: 'Snack', color: '#F97316', defaultVisible: false },
        { id: generateId(), name: 'Appetizer', color: '#06B6D4', defaultVisible: false },
        { id: generateId(), name: 'Side Dish', color: '#84CC16', defaultVisible: false },
        { id: generateId(), name: 'Vegetarian', color: '#059669', defaultVisible: true },
        { id: generateId(), name: 'Vegan', color: '#14B8A6', defaultVisible: false },
        { id: generateId(), name: 'Quick', color: '#8B5CF6', defaultVisible: true },
        { id: generateId(), name: 'Slow Cooker', color: '#A855F7', defaultVisible: false },
        { id: generateId(), name: 'Healthy', color: '#22C55E', defaultVisible: false }
    ];
}

function checkStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
            const percentUsed = (estimate.usage / estimate.quota) * 100;
            if (percentUsed > 80) {
                showToast('Storage is getting full. Consider exporting your recipes.', 'warning', 5000);
            }
        }).catch(err => {
            console.warn('Unable to check storage quota:', err);
        });
    }
}

async function saveRecipesToStorage() {
    const hasLocalStorage = isLocalStorageAvailable();
    updateSyncStatus('syncing');

    try {
        // Try to save to server first (with retry logic)
        if (state.sync.isOnline) {
            try {
                await saveRecipesToServer(state.recipes);

                // Cache to localStorage for offline access
                if (hasLocalStorage) {
                    try {
                        const recipesJson = JSON.stringify(state.recipes);
                        localStorage.setItem('recipes', recipesJson);
                        checkStorageQuota();
                    } catch (e) {
                        console.warn('Failed to cache recipes to localStorage:', e);
                    }
                }

                updateSyncStatus('synced');
                showToast('Recipes synced to server successfully', 'success', 2000);
                return true;
            } catch (serverError) {
                console.error('Server sync failed:', serverError);

                // Fallback to localStorage only
                if (hasLocalStorage) {
                    try {
                        const recipesJson = JSON.stringify(state.recipes);
                        localStorage.setItem('recipes', recipesJson);
                        checkStorageQuota();
                        updateSyncStatus('offline');
                        showToast('Saved locally - will sync when server is available', 'warning');
                        return true;
                    } catch (e) {
                        console.error('Failed to save to localStorage:', e);
                        updateSyncStatus('error');
                        showToast('Failed to save recipes. Please try again.', 'error');
                        return false;
                    }
                } else {
                    updateSyncStatus('error');
                    showToast('Unable to save recipes. Server unavailable and no local storage.', 'error');
                    return false;
                }
            }
        } else {
            // Offline mode - save to localStorage only
            if (hasLocalStorage) {
                try {
                    const recipesJson = JSON.stringify(state.recipes);
                    localStorage.setItem('recipes', recipesJson);
                    checkStorageQuota();
                    updateSyncStatus('offline');
                    showToast('Saved locally (offline) - will sync when online', 'info');
                    return true;
                } catch (e) {
                    console.error('Failed to save to localStorage:', e);
                    updateSyncStatus('error');
                    showToast('Failed to save recipes locally', 'error');
                    return false;
                }
            } else {
                updateSyncStatus('error');
                showToast('Unable to save recipes. No local storage available.', 'error');
                return false;
            }
        }
    } catch (e) {
        console.error('Error saving recipes:', e);
        updateSyncStatus('error');
        showToast('Failed to save recipes. Please try again.', 'error');
        return false;
    }
}

async function saveTagsToStorage() {
    const hasLocalStorage = isLocalStorageAvailable();
    const timestamp = new Date().toISOString();

    try {
        // Try to save to server first (with retry logic)
        if (state.sync.isOnline) {
            try {
                await saveTagsToServer(state.tags);

                // Cache to localStorage for offline access
                if (hasLocalStorage) {
                    try {
                        const tagsJson = JSON.stringify(state.tags);
                        localStorage.setItem('tags', tagsJson);
                        // Save timestamp metadata
                        localStorage.setItem('tags_meta', JSON.stringify({ lastModified: timestamp }));
                    } catch (e) {
                        console.warn('Failed to cache tags to localStorage:', e);
                    }
                }
                return true;
            } catch (serverError) {
                console.error('Server sync failed for tags:', serverError);

                // Fallback to localStorage only
                if (hasLocalStorage) {
                    try {
                        const tagsJson = JSON.stringify(state.tags);
                        localStorage.setItem('tags', tagsJson);
                        // Save timestamp metadata
                        localStorage.setItem('tags_meta', JSON.stringify({ lastModified: timestamp }));
                        return true;
                    } catch (e) {
                        console.error('Failed to save tags to localStorage:', e);
                        return false;
                    }
                }
            }
        } else {
            // Offline mode - save to localStorage only
            if (hasLocalStorage) {
                try {
                    const tagsJson = JSON.stringify(state.tags);
                    localStorage.setItem('tags', tagsJson);
                    // Save timestamp metadata
                    localStorage.setItem('tags_meta', JSON.stringify({ lastModified: timestamp }));
                    return true;
                } catch (e) {
                    console.error('Failed to save tags to localStorage:', e);
                    return false;
                }
            }
        }
    } catch (e) {
        console.error('Error saving tags:', e);
        return false;
    }
}

async function saveSettingsToStorage() {
    const hasLocalStorage = isLocalStorageAvailable();
    const timestamp = new Date().toISOString();

    try {
        // Try to save to server first (with retry logic)
        if (state.sync.isOnline) {
            try {
                await saveSettingsToServer(state.settings);

                // Cache to localStorage for offline access
                if (hasLocalStorage) {
                    try {
                        const settingsJson = JSON.stringify(state.settings);
                        localStorage.setItem('settings', settingsJson);
                        // Save timestamp metadata
                        localStorage.setItem('settings_meta', JSON.stringify({ lastModified: timestamp }));
                    } catch (e) {
                        console.warn('Failed to cache settings to localStorage:', e);
                    }
                }
                return true;
            } catch (serverError) {
                console.error('Server sync failed for settings:', serverError);

                // Fallback to localStorage only
                if (hasLocalStorage) {
                    try {
                        const settingsJson = JSON.stringify(state.settings);
                        localStorage.setItem('settings', settingsJson);
                        // Save timestamp metadata
                        localStorage.setItem('settings_meta', JSON.stringify({ lastModified: timestamp }));
                        return true;
                    } catch (e) {
                        console.error('Failed to save settings to localStorage:', e);
                        return false;
                    }
                }
            }
        } else {
            // Offline mode - save to localStorage only
            if (hasLocalStorage) {
                try {
                    const settingsJson = JSON.stringify(state.settings);
                    localStorage.setItem('settings', settingsJson);
                    // Save timestamp metadata
                    localStorage.setItem('settings_meta', JSON.stringify({ lastModified: timestamp }));
                    return true;
                } catch (e) {
                    console.error('Failed to save settings to localStorage:', e);
                    return false;
                }
            }
        }
    } catch (e) {
        console.error('Error saving settings:', e);
        return false;
    }
}

// Manual sync function for all data
async function syncAllData() {
    if (!state.sync.isOnline) {
        showToast('Cannot sync while offline', 'warning');
        return false;
    }

    updateSyncStatus('syncing');
    showToast('Syncing all data to server...', 'info', 2000);

    try {
        // Sync all data types
        await saveRecipesToServer(state.recipes);
        await saveTagsToServer(state.tags);
        await saveSettingsToServer(state.settings);

        // Update localStorage cache
        if (isLocalStorageAvailable()) {
            try {
                localStorage.setItem('recipes', JSON.stringify(state.recipes));
                localStorage.setItem('tags', JSON.stringify(state.tags));
                localStorage.setItem('settings', JSON.stringify(state.settings));
            } catch (e) {
                console.warn('Failed to update localStorage cache:', e);
            }
        }

        updateSyncStatus('synced');
        showToast('All data synced successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Sync failed:', error);
        updateSyncStatus('error');
        showToast('Sync failed - please try again', 'error');
        return false;
    }
}

// ===== Server Health Check System =====
async function checkServerHealth() {
    try {
        const health = await apiRequest('/api/health');

        if (health && health.status === 'healthy') {
            state.sync.serverHealthy = true;
            state.sync.lastHealthCheck = new Date();

            // If we were offline and now we're online, attempt to sync
            if (state.sync.status === 'offline' || state.sync.status === 'error') {
                updateSyncStatus('synced');
                showToast('Server connection restored', 'success', 2000);
                // Try to sync any pending changes
                await syncAllData();
            }

            return true;
        } else {
            state.sync.serverHealthy = false;
            return false;
        }
    } catch (error) {
        console.warn('Health check failed:', error);
        state.sync.serverHealthy = false;

        if (state.sync.status !== 'offline') {
            updateSyncStatus('offline');
        }

        return false;
    }
}

function startHealthCheckPing() {
    // Clear any existing interval
    if (state.sync.healthCheckInterval) {
        clearInterval(state.sync.healthCheckInterval);
    }

    // Check immediately
    checkServerHealth();

    // Then check every 30 seconds
    state.sync.healthCheckInterval = setInterval(() => {
        // Only ping if page is visible (don't waste resources on background tabs)
        if (document.visibilityState === 'visible') {
            checkServerHealth();
        }
    }, 30000); // 30 seconds

    console.log('✓ Health check ping started (30s interval)');
}

function stopHealthCheckPing() {
    if (state.sync.healthCheckInterval) {
        clearInterval(state.sync.healthCheckInterval);
        state.sync.healthCheckInterval = null;
        console.log('✓ Health check ping stopped');
    }
}

// Manual refresh sync status
async function refreshSyncStatus() {
    updateSyncStatus('syncing');
    showToast('Checking server status...', 'info', 1500);

    const healthy = await checkServerHealth();

    if (healthy) {
        showToast('Server is online and healthy', 'success', 2000);
    } else {
        showToast('Unable to reach server', 'warning', 2000);
    }
}

// ===== Conflict Resolution System =====
function hasConflict(localData, serverData, localTimestamp, serverTimestamp) {
    if (!localData || !serverData) return false;
    if (!localTimestamp || !serverTimestamp) return false;

    // Check if data has actually changed
    const dataChanged = JSON.stringify(localData) !== JSON.stringify(serverData);
    if (!dataChanged) return false;

    // Check if both have been modified (potential conflict)
    const localTime = new Date(localTimestamp).getTime();
    const serverTime = new Date(serverTimestamp).getTime();

    // If timestamps are within 5 seconds, consider it same modification
    const timeDiff = Math.abs(localTime - serverTime);
    if (timeDiff < 5000) return false;

    // Both versions exist with different timestamps and different data
    return true;
}

function detectConflicts(localRecipes, serverRecipes, localTags, serverTags, localSettings, serverSettings) {
    const conflicts = [];

    // Check recipe conflicts - compare individual recipes by ID
    if (localRecipes && serverRecipes) {
        const localMap = new Map(localRecipes.map(r => [r.id, r]));
        const serverMap = new Map(serverRecipes.map(r => [r.id, r]));

        for (const [id, localRecipe] of localMap) {
            const serverRecipe = serverMap.get(id);
            if (serverRecipe && hasConflict(
                localRecipe,
                serverRecipe,
                localRecipe.updatedAt,
                serverRecipe.updatedAt
            )) {
                conflicts.push({
                    type: 'recipe',
                    id: id,
                    name: localRecipe.name,
                    local: localRecipe,
                    server: serverRecipe,
                    localTime: localRecipe.updatedAt,
                    serverTime: serverRecipe.updatedAt
                });
            }
        }
    }

    // Check tags conflicts - compare entire tags array
    const localTagsStr = localStorage.getItem('tags_meta');
    const serverTagsStr = serverTags ? JSON.stringify(serverTags) : null;

    if (localTagsStr && serverTagsStr && localTags && serverTags) {
        try {
            const localMeta = JSON.parse(localTagsStr);
            if (hasConflict(localTags, serverTags, localMeta.lastModified, serverTags.lastModified)) {
                conflicts.push({
                    type: 'tags',
                    local: localTags,
                    server: serverTags,
                    localTime: localMeta.lastModified,
                    serverTime: serverTags.lastModified
                });
            }
        } catch (e) {
            console.warn('Error checking tags conflict:', e);
        }
    }

    // Check settings conflicts
    const localSettingsStr = localStorage.getItem('settings_meta');
    const serverSettingsStr = serverSettings ? JSON.stringify(serverSettings) : null;

    if (localSettingsStr && serverSettingsStr && localSettings && serverSettings) {
        try {
            const localMeta = JSON.parse(localSettingsStr);
            if (hasConflict(localSettings, serverSettings, localMeta.lastModified, serverSettings.lastModified)) {
                conflicts.push({
                    type: 'settings',
                    local: localSettings,
                    server: serverSettings,
                    localTime: localMeta.lastModified,
                    serverTime: serverSettings.lastModified
                });
            }
        } catch (e) {
            console.warn('Error checking settings conflict:', e);
        }
    }

    return conflicts;
}

async function showConflictResolutionModal(conflict) {
    return new Promise((resolve) => {
        const modal = document.getElementById('conflictModal');
        const closeBtn = document.getElementById('conflictModalClose');
        const keepLocalBtn = document.getElementById('keepLocalBtn');
        const keepServerBtn = document.getElementById('keepServerBtn');
        const localDetail = document.getElementById('localConflictDetail');
        const serverDetail = document.getElementById('serverConflictDetail');
        const description = document.getElementById('conflictDescription');

        // Set conflict details
        let itemName = '';
        if (conflict.type === 'recipe') {
            itemName = `Recipe: "${conflict.name}"`;
        } else if (conflict.type === 'tags') {
            itemName = 'Tags';
        } else if (conflict.type === 'settings') {
            itemName = 'Settings';
        }

        description.textContent = `Changes were made to ${itemName} on different devices. Choose which version to keep:`;

        const localDate = new Date(conflict.localTime).toLocaleString();
        const serverDate = new Date(conflict.serverTime).toLocaleString();

        localDetail.textContent = `Modified: ${localDate}`;
        serverDetail.textContent = `Modified: ${serverDate}`;

        // Store current conflict
        state.conflictResolution.currentConflict = conflict;

        // Show modal
        modal.classList.add('visible');

        const handleKeepLocal = () => {
            cleanup();
            resolve('local');
        };

        const handleKeepServer = () => {
            cleanup();
            resolve('server');
        };

        const handleClose = () => {
            cleanup();
            resolve('server'); // Default to server version if closed
        };

        const cleanup = () => {
            modal.classList.remove('visible');
            keepLocalBtn.removeEventListener('click', handleKeepLocal);
            keepServerBtn.removeEventListener('click', handleKeepServer);
            closeBtn.removeEventListener('click', handleClose);
            state.conflictResolution.currentConflict = null;
        };

        keepLocalBtn.addEventListener('click', handleKeepLocal);
        keepServerBtn.addEventListener('click', handleKeepServer);
        closeBtn.addEventListener('click', handleClose);
    });
}

async function resolveConflicts(conflicts) {
    for (const conflict of conflicts) {
        const choice = await showConflictResolutionModal(conflict);

        if (choice === 'local') {
            // Keep local version - upload to server
            if (conflict.type === 'recipe') {
                const recipeIndex = state.recipes.findIndex(r => r.id === conflict.id);
                if (recipeIndex >= 0) {
                    state.recipes[recipeIndex] = conflict.local;
                }
                await saveRecipesToServer(state.recipes);
                showToast(`Kept local version of "${conflict.name}"`, 'success');
            } else if (conflict.type === 'tags') {
                state.tags = conflict.local;
                await saveTagsToServer(state.tags);
                showToast('Kept local tags', 'success');
            } else if (conflict.type === 'settings') {
                state.settings = conflict.local;
                await saveSettingsToServer(state.settings);
                showToast('Kept local settings', 'success');
            }
        } else {
            // Keep server version - update local
            if (conflict.type === 'recipe') {
                const recipeIndex = state.recipes.findIndex(r => r.id === conflict.id);
                if (recipeIndex >= 0) {
                    state.recipes[recipeIndex] = conflict.server;
                }
                showToast(`Kept server version of "${conflict.name}"`, 'success');
            } else if (conflict.type === 'tags') {
                state.tags = conflict.server;
                showToast('Kept server tags', 'success');
            } else if (conflict.type === 'settings') {
                state.settings = { ...state.settings, ...conflict.server };
                showToast('Kept server settings', 'success');
            }
        }
    }

    // Save everything to localStorage after conflict resolution
    if (isLocalStorageAvailable()) {
        try {
            localStorage.setItem('recipes', JSON.stringify(state.recipes));
            localStorage.setItem('tags', JSON.stringify(state.tags));
            localStorage.setItem('settings', JSON.stringify(state.settings));
        } catch (e) {
            console.warn('Failed to save after conflict resolution:', e);
        }
    }

    // Re-render the UI
    renderRecipes();
}

// ===== Event Listeners Setup =====
function setupEventListeners() {
    // Search is handled by setupRealTimeSearch

    // Sync indicator click to manually refresh
    const syncIndicator = document.getElementById('syncIndicator');
    if (syncIndicator) {
        syncIndicator.style.cursor = 'pointer';
        syncIndicator.addEventListener('click', () => {
            refreshSyncStatus();
        });
    }

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            navigateTo(page);
        });
    });

    // Mobile Menu Navigation
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            navigateTo(page);
            closeMobileMenu(); // Close menu after navigation
        });
    });

    // Logo click to navigate home
    const logoBtn = document.getElementById('logoBtn');
    if (logoBtn) {
        logoBtn.addEventListener('click', () => {
            navigateTo('home');
            closeMobileMenu(); // Close menu if open on mobile
        });

        // Keyboard support
        logoBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigateTo('home');
                closeMobileMenu();
            }
        });
    }

    // Hamburger Menu Toggle
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', toggleMobileMenu);
    }

    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', closeMobileMenu);
    }

    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', closeMobileMenu);
    }

    // Close mobile menu on escape key
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Close modals and menus on Escape
        if (e.key === 'Escape') {
            closeMobileMenu();

            // Close any open modals with animation
            const modals = document.querySelectorAll('.modal.visible');
            modals.forEach(modal => {
                closeModalWithAnimation(modal);
            });

            // Close side panel
            closeSidePanel();

            // Dismiss visible toast
            const toast = document.getElementById('toast');
            if (toast && toast.classList.contains('visible')) {
                dismissToast();
            }
        }

        // Show help page with ? key
        if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const target = e.target;
            // Only trigger if not in an input field
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
                e.preventDefault();
                navigateTo('help');
            }
        }

        // Focus search with Ctrl/Cmd + F
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }

        // Add new recipe with Ctrl/Cmd + N
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openRecipeEditorModal();
        }

        // Navigate between recipe cards with arrow keys
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            const target = e.target;
            // Only trigger if not in an input field
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
                const recipeCards = Array.from(document.querySelectorAll('.recipe-card:not([style*="display: none"])'));
                if (recipeCards.length === 0) return;

                let currentIndex = -1;
                const focusedCard = recipeCards.find((card, index) => {
                    if (card === document.activeElement || card.contains(document.activeElement)) {
                        currentIndex = index;
                        return true;
                    }
                    return false;
                });

                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const nextIndex = currentIndex < recipeCards.length - 1 ? currentIndex + 1 : 0;
                    recipeCards[nextIndex].focus();
                    recipeCards[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : recipeCards.length - 1;
                    recipeCards[prevIndex].focus();
                    recipeCards[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }
    });

    // Settings Button (Desktop)
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            navigateTo('settings');
        });
    }

    // Settings Button (Mobile)
    const settingsBtnMobile = document.getElementById('settingsBtnMobile');
    if (settingsBtnMobile) {
        settingsBtnMobile.addEventListener('click', () => {
            closeMobileMenu();
            navigateTo('settings');
        });
    }

    // Recipe Form
    const recipeForm = document.getElementById('recipeForm');
    const cancelBtn = document.getElementById('cancelBtn');

    if (recipeForm) {
        recipeForm.addEventListener('submit', handleRecipeSubmit);
    } else {
        console.warn('setupEventListeners: recipeForm element not found');
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeRecipeEditorModal);
    } else {
        console.warn('setupEventListeners: cancelBtn element not found');
    }

    // Tag Management
    const addTagBtn = document.getElementById('addTagBtn');
    const newTagInput = document.getElementById('newTagInput');

    if (addTagBtn) {
        addTagBtn.addEventListener('click', handleAddTag);
    } else {
        console.warn('setupEventListeners: addTagBtn element not found');
    }

    if (newTagInput) {
        newTagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAddTag();
        });
    } else {
        console.warn('setupEventListeners: newTagInput element not found');
    }

    // Recipe Tags Input
    const tagsInput = document.getElementById('recipeTagsInput');

    if (tagsInput) {
        tagsInput.addEventListener('input', handleTagsInput);
        tagsInput.addEventListener('focus', showTagsSuggestions);
        tagsInput.addEventListener('blur', () => {
            setTimeout(() => hideTagsSuggestions(), 200);
        });
    } else {
        console.warn('setupEventListeners: recipeTagsInput element not found');
    }

    // Import
    setupImportListeners();

    // Image Upload
    setupImageUploadListeners();

    // Recipe Detail Modal
    const modalClose = document.getElementById('modalClose');
    const recipeModal = document.getElementById('recipeModal');
    const editRecipeBtn = document.getElementById('editRecipeBtn');
    const deleteRecipeBtn = document.getElementById('deleteRecipeBtn');

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    } else {
        console.warn('setupEventListeners: modalClose element not found');
    }

    if (recipeModal) {
        recipeModal.addEventListener('click', (e) => {
            if (e.target.id === 'recipeModal') closeModal();
        });
    } else {
        console.warn('setupEventListeners: recipeModal element not found');
    }

    if (editRecipeBtn) {
        editRecipeBtn.addEventListener('click', handleEditRecipe);
    } else {
        console.warn('setupEventListeners: editRecipeBtn element not found');
    }

    if (deleteRecipeBtn) {
        deleteRecipeBtn.addEventListener('click', handleDeleteRecipe);
    } else {
        console.warn('setupEventListeners: deleteRecipeBtn element not found');
    }

    // Recipe Editor Modal
    const recipeEditorClose = document.getElementById('recipeEditorClose');
    const recipeEditorModal = document.getElementById('recipeEditorModal');

    if (recipeEditorClose) {
        recipeEditorClose.addEventListener('click', closeRecipeEditorModal);
    } else {
        console.warn('setupEventListeners: recipeEditorClose element not found');
    }

    if (recipeEditorModal) {
        recipeEditorModal.addEventListener('click', (e) => {
            if (e.target.id === 'recipeEditorModal') closeRecipeEditorModal();
        });
    } else {
        console.warn('setupEventListeners: recipeEditorModal element not found');
    }

    // Side Panel
    const sidePanelClose = document.getElementById('sidePanelClose');
    const sidePanelOverlay = document.getElementById('sidePanelOverlay');

    if (sidePanelClose) {
        sidePanelClose.addEventListener('click', closeSidePanel);
    } else {
        console.warn('setupEventListeners: sidePanelClose element not found');
    }

    if (sidePanelOverlay) {
        sidePanelOverlay.addEventListener('click', closeSidePanel);
    } else {
        console.warn('setupEventListeners: sidePanelOverlay element not found');
    }

    // Shopping List
    const addToShoppingListBtn = document.getElementById('addToShoppingListBtn');
    const addCustomItemBtn = document.getElementById('addCustomItemBtn');
    const clearShoppingListBtn = document.getElementById('clearShoppingListBtn');

    if (addToShoppingListBtn) {
        addToShoppingListBtn.addEventListener('click', openRecipeSelectionModal);
    } else {
        console.warn('setupEventListeners: addToShoppingListBtn element not found');
    }

    if (addCustomItemBtn) {
        addCustomItemBtn.addEventListener('click', addCustomItemToShoppingList);
    } else {
        console.warn('setupEventListeners: addCustomItemBtn element not found');
    }

    if (clearShoppingListBtn) {
        clearShoppingListBtn.addEventListener('click', clearShoppingList);
    } else {
        console.warn('setupEventListeners: clearShoppingListBtn element not found');
    }

    // Recipe Selection Modal
    const recipeSelectionClose = document.getElementById('recipeSelectionClose');
    const cancelRecipeSelectionBtn = document.getElementById('cancelRecipeSelectionBtn');
    const confirmRecipeSelectionBtn = document.getElementById('confirmRecipeSelectionBtn');
    const recipeSelectionModal = document.getElementById('recipeSelectionModal');

    if (recipeSelectionClose) {
        recipeSelectionClose.addEventListener('click', closeRecipeSelectionModal);
    } else {
        console.warn('setupEventListeners: recipeSelectionClose element not found');
    }

    if (cancelRecipeSelectionBtn) {
        cancelRecipeSelectionBtn.addEventListener('click', closeRecipeSelectionModal);
    } else {
        console.warn('setupEventListeners: cancelRecipeSelectionBtn element not found');
    }

    if (confirmRecipeSelectionBtn) {
        confirmRecipeSelectionBtn.addEventListener('click', confirmRecipeSelection);
    } else {
        console.warn('setupEventListeners: confirmRecipeSelectionBtn element not found');
    }

    if (recipeSelectionModal) {
        recipeSelectionModal.addEventListener('click', (e) => {
            if (e.target.id === 'recipeSelectionModal') closeRecipeSelectionModal();
        });
    } else {
        console.warn('setupEventListeners: recipeSelectionModal element not found');
    }

    // Context Menu
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('contextmenu', (e) => {
        // Only prevent default if not on a recipe card
        if (!e.target.closest('.recipe-card')) {
            return;
        }
    });

    // Clear Filters Button
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }

    // Tags Collapse Toggle
    const tagsCollapseToggle = document.getElementById('tagsCollapseToggle');
    if (tagsCollapseToggle) {
        tagsCollapseToggle.addEventListener('click', toggleTagsCollapse);

        // Keyboard support for toggle button
        tagsCollapseToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTagsCollapse();
            }
        });

        // Initialize collapse state on load
        initializeTagsCollapseState();
    }
}

function setupImportListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const singleFileInput = document.getElementById('singleFileInput');

    if (!uploadArea) {
        console.warn('setupImportListeners: uploadArea element not found');
        return;
    }

    if (!singleFileInput) {
        console.warn('setupImportListeners: singleFileInput element not found');
        return;
    }

    uploadArea.addEventListener('click', () => {
        singleFileInput.click();
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        handleFilesDrop(e.dataTransfer.files);
    });

    singleFileInput.addEventListener('change', (e) => {
        handleFilesDrop(e.target.files);
        // Reset input value to allow re-uploading the same file
        e.target.value = '';
    });
}

function setupImageUploadListeners() {
    const uploadBtn = document.getElementById('uploadImageBtn');
    const removeBtn = document.getElementById('removeImageBtn');
    const imageInput = document.getElementById('recipeImage');

    if (!uploadBtn) {
        console.warn('setupImageUploadListeners: uploadImageBtn element not found');
        return;
    }

    if (!removeBtn) {
        console.warn('setupImageUploadListeners: removeImageBtn element not found');
        return;
    }

    if (!imageInput) {
        console.warn('setupImageUploadListeners: recipeImage element not found');
        return;
    }

    uploadBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        handleImageUpload(e.target.files[0]);
    });

    removeBtn.addEventListener('click', () => {
        removeRecipeImage();
    });
}

function compressImage(base64, maxWidth = 800, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions while maintaining aspect ratio
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to base64 with compression
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };
        img.onerror = () => {
            reject(new Error('Failed to load image for compression'));
        };
        img.src = base64;
    });
}

function handleImageUpload(file) {
    if (!file) {
        console.warn('No file provided to handleImageUpload');
        return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        console.error('Image file too large:', file.size);
        showToast('Image size must be less than 5MB', 'error');
        return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
        console.error('Invalid file type:', file.type);
        showToast('Please select a valid image file', 'error');
        return;
    }

    // Show loading state
    const preview = document.getElementById('imagePreview');
    const uploadBtn = document.getElementById('uploadImageBtn');
    if (preview) {
        preview.innerHTML = `
            <div class="image-placeholder">
                <span class="image-icon">⏳</span>
                <p>Processing image...</p>
            </div>
        `;
    }
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Processing...';
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            // Use mobile-specific compression settings
            const isMobile = state.isMobile;
            const maxWidth = isMobile ? 600 : 800;
            const quality = isMobile ? 0.8 : 0.85;

            // Compress the image before saving
            const compressedImage = await compressImage(e.target.result, maxWidth, quality);
            state.currentImageData = compressedImage;
            displayImagePreview(state.currentImageData);
            showToast('Image uploaded and compressed successfully', 'success');
        } catch (error) {
            console.error('Error compressing image:', error);
            // Fallback to original image if compression fails
            state.currentImageData = e.target.result;
            displayImagePreview(state.currentImageData);
            showToast('Image uploaded successfully (compression failed)', 'success');
        } finally {
            // Restore button state
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Choose Image';
            }
        }
    };

    reader.onerror = () => {
        console.error('Error reading image file');
        showToast('Unable to read image file. Please try a different file.', 'error');

        // Restore button state
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Choose Image';
        }

        // Restore preview placeholder
        if (preview) {
            preview.innerHTML = `
                <div class="image-placeholder">
                    <span class="image-icon">📷</span>
                    <p>No image selected</p>
                </div>
            `;
        }
    };

    reader.readAsDataURL(file);
}

function displayImagePreview(imageData) {
    const preview = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImageBtn');

    preview.innerHTML = `<img src="${imageData}" alt="Recipe preview">`;
    removeBtn.style.display = 'inline-flex';
}

function removeRecipeImage() {
    state.currentImageData = null;
    const preview = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImageBtn');
    const imageInput = document.getElementById('recipeImage');

    preview.innerHTML = `
        <div class="image-placeholder">
            <span class="image-icon">📷</span>
            <p>No image selected</p>
        </div>
    `;
    removeBtn.style.display = 'none';
    imageInput.value = '';
    showToast('Image removed', 'success');
}

// ===== Theme Management =====
function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);

    if (isLocalStorageAvailable()) {
        try {
            localStorage.setItem('theme', themeName);
        } catch (e) {
            console.warn('Unable to save theme preference:', e);
        }
    }

    showToast(`Theme changed to ${themeName}`, 'success');
}

function applyTheme() {
    let savedTheme = 'claude'; // Default theme

    if (isLocalStorageAvailable()) {
        try {
            savedTheme = localStorage.getItem('theme') || 'claude';
        } catch (e) {
            console.warn('Unable to load theme preference:', e);
        }
    }

    document.body.setAttribute('data-theme', savedTheme);
}

function updateActiveThemeCard() {
    const currentTheme = document.body.getAttribute('data-theme');
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.toggle('active', card.dataset.theme === currentTheme);
    });
}

// ===== Navigation =====
function navigateTo(page) {
    state.currentPage = page;

    // Close any open overlays, modals, and panels for clean page transition
    closeSidePanel();
    hideSearchPreview();
    hideContextMenu();

    // Update nav buttons (desktop)
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Update mobile nav buttons
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === page + 'Page');
    });

    // Render page content
    switch(page) {
        case 'home':
            renderQuickTags(); // Re-render tags in case they were modified
            renderRecipes();
            break;
        case 'tags':
            renderTagsPage();
            break;
        case 'import':
            // Import page is static
            break;
        case 'settings':
            renderSettingsPage();
            break;
        case 'help':
            renderHelpPage();
            break;
        case 'shopping-list':
            renderShoppingList();
            break;
    }
}

// ===== Mobile Menu Functions =====
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    const isOpen = mobileMenu.classList.contains('active');

    if (isOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

function openMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    mobileMenu.classList.add('active');
    mobileMenuOverlay.classList.add('active');
    hamburgerBtn.classList.add('active');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-menu-open');
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    if (mobileMenu) mobileMenu.classList.remove('active');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
    if (hamburgerBtn) {
        hamburgerBtn.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
    }
    document.body.classList.remove('mobile-menu-open');
}

// ===== Search Functionality =====
function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    state.currentFilter = query;

    // Navigate to home page when searching
    if (state.currentPage !== 'home') {
        navigateTo('home');
    } else {
        renderRecipes();
    }
}

function renderQuickTags() {
    const container = document.getElementById('quickTags');
    const clearBtn = document.getElementById('clearFiltersBtn');

    if (!container) return;

    container.innerHTML = '';

    // Only show tags that are set to be visible by default
    const visibleTags = state.tags.filter(tag => tag.defaultVisible === true);

    visibleTags.forEach(tag => {
        const tagEl = document.createElement('button');
        tagEl.className = 'tag';
        tagEl.type = 'button';
        tagEl.setAttribute('aria-pressed', state.selectedTags.has(tag.name));
        tagEl.setAttribute('aria-label', `Filter by ${tag.name}`);
        tagEl.setAttribute('role', 'switch');

        const isSelected = state.selectedTags.has(tag.name);

        // Set tag content with visual indicator for selection
        if (isSelected) {
            tagEl.innerHTML = `<span class="tag-checkmark">✓</span> ${tag.name}`;
            tagEl.classList.add('selected');
            tagEl.style.backgroundColor = tag.color;
            tagEl.style.borderColor = tag.color;
            tagEl.style.color = 'white';
            tagEl.style.fontWeight = '600';
        } else {
            tagEl.textContent = tag.name;
            tagEl.style.backgroundColor = tag.color + '15';
            tagEl.style.borderColor = tag.color + '60';
            tagEl.style.color = tag.color;
        }

        tagEl.addEventListener('click', () => toggleTagFilter(tag.name));

        // Keyboard support
        tagEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTagFilter(tag.name);
            }
        });

        // Add hover effect data
        tagEl.dataset.tagColor = tag.color;

        container.appendChild(tagEl);
    });

    // Show/hide clear filters button
    if (clearBtn) {
        if (state.selectedTags.size > 0) {
            clearBtn.style.display = 'inline-flex';
            clearBtn.querySelector('span:last-child') &&
                (clearBtn.querySelector('span:last-child').textContent =
                    state.selectedTags.size === 1 ? ' Clear filter' : ' Clear filters');
        } else {
            clearBtn.style.display = 'none';
        }
    }
}

function toggleTagFilter(tagName) {
    if (!tagName) return;

    if (state.selectedTags.has(tagName)) {
        state.selectedTags.delete(tagName);
        showToast(`Removed filter: ${tagName}`, 'success', 2000);
    } else {
        state.selectedTags.add(tagName);
        showToast(`Filtering by: ${tagName}`, 'success', 2000);
    }

    renderQuickTags();
    renderRecipes();
    updateFilterStatus();
}

function clearAllFilters() {
    if (state.selectedTags.size === 0) return;

    const count = state.selectedTags.size;
    state.selectedTags.clear();

    // Clear search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        state.currentFilter = '';
    }

    renderQuickTags();
    renderRecipes();
    updateFilterStatus();

    showToast(`Cleared ${count} filter${count !== 1 ? 's' : ''}`, 'success', 2000);
}

// ===== Tags Collapse/Expand Functionality =====
function initializeTagsCollapseState() {
    const tagsCollapsibleContent = document.getElementById('tagsCollapsibleContent');
    const tagsCollapseToggle = document.getElementById('tagsCollapseToggle');
    const chevron = tagsCollapseToggle?.querySelector('.collapse-chevron');

    if (!tagsCollapsibleContent || !tagsCollapseToggle) return;

    // Check if we have a saved state in localStorage
    let isCollapsed = false;

    if (isLocalStorageAvailable()) {
        try {
            const savedState = localStorage.getItem('tagsCollapsed');
            if (savedState !== null) {
                isCollapsed = savedState === 'true';
            } else {
                // Default: collapsed on mobile, expanded on desktop
                isCollapsed = window.innerWidth < 768;
            }
        } catch (e) {
            console.warn('Failed to read tags collapse state:', e);
            // Default: collapsed on mobile, expanded on desktop
            isCollapsed = window.innerWidth < 768;
        }
    } else {
        // No localStorage available, use default
        isCollapsed = window.innerWidth < 768;
    }

    // Apply the initial state
    if (isCollapsed) {
        tagsCollapsibleContent.classList.add('collapsed');
        tagsCollapseToggle.setAttribute('aria-expanded', 'false');
        if (chevron) {
            chevron.style.transform = 'rotate(-90deg)';
        }
    } else {
        tagsCollapsibleContent.classList.remove('collapsed');
        tagsCollapseToggle.setAttribute('aria-expanded', 'true');
        if (chevron) {
            chevron.style.transform = 'rotate(0deg)';
        }
    }
}

function toggleTagsCollapse() {
    const tagsCollapsibleContent = document.getElementById('tagsCollapsibleContent');
    const tagsCollapseToggle = document.getElementById('tagsCollapseToggle');
    const chevron = tagsCollapseToggle?.querySelector('.collapse-chevron');

    if (!tagsCollapsibleContent || !tagsCollapseToggle) return;

    const isCurrentlyCollapsed = tagsCollapsibleContent.classList.contains('collapsed');

    if (isCurrentlyCollapsed) {
        // Expand
        tagsCollapsibleContent.classList.remove('collapsed');
        tagsCollapseToggle.setAttribute('aria-expanded', 'true');
        if (chevron) {
            chevron.style.transform = 'rotate(0deg)';
        }

        // Save state to localStorage
        if (isLocalStorageAvailable()) {
            try {
                localStorage.setItem('tagsCollapsed', 'false');
            } catch (e) {
                console.warn('Failed to save tags collapse state:', e);
            }
        }
    } else {
        // Collapse
        tagsCollapsibleContent.classList.add('collapsed');
        tagsCollapseToggle.setAttribute('aria-expanded', 'false');
        if (chevron) {
            chevron.style.transform = 'rotate(-90deg)';
        }

        // Save state to localStorage
        if (isLocalStorageAvailable()) {
            try {
                localStorage.setItem('tagsCollapsed', 'true');
            } catch (e) {
                console.warn('Failed to save tags collapse state:', e);
            }
        }
    }
}

function updateFilterStatus() {
    // Update UI to show active filter count
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (!clearBtn) return;

    const filterCount = state.selectedTags.size;
    if (filterCount > 0) {
        clearBtn.innerHTML = `<span>✕</span> Clear ${filterCount} filter${filterCount !== 1 ? 's' : ''}`;
    }
}

// ===== Favorites Management =====
function toggleFavorite(recipeId) {
    const recipe = state.recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    recipe.isFavorite = !recipe.isFavorite;

    // Haptic feedback for toggle
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }

    updateRecipeTimestamp(recipe);
    saveRecipesToStorage();
    renderRecipes();

    const message = recipe.isFavorite ?
        `Added "${recipe.name}" to favorites` :
        `Removed "${recipe.name}" from favorites`;
    showToast(message, 'success');
}

function toggleFavoritesView() {
    state.showFavoritesOnly = !state.showFavoritesOnly;
    renderRecipes();
    updateFavoritesButton();

    const message = state.showFavoritesOnly ?
        'Showing favorites only' :
        'Showing all recipes';
    showToast(message, 'success');
}

function updateFavoritesButton() {
    const btn = document.getElementById('toggleFavoritesBtn');
    if (!btn) return;

    const favCount = state.recipes.filter(r => r.isFavorite).length;

    if (state.showFavoritesOnly) {
        btn.classList.add('active');
        btn.innerHTML = `<span class="fav-icon">⭐</span> Favorites (${favCount})`;
    } else {
        btn.classList.remove('active');
        btn.innerHTML = `<span class="fav-icon">☆</span> Show Favorites (${favCount})`;
    }
}

// ===== Recipe Rendering =====
function renderInitialView() {
    // Always render quick tags so they're available immediately
    renderQuickTags();

    const welcomeText = document.getElementById('welcomeText');

    if (state.recipes.length === 0) {
        document.getElementById('emptyState').classList.add('visible');
        if (welcomeText) {
            welcomeText.classList.add('hidden');
        }
    } else {
        if (welcomeText) {
            welcomeText.classList.remove('hidden');
        }
        renderRecipes();
    }
    updateFavoritesButton();
}

function renderRecipes() {
    // Only render recipes if on home page
    if (state.currentPage !== 'home') {
        return;
    }

    const container = document.getElementById('resultsContainer');
    const emptyState = document.getElementById('emptyState');
    const welcomeText = document.getElementById('welcomeText');

    const filteredRecipes = getFilteredRecipes();

    container.innerHTML = '';

    // Toggle welcome text visibility based on total recipes (not filtered)
    // Hide welcome when there are no recipes at all (empty state will show)
    // Show welcome when there are recipes (even if filtered results are empty)
    if (state.recipes.length === 0) {
        welcomeText.classList.add('hidden');
    } else {
        welcomeText.classList.remove('hidden');
    }

    if (filteredRecipes.length === 0) {
        emptyState.classList.add('visible');
    } else {
        emptyState.classList.remove('visible');

        filteredRecipes.forEach(recipe => {
            const card = createRecipeCard(recipe);
            container.appendChild(card);
        });
    }

    // Update favorites button if it exists
    updateFavoritesButton();
}

function getFilteredRecipes() {
    let filtered = [...state.recipes];

    // Apply favorites filter
    if (state.showFavoritesOnly) {
        filtered = filtered.filter(recipe => recipe.isFavorite === true);
    }

    // Apply search filter
    if (state.currentFilter && state.currentFilter.trim()) {
        filtered = filtered.filter(recipe => {
            if (!recipe) return false;

            const searchText = state.currentFilter.toLowerCase().trim();
            const name = (recipe.name || '').toLowerCase();
            const notes = (recipe.notes || '').toLowerCase();
            const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
            const tags = Array.isArray(recipe.tags) ? recipe.tags : [];

            return (
                name.includes(searchText) ||
                ingredients.some(ing => (ing || '').toLowerCase().includes(searchText)) ||
                tags.some(tag => (tag || '').toLowerCase().includes(searchText)) ||
                notes.includes(searchText)
            );
        });
    }

    // Apply tag filter
    if (state.selectedTags && state.selectedTags.size > 0) {
        filtered = filtered.filter(recipe => {
            if (!recipe || !Array.isArray(recipe.tags)) return false;
            return recipe.tags.some(tag => state.selectedTags.has(tag));
        });
    }

    // Apply sorting
    switch (state.settings.sortOrder) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'alphabetical':
            filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
    }

    return filtered;
}

function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.dataset.recipeId = recipe.id; // Add recipe ID for touch handlers
    card.tabIndex = 0; // Make focusable for keyboard navigation
    card.setAttribute('aria-label', `Recipe: ${recipe.name || 'Untitled'}`);
    card.onclick = (e) => openSidePanel(recipe, e.currentTarget);

    // Allow Enter key to open recipe
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            openSidePanel(recipe, e.currentTarget);
        }
    });

    // Add right-click context menu (only for non-touch devices)
    if (!state.isTouchDevice) {
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e, recipe);
        });
    }

    // Add favorites toggle button
    const favBtn = document.createElement('button');
    favBtn.className = 'favorite-btn';
    favBtn.innerHTML = recipe.isFavorite ? '⭐' : '☆';
    favBtn.title = recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites';
    favBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(recipe.id);
    };
    card.appendChild(favBtn);

    // Add image if exists
    if (recipe.image && state.settings.showImages) {
        const img = document.createElement('img');
        img.className = 'recipe-card-image';
        img.src = recipe.image;
        img.alt = recipe.name;
        img.loading = 'lazy'; // Lazy load images for better performance
        card.appendChild(img);
    }

    const header = document.createElement('div');
    header.className = 'recipe-card-header';

    const title = document.createElement('h3');
    title.className = 'recipe-card-title';
    title.textContent = recipe.name;
    header.appendChild(title);

    if (recipe.prepTime || recipe.cookTime || recipe.servings) {
        const meta = document.createElement('div');
        meta.className = 'recipe-card-meta';

        if (recipe.prepTime) {
            const prepTime = document.createElement('div');
            prepTime.className = 'recipe-card-meta-item';
            prepTime.innerHTML = `<span>⏱️</span> ${recipe.prepTime}`;
            meta.appendChild(prepTime);
        }

        if (recipe.cookTime) {
            const cookTime = document.createElement('div');
            cookTime.className = 'recipe-card-meta-item';
            cookTime.innerHTML = `<span>🔥</span> ${recipe.cookTime}`;
            meta.appendChild(cookTime);
        }

        if (recipe.servings) {
            const servings = document.createElement('div');
            servings.className = 'recipe-card-meta-item';
            servings.innerHTML = `<span>🍽️</span> ${recipe.servings} servings`;
            meta.appendChild(servings);
        }

        header.appendChild(meta);
    }

    card.appendChild(header);

    if (recipe.tags && recipe.tags.length > 0) {
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'recipe-card-tags';

        recipe.tags.forEach(tagName => {
            const tag = state.tags.find(t => t.name === tagName);
            const tagEl = document.createElement('span');
            tagEl.className = 'recipe-card-tag';
            tagEl.textContent = tagName;
            if (tag) {
                tagEl.style.backgroundColor = tag.color + '30';
                tagEl.style.color = tag.color;
            }

            // Make tags clickable to filter
            tagEl.style.cursor = 'pointer';
            tagEl.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent opening recipe modal

                // Navigate to home page if not already there
                if (state.currentPage !== 'home') {
                    navigateTo('home');
                }

                // Toggle the tag filter
                toggleTagFilter(tagName);

                showToast(`Filtering by ${tagName}`, 'success');
            });

            tagsContainer.appendChild(tagEl);
        });

        card.appendChild(tagsContainer);
    }

    if (recipe.ingredients && recipe.ingredients.length > 0) {
        const preview = document.createElement('div');
        preview.className = 'recipe-card-preview';
        preview.textContent = recipe.ingredients.slice(0, 3).join(', ');
        if (recipe.ingredients.length > 3) {
            preview.textContent += '...';
        }
        card.appendChild(preview);
    }

    return card;
}

// ===== Context Menu =====
function showContextMenu(event, recipe) {
    event.preventDefault();
    event.stopPropagation();

    // Haptic feedback for context menu
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }

    state.contextMenu.targetRecipe = recipe;
    state.contextMenu.x = event.clientX;
    state.contextMenu.y = event.clientY;
    state.contextMenu.visible = true;

    renderContextMenu();
}

function hideContextMenu() {
    if (state.contextMenu.visible) {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.remove();
        }
        state.contextMenu.visible = false;
        state.contextMenu.targetRecipe = null;
    }
}

function renderContextMenu() {
    // Remove existing context menu if any
    hideContextMenu();

    const recipe = state.contextMenu.targetRecipe;
    if (!recipe) return;

    const menu = document.createElement('div');
    menu.id = 'contextMenu';
    menu.className = 'context-menu';
    menu.style.left = state.contextMenu.x + 'px';
    menu.style.top = state.contextMenu.y + 'px';

    // Add Tags section
    const addTagsSection = document.createElement('div');
    addTagsSection.className = 'context-menu-section';
    addTagsSection.innerHTML = '<div class="context-menu-header">Add Tags</div>';

    // Get tags not already on this recipe
    const availableTags = state.tags.filter(tag => !recipe.tags.includes(tag.name));

    if (availableTags.length > 0) {
        availableTags.forEach(tag => {
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.innerHTML = `
                <div class="context-menu-tag-color" style="background-color: ${tag.color};"></div>
                <span>${tag.name}</span>
            `;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                addTagToRecipe(recipe.id, tag.name);
            });
            addTagsSection.appendChild(item);
        });
    } else {
        const noTags = document.createElement('div');
        noTags.className = 'context-menu-item disabled';
        noTags.textContent = 'All tags already added';
        addTagsSection.appendChild(noTags);
    }

    menu.appendChild(addTagsSection);

    // Remove Tags section
    if (recipe.tags.length > 0) {
        const removeTagsSection = document.createElement('div');
        removeTagsSection.className = 'context-menu-section';
        removeTagsSection.innerHTML = '<div class="context-menu-header">Remove Tags</div>';

        recipe.tags.forEach(tagName => {
            const tag = state.tags.find(t => t.name === tagName);
            const item = document.createElement('div');
            item.className = 'context-menu-item remove';
            item.innerHTML = `
                <div class="context-menu-tag-color" style="background-color: ${tag?.color || '#8B5CF6'};"></div>
                <span>${tagName}</span>
            `;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                removeTagFromRecipe(recipe.id, tagName);
            });
            removeTagsSection.appendChild(item);
        });

        menu.appendChild(removeTagsSection);
    }

    // Adjust position if menu goes off screen
    document.body.appendChild(menu);

    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = (state.contextMenu.x - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = (state.contextMenu.y - rect.height) + 'px';
    }

    state.contextMenu.visible = true;
}

function addTagToRecipe(recipeId, tagName) {
    const recipe = state.recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    if (!recipe.tags.includes(tagName)) {
        recipe.tags.push(tagName);
        updateRecipeTimestamp(recipe);
        saveRecipesToStorage();
        renderRecipes();
        showToast(`Added tag "${tagName}" to ${recipe.name}`, 'success');
    }

    hideContextMenu();
}

function removeTagFromRecipe(recipeId, tagName) {
    const recipe = state.recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    recipe.tags = recipe.tags.filter(t => t !== tagName);
    updateRecipeTimestamp(recipe);
    saveRecipesToStorage();
    renderRecipes();
    showToast(`Removed tag "${tagName}" from ${recipe.name}`, 'success');

    hideContextMenu();
}

function updateRecipeTimestamp(recipe) {
    recipe.updatedAt = new Date().toISOString();
}

// ===== Recipe Modal =====
function openRecipeModal(recipe) {
    state.currentRecipe = recipe;

    const modal = document.getElementById('recipeModal');
    const modalName = document.getElementById('modalRecipeName');
    const modalBody = document.getElementById('modalBody');

    modalName.textContent = recipe.name;

    let bodyHTML = '';

    // Image
    if (recipe.image) {
        bodyHTML += `<img src="${recipe.image}" alt="${recipe.name}" class="modal-image" loading="lazy">`;
    }

    // Meta information
    if (recipe.prepTime || recipe.cookTime || recipe.servings) {
        bodyHTML += '<div class="modal-meta">';
        if (recipe.prepTime) {
            bodyHTML += `
                <div class="modal-meta-item">
                    <div class="modal-meta-label">Prep Time</div>
                    <div class="modal-meta-value">${recipe.prepTime}</div>
                </div>
            `;
        }
        if (recipe.cookTime) {
            bodyHTML += `
                <div class="modal-meta-item">
                    <div class="modal-meta-label">Cook Time</div>
                    <div class="modal-meta-value">${recipe.cookTime}</div>
                </div>
            `;
        }
        if (recipe.servings) {
            bodyHTML += `
                <div class="modal-meta-item">
                    <div class="modal-meta-label">Servings</div>
                    <div class="modal-meta-value">${recipe.servings}</div>
                </div>
            `;
        }
        bodyHTML += '</div>';
    }

    // Timestamp information
    bodyHTML += '<div class="modal-timestamps">';
    if (recipe.createdAt) {
        const createdDate = new Date(recipe.createdAt);
        bodyHTML += `
            <div class="modal-timestamp">
                <span class="timestamp-icon">📅</span>
                <span class="timestamp-label">Created:</span>
                <span class="timestamp-value">${formatDate(createdDate)}</span>
            </div>
        `;
    }
    if (recipe.updatedAt) {
        const updatedDate = new Date(recipe.updatedAt);
        bodyHTML += `
            <div class="modal-timestamp">
                <span class="timestamp-icon">🔄</span>
                <span class="timestamp-label">Updated:</span>
                <span class="timestamp-value">${formatDate(updatedDate)}</span>
            </div>
        `;
    }
    bodyHTML += '</div>';

    // Tags
    if (recipe.tags && recipe.tags.length > 0) {
        bodyHTML += '<div class="modal-section">';
        bodyHTML += '<h3>Tags</h3>';
        bodyHTML += '<div class="recipe-card-tags">';
        recipe.tags.forEach(tagName => {
            const tag = state.tags.find(t => t.name === tagName);
            const style = tag ? `style="background-color: ${tag.color}30; color: ${tag.color}; cursor: pointer;"` : 'style="cursor: pointer;"';
            bodyHTML += `<span class="recipe-card-tag clickable-tag" ${style} data-tag-name="${tagName}">${tagName}</span>`;
        });
        bodyHTML += '</div></div>';
    }

    // Ingredients
    if (recipe.ingredients && recipe.ingredients.length > 0) {
        bodyHTML += '<div class="modal-section">';
        bodyHTML += '<h3>Ingredients</h3>';
        bodyHTML += '<ul class="modal-list">';
        recipe.ingredients.forEach(ingredient => {
            bodyHTML += `<li>${ingredient}</li>`;
        });
        bodyHTML += '</ul></div>';
    }

    // Instructions
    if (recipe.instructions && recipe.instructions.length > 0) {
        bodyHTML += '<div class="modal-section">';
        bodyHTML += '<h3>Instructions</h3>';
        bodyHTML += '<ul class="modal-list">';
        recipe.instructions.forEach((instruction, index) => {
            bodyHTML += `<li><strong>Step ${index + 1}:</strong> ${instruction}</li>`;
        });
        bodyHTML += '</ul></div>';
    }

    // Notes
    if (recipe.notes) {
        bodyHTML += '<div class="modal-section">';
        bodyHTML += '<h3>Notes</h3>';
        bodyHTML += `<p>${recipe.notes}</p>`;
        bodyHTML += '</div>';
    }

    modalBody.innerHTML = bodyHTML;

    // Add click handlers to tags in modal
    modalBody.querySelectorAll('.clickable-tag').forEach(tagEl => {
        tagEl.addEventListener('click', () => {
            const tagName = tagEl.dataset.tagName;

            // Close modal
            closeModal();

            // Navigate to home page
            navigateTo('home');

            // Clear any existing filters
            state.selectedTags.clear();

            // Toggle the tag filter
            toggleTagFilter(tagName);

            showToast(`Filtering by ${tagName}`, 'success');
        });
    });

    // Update favorites button in modal
    const favoriteBtn = document.getElementById('modalFavoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.innerHTML = recipe.isFavorite ? '⭐ Remove from Favorites' : '☆ Add to Favorites';
        favoriteBtn.className = recipe.isFavorite ? 'btn btn-secondary' : 'btn btn-primary';
        favoriteBtn.onclick = () => {
            toggleFavorite(recipe.id);
            // Update the button immediately
            favoriteBtn.innerHTML = recipe.isFavorite ? '☆ Add to Favorites' : '⭐ Remove from Favorites';
            favoriteBtn.className = recipe.isFavorite ? 'btn btn-primary' : 'btn btn-secondary';
        };
    }

    // Save current scroll position
    state.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    // Properly lock body scroll for all devices
    document.body.style.position = 'fixed';
    document.body.style.top = `-${state.scrollPosition}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    modal.classList.add('visible');
    document.body.classList.add('modal-open'); // Prevent body scroll on mobile
}

function closeModal() {
    const modal = document.getElementById('recipeModal');
    if (modal) {
        closeModalWithAnimation(modal, () => {
            state.currentRecipe = null;
        });
    } else {
        console.warn('closeModal: recipeModal element not found');
    }
}

function handleEditRecipe() {
    if (state.currentRecipe) {
        const recipeId = state.currentRecipe.id;
        closeModal();
        openRecipeEditorModal(recipeId);
    }
}

function handleDeleteRecipe() {
    if (!state.currentRecipe) return;

    const recipeName = state.currentRecipe.name || 'this recipe';
    const confirmMessage = `Are you sure you want to delete "${recipeName}"?\n\nThis action cannot be undone.`;

    if (confirm(confirmMessage)) {
        // Haptic feedback for delete
        if ('vibrate' in navigator) {
            navigator.vibrate([50, 100, 50]);
        }

        const index = state.recipes.findIndex(r => r.id === state.currentRecipe.id);
        if (index !== -1) {
            state.recipes.splice(index, 1);
            saveRecipesToStorage();
            closeModal();
            renderRecipes();
            showToast(`"${recipeName}" deleted successfully`, 'success');
        } else {
            showToast('Error: Recipe not found', 'error');
        }
    }
}

// ===== Recipe Form =====
function resetRecipeForm() {
    document.getElementById('recipeFormTitle').textContent = 'Add New Recipe';
    document.getElementById('recipeId').value = '';
    document.getElementById('recipeName').value = '';
    document.getElementById('prepTime').value = '';
    document.getElementById('cookTime').value = '';
    document.getElementById('servings').value = '';
    document.getElementById('selectedTags').innerHTML = '';

    // Clear rich text editors
    setEditorContent('ingredients', []);
    setEditorContent('instructions', []);
    setEditorContent('notes', '');

    state.currentRecipe = null;
    state.currentImageData = null;
    removeRecipeImage();
}

function loadRecipeForEdit(recipe) {
    document.getElementById('recipeFormTitle').textContent = 'Edit Recipe';
    document.getElementById('recipeId').value = recipe.id;
    document.getElementById('recipeName').value = recipe.name;
    document.getElementById('prepTime').value = recipe.prepTime || '';
    document.getElementById('cookTime').value = recipe.cookTime || '';
    document.getElementById('servings').value = recipe.servings || '';

    // Set rich text editor content
    setEditorContent('ingredients', recipe.ingredients || []);
    setEditorContent('instructions', recipe.instructions || []);
    setEditorContent('notes', recipe.notes || '');

    // Set tags
    const selectedTagsContainer = document.getElementById('selectedTags');
    selectedTagsContainer.innerHTML = '';
    if (recipe.tags) {
        recipe.tags.forEach(tagName => {
            addSelectedTag(tagName);
        });
    }

    // Set image
    if (recipe.image) {
        state.currentImageData = recipe.image;
        displayImagePreview(recipe.image);
    } else {
        removeRecipeImage();
    }

    state.currentRecipe = recipe;
}

function handleRecipeSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('recipeId').value || generateId();
    const name = document.getElementById('recipeName').value.trim();
    const prepTime = document.getElementById('prepTime').value.trim();
    const cookTime = document.getElementById('cookTime').value.trim();
    const servingsInput = document.getElementById('servings').value;
    const servings = servingsInput ? parseInt(servingsInput) : null;

    // Get content from rich text editors
    const ingredients = getEditorContent('ingredients');
    const instructions = getEditorContent('instructions');
    const notesEditor = document.getElementById('notes');
    const notes = notesEditor.innerHTML.trim() === '' || notesEditor.innerHTML.trim() === '<br>'
        ? ''
        : notesEditor.innerHTML;

    const tags = Array.from(document.getElementById('selectedTags').children)
        .map(el => el.textContent.replace('×', '').trim())
        .filter(tag => tag.length > 0); // Filter out empty tags

    // Validate required fields
    if (!name || name.length === 0) {
        console.error('Validation failed: Recipe name is required');
        showToast('Recipe name is required', 'error');
        document.getElementById('recipeName').focus();
        return;
    }

    if (name.length > 200) {
        console.error('Validation failed: Recipe name too long');
        showToast('Recipe name is too long (max 200 characters)', 'error');
        document.getElementById('recipeName').focus();
        return;
    }

    if (ingredients.length === 0) {
        console.error('Validation failed: No ingredients');
        showToast('At least one ingredient is required', 'error');
        document.getElementById('ingredients').focus();
        return;
    }

    if (instructions.length === 0) {
        console.error('Validation failed: No instructions');
        showToast('At least one instruction is required', 'error');
        document.getElementById('instructions').focus();
        return;
    }

    // Validate servings if provided
    if (servings !== null && (servings < 1 || servings > 1000 || isNaN(servings))) {
        console.error('Validation failed: Invalid servings value');
        showToast('Servings must be a number between 1 and 1000', 'error');
        document.getElementById('servings').focus();
        return;
    }

    const recipe = {
        id,
        name,
        ingredients,
        instructions,
        tags,
        prepTime,
        cookTime,
        servings,
        notes,
        image: state.currentImageData || null,
        isFavorite: state.currentRecipe?.isFavorite || false,
        createdAt: state.currentRecipe?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const existingIndex = state.recipes.findIndex(r => r.id === id);
    if (existingIndex !== -1) {
        state.recipes[existingIndex] = recipe;
        showToast('Recipe updated successfully', 'success');
    } else {
        state.recipes.unshift(recipe);

        // Haptic feedback for successful add
        if ('vibrate' in navigator) {
            navigator.vibrate(100);
        }

        showToast('Recipe added successfully', 'success');
    }

    saveRecipesToStorage();
    closeRecipeEditorModal();

    // Update the view
    renderRecipes();
}

// ===== Tag Management in Form =====
function handleTagsInput(e) {
    const value = e.target.value.trim();

    if (value) {
        showTagsSuggestions();
    } else {
        hideTagsSuggestions();
    }
}

function showTagsSuggestions() {
    const input = document.getElementById('recipeTagsInput');
    const value = input.value.toLowerCase().trim();
    const container = document.getElementById('tagsSuggestions');

    const selectedTags = Array.from(document.getElementById('selectedTags').children)
        .map(el => el.textContent.replace('×', '').trim());

    const suggestions = state.tags
        .filter(tag => !selectedTags.includes(tag.name))
        .filter(tag => !value || tag.name.toLowerCase().includes(value));

    if (suggestions.length > 0) {
        container.innerHTML = '';
        suggestions.forEach(tag => {
            const suggestion = document.createElement('div');
            suggestion.className = 'tag-suggestion';
            suggestion.textContent = tag.name;
            suggestion.style.backgroundColor = tag.color + '30';
            suggestion.style.borderColor = tag.color;
            suggestion.style.color = tag.color;
            suggestion.addEventListener('mousedown', () => {
                addSelectedTag(tag.name);
                input.value = '';
                hideTagsSuggestions();
            });
            container.appendChild(suggestion);
        });
        container.classList.add('visible');
    } else {
        hideTagsSuggestions();
    }
}

function hideTagsSuggestions() {
    document.getElementById('tagsSuggestions').classList.remove('visible');
}

function addSelectedTag(tagName) {
    const container = document.getElementById('selectedTags');

    // Check if already added
    const existing = Array.from(container.children).find(
        el => el.textContent.replace('×', '').trim() === tagName
    );
    if (existing) {
        return;
    }

    const tag = state.tags.find(t => t.name === tagName);
    const tagEl = document.createElement('div');
    tagEl.className = 'selected-tag';
    tagEl.style.backgroundColor = tag?.color || '#8B5CF6';
    tagEl.innerHTML = `
        ${tagName}
        <button type="button" class="selected-tag-remove">×</button>
    `;

    tagEl.querySelector('.selected-tag-remove').addEventListener('click', () => {
        tagEl.remove();
    });

    container.appendChild(tagEl);
}

// ===== Tags Page =====
function renderTagsPage() {
    const container = document.getElementById('tagsList');
    const emptyState = document.getElementById('tagsEmptyState');
    container.innerHTML = '';

    if (state.tags.length === 0) {
        // Show empty state
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        if (container) {
            container.style.display = 'none';
        }
        return;
    }

    // Hide empty state and show tags list
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    if (container) {
        container.style.display = 'block';
    }

    state.tags.forEach(tag => {
        const count = state.recipes.filter(r => r.tags.includes(tag.name)).length;

        const tagItem = document.createElement('div');
        tagItem.className = 'tag-item';
        tagItem.innerHTML = `
            <div class="tag-item-info">
                <div class="tag-color-dot" style="background-color: ${tag.color};"></div>
                <div class="tag-item-name">${tag.name}</div>
            </div>
            <div class="tag-item-actions">
                <label class="tag-visibility-toggle">
                    <input type="checkbox" ${tag.defaultVisible ? 'checked' : ''}>
                    <span>Show in quick tags</span>
                </label>
                <div class="tag-item-count">${count} recipe${count !== 1 ? 's' : ''}</div>
                <button class="tag-item-delete">×</button>
            </div>
        `;

        tagItem.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
            toggleTagVisibility(tag.name, e.target.checked);
        });

        tagItem.querySelector('.tag-item-delete').addEventListener('click', () => {
            deleteTag(tag.name);
        });

        container.appendChild(tagItem);
    });
}

function handleAddTag() {
    const nameInput = document.getElementById('newTagInput');
    const colorInput = document.getElementById('newTagColor');

    const name = nameInput.value.trim();
    const color = colorInput.value;

    if (!name) {
        showToast('Please enter a tag name', 'error');
        return;
    }

    if (state.tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        showToast('Tag already exists', 'error');
        return;
    }

    state.tags.push({ id: generateId(), name, color, defaultVisible: true });
    saveTagsToStorage();
    renderTagsPage();
    renderQuickTags();

    nameInput.value = '';
    colorInput.value = '#8B5CF6';

    showToast('Tag added successfully', 'success');
}

function toggleTagVisibility(tagName, visible) {
    const tag = state.tags.find(t => t.name === tagName);
    if (tag) {
        tag.defaultVisible = visible;
        saveTagsToStorage();
        renderQuickTags();
        showToast(`Tag "${tagName}" ${visible ? 'shown' : 'hidden'} in quick tags`, 'success');
    }
}

function deleteTag(tagName) {
    const recipesWithTag = state.recipes.filter(r => r.tags && r.tags.includes(tagName));
    const count = recipesWithTag.length;

    let confirmMessage = `Delete tag "${tagName}"?`;
    if (count > 0) {
        confirmMessage += `\n\nThis tag is used in ${count} recipe${count !== 1 ? 's' : ''} and will be removed from ${count === 1 ? 'it' : 'them'}.`;
    }
    confirmMessage += '\n\nThis action cannot be undone.';

    if (confirm(confirmMessage)) {
        state.tags = state.tags.filter(t => t.name !== tagName);

        // Remove tag from all recipes
        state.recipes.forEach(recipe => {
            if (recipe.tags && Array.isArray(recipe.tags)) {
                recipe.tags = recipe.tags.filter(t => t !== tagName);
            }
        });

        // Remove from selected tags if it was selected
        if (state.selectedTags.has(tagName)) {
            state.selectedTags.delete(tagName);
        }

        saveTagsToStorage();
        saveRecipesToStorage();
        renderTagsPage();
        renderQuickTags();
        renderRecipes();

        showToast(`Tag "${tagName}" deleted successfully`, 'success');
    }
}

// ===== Settings Page =====
function renderSettingsPage() {
    const container = document.getElementById('settingsContent');
    if (!container) return;

    container.innerHTML = `
        <div class="settings-section">
            <h3>Display Preferences</h3>
            <div class="setting-item">
                <label>
                    <span class="setting-label">Default View</span>
                    <select id="defaultViewSelect" class="setting-select">
                        <option value="all" ${state.settings.defaultView === 'all' ? 'selected' : ''}>All Recipes</option>
                        <option value="favorites" ${state.settings.defaultView === 'favorites' ? 'selected' : ''}>Favorites Only</option>
                    </select>
                </label>
                <p class="setting-description">Choose which recipes to show when you open the app</p>
            </div>

            <div class="setting-item">
                <label>
                    <span class="setting-label">Sort Order</span>
                    <select id="sortOrderSelect" class="setting-select">
                        <option value="newest" ${state.settings.sortOrder === 'newest' ? 'selected' : ''}>Newest First</option>
                        <option value="oldest" ${state.settings.sortOrder === 'oldest' ? 'selected' : ''}>Oldest First</option>
                        <option value="alphabetical" ${state.settings.sortOrder === 'alphabetical' ? 'selected' : ''}>Alphabetical</option>
                    </select>
                </label>
                <p class="setting-description">Choose how to sort your recipes</p>
            </div>

            <div class="setting-item">
                <label class="setting-checkbox">
                    <input type="checkbox" id="showImagesCheck" ${state.settings.showImages ? 'checked' : ''}>
                    <span class="setting-label">Show Recipe Images</span>
                </label>
                <p class="setting-description">Display images on recipe cards</p>
            </div>

            <div class="setting-item">
                <label class="setting-checkbox">
                    <input type="checkbox" id="compactViewCheck" ${state.settings.compactView ? 'checked' : ''}>
                    <span class="setting-label">Compact View</span>
                </label>
                <p class="setting-description">Use a more compact layout for recipe cards</p>
            </div>
        </div>

        <div class="settings-section">
            <h3>Theme</h3>
            <p class="setting-description">Choose your preferred color theme</p>
            <div class="theme-grid-settings" id="themeGridSettings">
                <button class="theme-card-small" data-theme="claude">
                    <div class="theme-preview-small theme-preview-claude"></div>
                    <span>Claude</span>
                </button>
                <button class="theme-card-small" data-theme="dark">
                    <div class="theme-preview-small theme-preview-dark"></div>
                    <span>Dark</span>
                </button>
                <button class="theme-card-small" data-theme="light">
                    <div class="theme-preview-small theme-preview-light"></div>
                    <span>Light</span>
                </button>
                <button class="theme-card-small" data-theme="forest">
                    <div class="theme-preview-small theme-preview-forest"></div>
                    <span>Forest</span>
                </button>
                <button class="theme-card-small" data-theme="ocean">
                    <div class="theme-preview-small theme-preview-ocean"></div>
                    <span>Ocean</span>
                </button>
                <button class="theme-card-small" data-theme="sunset">
                    <div class="theme-preview-small theme-preview-sunset"></div>
                    <span>Sunset</span>
                </button>
            </div>
        </div>

        <div class="settings-section">
            <h3>Server Sync</h3>
            <div class="setting-item">
                <div class="sync-status-info">
                    <p class="setting-description">
                        <strong>Status:</strong> <span id="syncStatusText">${state.sync.status === 'synced' ? 'All data synced' : state.sync.status === 'offline' ? 'Offline mode' : state.sync.status === 'syncing' ? 'Syncing...' : 'Sync error'}</span>
                    </p>
                    ${state.sync.lastSync ? `<p class="setting-description"><strong>Last sync:</strong> ${new Date(state.sync.lastSync).toLocaleString()}</p>` : ''}
                </div>
            </div>
            <div class="setting-item">
                <button class="btn btn-primary" id="manualSyncBtn" ${!state.sync.isOnline || state.sync.status === 'syncing' ? 'disabled' : ''}>
                    🔄 Sync Now
                </button>
                <p class="setting-description">Manually sync all data with the server</p>
            </div>
        </div>

        <div class="settings-section">
            <h3>Data Management</h3>
            <div class="setting-item">
                <button class="btn btn-primary" onclick="exportAllRecipes()">
                    📤 Export All Recipes
                </button>
                <p class="setting-description">Download a backup of all your recipes</p>
            </div>

            <div class="setting-item">
                <button class="btn btn-danger" id="clearAllDataBtn">
                    🗑️ Clear All Data
                </button>
                <p class="setting-description">Delete all recipes, tags, and settings (cannot be undone)</p>
            </div>
        </div>

        <div class="settings-section">
            <h3>Statistics</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${state.recipes.length}</div>
                    <div class="stat-label">Total Recipes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${state.recipes.filter(r => r.isFavorite).length}</div>
                    <div class="stat-label">Favorites</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${state.tags.length}</div>
                    <div class="stat-label">Tags</div>
                </div>
            </div>
        </div>
    `;

    // Setup event listeners
    const defaultViewSelect = document.getElementById('defaultViewSelect');
    const sortOrderSelect = document.getElementById('sortOrderSelect');
    const showImagesCheck = document.getElementById('showImagesCheck');
    const compactViewCheck = document.getElementById('compactViewCheck');
    const clearAllDataBtn = document.getElementById('clearAllDataBtn');

    defaultViewSelect.addEventListener('change', (e) => {
        state.settings.defaultView = e.target.value;
        state.showFavoritesOnly = e.target.value === 'favorites';
        saveSettingsToStorage();
        showToast('Default view updated', 'success');
    });

    sortOrderSelect.addEventListener('change', (e) => {
        state.settings.sortOrder = e.target.value;
        saveSettingsToStorage();
        renderRecipes();
        showToast('Sort order updated', 'success');
    });

    showImagesCheck.addEventListener('change', (e) => {
        state.settings.showImages = e.target.checked;
        saveSettingsToStorage();
        renderRecipes();
        showToast('Image display updated', 'success');
    });

    compactViewCheck.addEventListener('change', (e) => {
        state.settings.compactView = e.target.checked;
        document.body.classList.toggle('compact-view', e.target.checked);
        saveSettingsToStorage();
        renderRecipes();
        showToast('View mode updated', 'success');
    });

    clearAllDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete ALL data? This includes all recipes, tags, and settings. This action cannot be undone.')) {
            if (confirm('This is your last chance. Are you ABSOLUTELY sure you want to delete everything?')) {
                localStorage.clear();
                location.reload();
            }
        }
    });

    // Setup manual sync button
    const manualSyncBtn = document.getElementById('manualSyncBtn');
    if (manualSyncBtn) {
        manualSyncBtn.addEventListener('click', async () => {
            manualSyncBtn.disabled = true;
            manualSyncBtn.textContent = '⟳ Syncing...';

            const success = await syncAllData();

            manualSyncBtn.disabled = false;
            manualSyncBtn.textContent = '🔄 Sync Now';

            // Update sync status text in settings
            const syncStatusText = document.getElementById('syncStatusText');
            if (syncStatusText) {
                syncStatusText.textContent = success ? 'All data synced' : 'Sync error';
            }

            // Re-render settings page to show updated sync time
            if (success) {
                renderSettingsPage();
            }
        });
    }

    // Setup theme switchers
    document.querySelectorAll('.theme-card-small').forEach(card => {
        card.addEventListener('click', (e) => {
            const theme = e.currentTarget.dataset.theme;
            setTheme(theme);
            updateActiveThemeCardSettings();
        });
    });

    updateActiveThemeCardSettings();
}

function updateActiveThemeCardSettings() {
    const currentTheme = document.body.getAttribute('data-theme');
    document.querySelectorAll('.theme-card-small').forEach(card => {
        card.classList.toggle('active', card.dataset.theme === currentTheme);
    });
}

// ===== Help Page =====
function renderHelpPage() {
    const container = document.getElementById('helpContent');
    if (!container) return;

    container.innerHTML = `
        <div class="help-section">
            <h3>⌨️ Keyboard Shortcuts</h3>
            <div class="shortcuts-grid">
                <div class="shortcut-item">
                    <kbd>Ctrl/Cmd</kbd> + <kbd>F</kbd>
                    <span>Focus search</span>
                </div>
                <div class="shortcut-item">
                    <kbd>Ctrl/Cmd</kbd> + <kbd>N</kbd>
                    <span>Add new recipe</span>
                </div>
                <div class="shortcut-item">
                    <kbd>Esc</kbd>
                    <span>Close modal/panel</span>
                </div>
                <div class="shortcut-item">
                    <kbd>?</kbd>
                    <span>Show this help</span>
                </div>
            </div>
        </div>

        <div class="help-section">
            <h3>💡 Quick Tips</h3>
            <ul class="tips-list">
                <li><strong>Search:</strong> Type in the search bar to find recipes by name, ingredients, or tags</li>
                <li><strong>Tags:</strong> Click on tags to filter recipes, or create custom tags in the Tags page</li>
                <li><strong>Favorites:</strong> Click the star icon to mark recipes as favorites</li>
                <li><strong>Shopping List:</strong> Add ingredients from recipes to your shopping list for easy meal planning</li>
                <li><strong>Rich Text:</strong> Use the formatting toolbar when editing recipes to add colors and styles</li>
                <li><strong>Import/Export:</strong> Back up your recipes by exporting them as JSON files</li>
                <li><strong>Themes:</strong> Customize the app's appearance with different color themes</li>
                <li><strong>Mobile:</strong> On touch devices, long-press recipe cards for quick actions</li>
            </ul>
        </div>

        <div class="help-section">
            <h3>🎯 Getting Started</h3>
            <ol class="getting-started-list">
                <li>Click the <strong>+ button</strong> to add your first recipe</li>
                <li>Or use the <strong>"Try Sample Recipes"</strong> button to load examples</li>
                <li>Organize recipes with <strong>tags</strong> for easy filtering</li>
                <li>Build a <strong>shopping list</strong> from your favorite recipes</li>
                <li>Export your collection to <strong>back up</strong> your recipes</li>
            </ol>
        </div>

        <div class="help-section">
            <h3>📝 Recipe Format</h3>
            <p>When importing recipes, use this JSON structure:</p>
            <pre class="help-code">{
  "name": "Recipe Name",
  "ingredients": ["2 cups flour", "1 cup sugar"],
  "instructions": ["Step 1", "Step 2"],
  "tags": ["Dessert", "Quick"],
  "prepTime": "15 min",
  "cookTime": "30 min",
  "servings": 4,
  "notes": "Optional notes"
}</pre>
        </div>

        <div class="help-section">
            <h3>🔧 Maintenance & Data Management</h3>
            <ul class="tips-list">
                <li><strong>Regular Backups:</strong> Export your recipes regularly using the Data tab to prevent data loss. Both JSON and Document formats are available for different purposes.</li>
                <li><strong>Browser Storage:</strong> Your recipes are stored in your browser's localStorage. Clearing browser data will delete your recipes, so always keep backups.</li>
                <li><strong>Storage Limits:</strong> Most browsers allow 5-10MB of localStorage. If you have many recipes with images, consider exporting periodically.</li>
                <li><strong>Syncing Across Devices:</strong> Export recipes from one device and import them on another to sync your collection manually.</li>
                <li><strong>Server Storage:</strong> If enabled, your recipes can sync to a server. Check your settings to enable automatic backups.</li>
                <li><strong>Images:</strong> Recipe images are stored as base64 data. Large images increase storage usage. Consider compressing images before uploading.</li>
                <li><strong>Clean Up:</strong> Regularly review and delete unused recipes or duplicate entries to optimize storage and performance.</li>
            </ul>
        </div>

        <div class="help-section">
            <h3>🛠️ Troubleshooting</h3>
            <ul class="tips-list">
                <li><strong>Recipes Not Saving:</strong> Check if your browser's localStorage is full or if you're in private/incognito mode. Export your data and clear old recipes.</li>
                <li><strong>Import Fails:</strong> Ensure your JSON file follows the correct format. Check for syntax errors like missing commas or brackets.</li>
                <li><strong>Images Not Displaying:</strong> Large images may fail to load. Try using smaller, compressed images (recommended: under 500KB per image).</li>
                <li><strong>Search Not Working:</strong> Try refreshing the page. If the issue persists, check if JavaScript is enabled in your browser.</li>
                <li><strong>Performance Issues:</strong> If the app is slow with many recipes, try exporting some to archive them and reduce the active collection size.</li>
                <li><strong>Theme Not Changing:</strong> Clear browser cache and reload. Theme preferences are saved in localStorage.</li>
                <li><strong>Mobile Menu Issues:</strong> Ensure your browser is up to date. Try closing and reopening the menu.</li>
            </ul>
        </div>

        <div class="help-section">
            <h3>📊 Data Export Options</h3>
            <ul class="tips-list">
                <li><strong>Export as Documents (ZIP):</strong> Creates readable text files perfect for printing, sharing, or reading offline. Each recipe is a separate .txt file.</li>
                <li><strong>Archive as JSON:</strong> Creates a machine-readable backup file that can be re-imported later. Use this for backups and transferring between devices.</li>
                <li><strong>When to Use Each:</strong> Use Documents for sharing recipes with others. Use JSON for backups and migration.</li>
                <li><strong>Best Practices:</strong> Export JSON backups monthly. Export Documents when you want to share specific recipes or create a cookbook.</li>
            </ul>
        </div>

        <div class="help-section">
            <h3>🎨 Customization Tips</h3>
            <ul class="tips-list">
                <li><strong>Themes:</strong> Choose from 6 color themes (Claude, Dark, Light, Forest, Ocean, Sunset) to personalize your experience.</li>
                <li><strong>View Modes:</strong> Switch between grid and list views to find the layout that works best for you.</li>
                <li><strong>Rich Text Formatting:</strong> Add colors and highlights to recipe instructions and notes for better readability.</li>
                <li><strong>Tags Organization:</strong> Create a consistent tagging system (e.g., meal type, cuisine, dietary restrictions) for easier filtering.</li>
                <li><strong>Favorites:</strong> Use the star rating system to mark your best recipes and filter by rating.</li>
            </ul>
        </div>
    `;
}

// ===== Import Functionality =====
function handleFilesDrop(files) {
    const importResults = document.getElementById('importResults');
    importResults.innerHTML = '<h3>Import Results:</h3>';
    importResults.classList.add('visible');

    let successCount = 0;
    let errorCount = 0;

    const fileArray = Array.from(files);
    const jsonFiles = fileArray.filter(file =>
        file.name.endsWith('.json') || file.name.endsWith('.txt')
    );
    const wordFiles = fileArray.filter(file =>
        file.name.endsWith('.docx') || file.name.endsWith('.doc')
    );

    if (jsonFiles.length === 0 && wordFiles.length === 0) {
        showToast('No valid files found. Please upload JSON, TXT, or Word documents.', 'error');
        return;
    }

    // Handle Word documents separately
    if (wordFiles.length > 0) {
        handleWordDocumentImport(wordFiles[0]); // Process first Word document
        return;
    }

    let processed = 0;

    jsonFiles.forEach(file => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const recipe = normalizeRecipe(data);

                if (validateRecipe(recipe)) {
                    recipe.id = generateId();
                    recipe.createdAt = new Date().toISOString();
                    recipe.updatedAt = new Date().toISOString();

                    state.recipes.unshift(recipe);
                    successCount++;

                    const resultItem = document.createElement('div');
                    resultItem.className = 'import-result-item success';
                    resultItem.textContent = `✓ ${file.name} - ${recipe.name}`;
                    importResults.appendChild(resultItem);
                } else {
                    throw new Error('Invalid recipe format');
                }
            } catch (error) {
                errorCount++;
                const resultItem = document.createElement('div');
                resultItem.className = 'import-result-item error';
                resultItem.textContent = `✗ ${file.name} - ${error.message}`;
                importResults.appendChild(resultItem);
            }

            processed++;
            if (processed === jsonFiles.length) {
                finishImport(successCount, errorCount);
            }
        };

        reader.onerror = () => {
            errorCount++;
            processed++;
            if (processed === jsonFiles.length) {
                finishImport(successCount, errorCount);
            }
        };

        reader.readAsText(file);
    });
}

function finishImport(successCount, errorCount) {
    if (successCount > 0) {
        saveRecipesToStorage();
        renderRecipes();

        // Extract new tags
        const allTags = new Set(state.tags.map(t => t.name));
        state.recipes.forEach(recipe => {
            recipe.tags.forEach(tag => {
                if (!allTags.has(tag)) {
                    state.tags.push({
                        id: generateId(),
                        name: tag,
                        color: generateRandomColor(),
                        defaultVisible: true
                    });
                    allTags.add(tag);
                }
            });
        });
        saveTagsToStorage();
    }

    showToast(
        `Import complete: ${successCount} succeeded, ${errorCount} failed`,
        successCount > 0 ? 'success' : 'error'
    );
}

function normalizeRecipe(data) {
    return {
        name: data.name || data.title || 'Untitled Recipe',
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
        instructions: Array.isArray(data.instructions || data.steps) ? (data.instructions || data.steps) : [],
        tags: Array.isArray(data.tags || data.categories) ? (data.tags || data.categories) : [],
        prepTime: data.prepTime || data.prep_time || '',
        cookTime: data.cookTime || data.cook_time || '',
        servings: data.servings || null,
        notes: data.notes || data.description || '',
        image: data.image || null,
        isFavorite: data.isFavorite || false
    };
}

function validateRecipe(recipe) {
    return recipe.name &&
           recipe.ingredients &&
           recipe.ingredients.length > 0 &&
           recipe.instructions &&
           recipe.instructions.length > 0;
}

// ===== Utility Functions =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateRandomColor() {
    const colors = [
        '#F59E0B', '#10B981', '#3B82F6', '#EC4899',
        '#8B5CF6', '#EF4444', '#14B8A6', '#F97316'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Toast notification queue and management
let toastTimeout = null;
let toastQueue = [];

// ===== Loading State Management =====
function showLoadingState(message = 'Loading...') {
    let loadingOverlay = document.getElementById('loadingOverlay');

    if (!loadingOverlay) {
        // Create loading overlay if it doesn't exist
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        `;
        document.body.appendChild(loadingOverlay);
    } else {
        const messageEl = loadingOverlay.querySelector('.loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }

    // Reset display and trigger reflow for animation
    loadingOverlay.style.display = 'flex';
    void loadingOverlay.offsetWidth; // Force reflow
    loadingOverlay.classList.add('visible');
}

function hideLoadingState() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('visible');
        // Wait for fade out animation to complete before hiding
        setTimeout(() => {
            if (!loadingOverlay.classList.contains('visible')) {
                loadingOverlay.style.display = 'none';
            }
        }, 300);
    }
}

// ===== Tooltip System for First-Time Users =====
let activeTooltip = null;
let tooltipQueue = [];
let tooltipTimeout = null;

function showTooltip(element, message, duration = 5000) {
    // Don't show if user has dismissed tooltips
    if (isLocalStorageAvailable() && localStorage.getItem('tooltipsDisabled')) {
        return;
    }

    // If there's already an active tooltip, add to queue
    if (activeTooltip) {
        tooltipQueue.push({ element, message, duration });
        return;
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = message;
    document.body.appendChild(tooltip);
    activeTooltip = tooltip;

    // Position tooltip
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        // Calculate position with viewport overflow prevention
        let left = rect.left + rect.width / 2;
        let top = rect.top - 10;

        // Prevent overflow on right edge
        if (left + tooltipRect.width / 2 > window.innerWidth - 16) {
            left = window.innerWidth - tooltipRect.width / 2 - 16;
        }

        // Prevent overflow on left edge
        if (left - tooltipRect.width / 2 < 16) {
            left = tooltipRect.width / 2 + 16;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.transform = 'translate(-50%, -100%)';
    }
    // Mobile positioning is handled by CSS

    // Show tooltip
    setTimeout(() => {
        tooltip.classList.add('visible');
    }, 100);

    // Hide and remove tooltip
    tooltipTimeout = setTimeout(() => {
        hideTooltip();
    }, duration);

    // Allow manual dismissal by tapping (especially for mobile)
    tooltip.style.pointerEvents = 'auto';
    tooltip.style.cursor = 'pointer';
    tooltip.addEventListener('click', hideTooltip);
}

function hideTooltip() {
    if (!activeTooltip) return;

    // Clear timeout
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }

    activeTooltip.classList.remove('visible');
    setTimeout(() => {
        if (activeTooltip) {
            activeTooltip.remove();
            activeTooltip = null;
        }

        // Show next tooltip in queue
        if (tooltipQueue.length > 0) {
            const next = tooltipQueue.shift();
            setTimeout(() => {
                showTooltip(next.element, next.message, next.duration);
            }, 500); // Small delay between tooltips
        }
    }, 300);
}

function initializeTooltips() {
    // Check if tooltips have been shown before
    if (isLocalStorageAvailable() && localStorage.getItem('tooltipsShown')) {
        return;
    }

    // Show tooltips for key features after a delay
    setTimeout(() => {
        const fabBtn = document.getElementById('fabBtn');
        if (fabBtn && state.recipes.length <= 3) {
            showTooltip(fabBtn, 'Click here to add a new recipe!', 4000);
        }
    }, 3000);

    setTimeout(() => {
        const helpBtn = document.querySelector('.nav-btn[data-page="help"]');
        if (helpBtn) {
            showTooltip(helpBtn, 'Press ? for keyboard shortcuts', 3000);
        }
    }, 8000);

    // Mark tooltips as shown
    if (isLocalStorageAvailable()) {
        try {
            localStorage.setItem('tooltipsShown', 'true');
        } catch (e) {
            console.warn('Unable to save tooltips state:', e);
        }
    }
}

// ===== Toast Notifications =====
function dismissToast() {
    const toast = document.getElementById('toast');
    if (!toast) return;

    // Clear any existing timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }

    // Add dismissing animation class
    toast.classList.add('toast-dismissing');

    // Remove visible class after a brief delay to trigger animation
    setTimeout(() => {
        toast.classList.remove('visible');
        toast.classList.remove('toast-dismissing');

        // Show next toast in queue if any
        setTimeout(() => {
            if (toastQueue.length > 0) {
                const next = toastQueue.shift();
                showToast(next.message, next.type, next.duration);
            }
        }, 300); // Wait for fade out animation
    }, 50);
}

function showToast(message, type = 'success', duration = 3000) {
    if (!message || typeof message !== 'string') {
        console.warn('Invalid toast message:', message);
        return;
    }

    const toast = document.getElementById('toast');
    if (!toast) {
        console.error('Toast element not found');
        return;
    }

    // Clear existing timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    // Clear toast content and rebuild structure
    toast.innerHTML = '';
    toast.className = `toast ${type} visible`;

    // Create message span
    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close';
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.innerHTML = '×';

    // Add click handler for close button
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissToast();
    });

    // Append elements to toast
    toast.appendChild(messageSpan);
    toast.appendChild(closeButton);

    // Auto-dismiss after duration
    toastTimeout = setTimeout(() => {
        dismissToast();
    }, duration);
}

function queueToast(message, type = 'success', duration = 3000) {
    const toast = document.getElementById('toast');
    if (toast && toast.classList.contains('visible')) {
        toastQueue.push({ message, type, duration });
    } else {
        showToast(message, type, duration);
    }
}

function formatDate(date) {
    const diff = Date.now() - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ===== Export Functions (for backup) =====
function archiveRecipesAsJSON() {
    const dataStr = JSON.stringify(state.recipes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recipes-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Recipes exported successfully', 'success');
}

// Backward compatibility
const exportAllRecipes = archiveRecipesAsJSON;

// Export recipes as formatted text documents in a ZIP file
async function exportRecipesAsDocuments() {
    // Check if there are recipes to export
    if (!state.recipes || state.recipes.length === 0) {
        showToast('No recipes to export', 'error');
        return;
    }

    try {
        showLoadingState('Preparing recipe documents...');

        // Dynamically load JSZip if not already loaded
        if (typeof JSZip === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        }

        const zip = new JSZip();
        const recipesFolder = zip.folder('recipes');

        // Helper function to strip HTML tags
        function stripHtml(html) {
            if (!html) return '';
            const div = document.createElement('div');
            div.innerHTML = html;
            return div.textContent || div.innerText || '';
        }

        // Helper function to format recipe name for filename
        function formatFilename(index, name) {
            const paddedIndex = String(index).padStart(3, '0');
            const safeName = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            return `${paddedIndex}-${safeName}.txt`;
        }

        // Helper function to format date
        function formatDate(timestamp) {
            if (!timestamp) return 'N/A';
            const date = new Date(timestamp);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Generate text documents for each recipe
        state.recipes.forEach((recipe, index) => {
            const recipeNum = index + 1;
            const recipeName = recipe.name || 'Untitled Recipe';
            const recipeNameUpper = recipeName.toUpperCase();

            // Format ingredients
            let ingredientsText = '';
            if (recipe.ingredients && recipe.ingredients.length > 0) {
                ingredientsText = recipe.ingredients
                    .map((ing, idx) => `  ${idx + 1}. ${stripHtml(ing)}`)
                    .join('\n');
            } else {
                ingredientsText = '  None listed';
            }

            // Format instructions
            let instructionsText = '';
            if (recipe.instructions && recipe.instructions.length > 0) {
                instructionsText = recipe.instructions
                    .map((inst, idx) => {
                        const cleanInst = stripHtml(inst);
                        return `  Step ${idx + 1}: ${cleanInst}`;
                    })
                    .join('\n\n');
            } else {
                instructionsText = '  None listed';
            }

            // Format tags
            const tagsText = recipe.tags && recipe.tags.length > 0
                ? recipe.tags.join(', ')
                : 'None';

            // Format notes
            const notesText = recipe.notes
                ? stripHtml(recipe.notes)
                : 'No notes';

            // Create the formatted text content
            const content = `═══════════════════════════════════════
   ${recipeNameUpper}
═══════════════════════════════════════

DETAILS:
───────────────────────────────────────
⏱️  Prep Time: ${recipe.prepTime || 'N/A'} min
🔥 Cook Time: ${recipe.cookTime || 'N/A'} min
🍽️  Servings: ${recipe.servings || 'N/A'}

TAGS: ${tagsText}

INGREDIENTS:
───────────────────────────────────────
${ingredientsText}

INSTRUCTIONS:
───────────────────────────────────────
${instructionsText}

NOTES:
───────────────────────────────────────
${notesText}

───────────────────────────────────────
Created: ${formatDate(recipe.createdAt)}
Updated: ${formatDate(recipe.updatedAt)}
`;

            // Add file to the recipes folder
            const filename = formatFilename(recipeNum, recipeName);
            recipesFolder.file(filename, content);
        });

        // Create README file
        const readmeContent = `═══════════════════════════════════════
   RECIPE COLLECTION
═══════════════════════════════════════

Total Recipes: ${state.recipes.length}
Export Date: ${formatDate(Date.now())}

This archive contains your recipe collection
exported from Recipe Hunter.

Each recipe is saved as a separate text file
in the 'recipes' folder, numbered and named
for easy reference.

To import these recipes back into Recipe Hunter,
use the JSON backup feature instead.

═══════════════════════════════════════
`;

        zip.file('_READ_ME.txt', readmeContent);

        // Generate ZIP file
        const content = await zip.generateAsync({ type: 'blob' });

        // Download the ZIP file
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recipe-collection-${Date.now()}.zip`;
        link.click();
        URL.revokeObjectURL(url);

        hideLoadingState();
        showToast('Recipe documents exported successfully!', 'success');

    } catch (error) {
        console.error('Error exporting recipes as documents:', error);
        hideLoadingState();
        showToast('Failed to export recipe documents', 'error');
    }
}

// Helper function to dynamically load external scripts
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ===== Recipe Editor Modal Management =====
function openRecipeEditorModal(recipeId = null) {
    const modal = document.getElementById('recipeEditorModal');
    const title = document.getElementById('recipeFormTitle');

    if (!modal) {
        console.error('Recipe editor modal element not found!');
        return;
    }

    if (recipeId) {
        const recipe = state.recipes.find(r => r.id === recipeId);
        if (recipe) {
            title.textContent = 'Edit Recipe';
            loadRecipeForEdit(recipe);
        } else {
            console.error('Recipe not found with ID:', recipeId);
        }
    } else {
        title.textContent = 'Add New Recipe';
        resetRecipeForm();
    }

    // Save current scroll position
    state.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    // Properly lock body scroll for all devices
    document.body.style.position = 'fixed';
    document.body.style.top = `-${state.scrollPosition}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    modal.classList.add('visible');
    document.body.classList.add('modal-open');
    setupRichTextEditors();
}

function closeRecipeEditorModal() {
    const modal = document.getElementById('recipeEditorModal');
    if (!modal) {
        console.error('Recipe editor modal element not found!');
        return;
    }
    closeModalWithAnimation(modal, () => {
        resetRecipeForm();
    });
}

// ===== Rich Text Editor Setup =====
function setupRichTextEditors() {
    // Setup toolbar buttons
    const toolbars = document.querySelectorAll('.rich-text-toolbar');

    toolbars.forEach((toolbar, index) => {
        const buttons = toolbar.querySelectorAll('.toolbar-btn');
        const colorPicker = toolbar.querySelector('.color-picker');
        const targetId = toolbar.dataset.target;

        buttons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const command = btn.dataset.command;

                if (command === 'foreColor') {
                    colorPicker.click();
                } else {
                    document.execCommand(command, false, null);
                    document.getElementById(targetId).focus();
                }
            };
        });

        if (colorPicker) {
            colorPicker.onchange = () => {
                document.execCommand('foreColor', false, colorPicker.value);
                document.getElementById(targetId).focus();
            };
        }
    });
}

// ===== Real-Time Search with Preview =====
let searchPreviewTimeout = null;

function setupRealTimeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBox = searchInput.closest('.search-box');

    // Create preview container if it doesn't exist
    if (!searchBox.querySelector('.search-results-preview')) {
        const preview = document.createElement('div');
        preview.className = 'search-results-preview';
        searchBox.appendChild(preview);
    }

    // Update search handler
    searchInput.addEventListener('input', handleSearchWithPreview);

    // Close preview when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchBox.contains(e.target)) {
            hideSearchPreview();
        }
    });
}

function handleSearchWithPreview(e) {
    const query = e.target.value.toLowerCase().trim();
    state.currentFilter = query;

    // Clear existing timeout
    if (searchPreviewTimeout) {
        clearTimeout(searchPreviewTimeout);
    }

    // Update main results
    renderRecipes();

    // Show preview with debounce
    if (query.length > 0) {
        searchPreviewTimeout = setTimeout(() => {
            showSearchPreview(query);
        }, 150);
    } else {
        hideSearchPreview();
    }
}

function showSearchPreview(query) {
    const preview = document.querySelector('.search-results-preview');
    if (!preview) return;

    const filtered = getFilteredRecipes();

    // Limit preview to top 5 results
    const topResults = filtered.slice(0, 5);

    if (topResults.length === 0) {
        preview.innerHTML = '<div class="search-result-item"><div class="search-result-name">No recipes found</div></div>';
        preview.classList.add('visible');
        return;
    }

    preview.innerHTML = topResults.map(recipe => {
        if (!recipe) return '';

        const tagsHtml = recipe.tags && Array.isArray(recipe.tags) && recipe.tags.length > 0
            ? `<div class="search-result-tags">${recipe.tags.map(tagName => {
                if (!tagName) return '';
                const tag = state.tags.find(t => t.name === tagName);
                const color = tag ? tag.color : '#8B5CF6';
                return `<span class="search-result-tag clickable-preview-tag" style="background: ${color}" data-tag-name="${tagName}">${tagName}</span>`;
            }).join('')}</div>`
            : '';

        const recipeName = recipe.name || 'Untitled Recipe';
        const prepTimeHtml = recipe.prepTime ? `<span>⏱️ ${recipe.prepTime}</span>` : '';
        const servingsHtml = recipe.servings ? `<span>🍽️ ${recipe.servings} servings</span>` : '';

        return `
            <div class="search-result-item" data-recipe-id="${recipe.id}">
                <div class="search-result-name">${highlightMatch(recipeName, query)}</div>
                ${prepTimeHtml || servingsHtml ? `<div class="search-result-meta">${prepTimeHtml}${servingsHtml}</div>` : ''}
                ${tagsHtml}
            </div>
        `;
    }).filter(html => html).join('');

    // Add click handlers for items
    preview.querySelectorAll('.search-result-item').forEach(item => {
        item.onclick = (e) => {
            // Check if we clicked on a tag
            if (e.target.classList.contains('clickable-preview-tag')) {
                return; // Let tag handler take care of it
            }

            const recipeId = item.dataset.recipeId;
            const recipe = state.recipes.find(r => r.id === recipeId);
            hideSearchPreview();
            if (recipe) {
                openSidePanel(recipe);
            }
        };
    });

    // Add click handlers for tags in preview
    preview.querySelectorAll('.clickable-preview-tag').forEach(tagEl => {
        tagEl.onclick = (e) => {
            e.stopPropagation(); // Prevent opening recipe modal
            const tagName = tagEl.dataset.tagName;

            hideSearchPreview();

            // Navigate to home page if not already there
            if (state.currentPage !== 'home') {
                navigateTo('home');
            }

            // Clear search input
            document.getElementById('searchInput').value = '';
            state.currentFilter = '';

            // Toggle the tag filter
            toggleTagFilter(tagName);

            showToast(`Filtering by ${tagName}`, 'success');
        };
    });

    preview.classList.add('visible');
}

function hideSearchPreview() {
    const preview = document.querySelector('.search-results-preview');
    if (preview) {
        preview.classList.remove('visible');
    }
}

function highlightMatch(text, query) {
    if (!query || !text) return text || '';

    // Escape special regex characters in the query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    try {
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        // Escape HTML to prevent XSS, then apply highlighting
        const escapedText = text.replace(/[<>&"']/g, (char) => {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return entities[char] || char;
        });
        return escapedText.replace(regex, '<strong>$1</strong>');
    } catch (e) {
        console.error('Error in highlightMatch:', e);
        return text;
    }
}

// ===== Enhanced Recipe Form Handling =====
function getEditorContent(editorId) {
    const editor = document.getElementById(editorId);

    if (!editor) {
        console.warn('getEditorContent: Editor element not found:', editorId);
        return [];
    }

    const html = editor.innerHTML.trim();

    if (!html || html === '<br>') {
        return [];
    }

    // Split by <div> or <br> tags and clean up
    const lines = html
        .split(/<div>|<br>/gi)
        .map(line => line.replace(/<\/div>/gi, '').trim())
        .filter(line => line && line !== '<br>');

    return lines;
}

function setEditorContent(editorId, content) {
    const editor = document.getElementById(editorId);

    if (!editor) {
        console.warn('setEditorContent: Editor element not found:', editorId);
        return;
    }

    if (Array.isArray(content)) {
        editor.innerHTML = content
            .map(line => line.includes('<') ? line : `<div>${line}</div>`)
            .join('');
    } else {
        editor.innerHTML = content || '';
    }
}

// ===== Side Panel Functions =====
function openSidePanel(recipe, sourceCard = null) {
    state.currentRecipe = recipe;
    state.sourceCard = sourceCard; // Store for closing animation

    const sidePanel = document.getElementById('sidePanel');
    const sidePanelOverlay = document.getElementById('sidePanelOverlay');
    const sidePanelName = document.getElementById('sidePanelRecipeName');
    const sidePanelContent = document.getElementById('sidePanelContent');

    if (!sidePanel || !sidePanelOverlay || !sidePanelName || !sidePanelContent) {
        console.warn('openSidePanel: Required side panel elements not found');
        return;
    }

    sidePanelName.textContent = recipe.name;

    let contentHTML = '';

    // Image
    if (recipe.image && state.settings.showImages) {
        contentHTML += `<img src="${recipe.image}" alt="${recipe.name}" class="side-panel-recipe-image" loading="lazy">`;
    }

    // Rating
    const rating = recipe.rating || 0;
    contentHTML += '<div class="side-panel-rating">';
    contentHTML += '<div class="rating-stars" data-recipe-id="' + recipe.id + '">';
    for (let i = 1; i <= 5; i++) {
        const filled = i <= rating;
        contentHTML += `<span class="rating-star ${filled ? 'filled' : ''}" data-rating="${i}" onclick="setRecipeRating('${recipe.id}', ${i})">★</span>`;
    }
    contentHTML += '</div>';
    if (rating > 0) {
        contentHTML += `<div class="rating-text">${rating} out of 5 stars</div>`;
    } else {
        contentHTML += '<div class="rating-text">Not rated yet</div>';
    }
    contentHTML += '</div>';

    // Meta information
    if (recipe.prepTime || recipe.cookTime || recipe.servings) {
        contentHTML += '<div class="side-panel-meta">';
        if (recipe.prepTime) {
            contentHTML += `
                <div class="side-panel-meta-item">
                    <div class="side-panel-meta-label">Prep Time</div>
                    <div class="side-panel-meta-value">${recipe.prepTime}</div>
                </div>
            `;
        }
        if (recipe.cookTime) {
            contentHTML += `
                <div class="side-panel-meta-item">
                    <div class="side-panel-meta-label">Cook Time</div>
                    <div class="side-panel-meta-value">${recipe.cookTime}</div>
                </div>
            `;
        }
        if (recipe.servings) {
            contentHTML += `
                <div class="side-panel-meta-item">
                    <div class="side-panel-meta-label">Servings</div>
                    <div class="side-panel-meta-value">${recipe.servings}</div>
                </div>
            `;
        }
        contentHTML += '</div>';
    }

    // Tags
    if (recipe.tags && recipe.tags.length > 0) {
        contentHTML += '<div class="side-panel-tags">';
        recipe.tags.forEach(tagName => {
            const tag = state.tags.find(t => t.name === tagName);
            const style = tag ? `style="background-color: ${tag.color}30; color: ${tag.color}; cursor: pointer;"` : 'style="cursor: pointer;"';
            contentHTML += `<span class="recipe-card-tag clickable-tag" ${style} data-tag-name="${tagName}">${tagName}</span>`;
        });
        contentHTML += '</div>';
    }

    // Ingredients
    if (recipe.ingredients && recipe.ingredients.length > 0) {
        contentHTML += '<div class="side-panel-section">';
        contentHTML += '<h3>🥘 Ingredients</h3>';
        contentHTML += '<div class="side-panel-section-content">';
        recipe.ingredients.forEach(ingredient => {
            contentHTML += `<div class="side-panel-ingredient">${ingredient}</div>`;
        });
        contentHTML += '</div></div>';
    }

    // Instructions
    if (recipe.instructions && recipe.instructions.length > 0) {
        contentHTML += '<div class="side-panel-section">';
        contentHTML += '<h3>📝 Instructions</h3>';
        contentHTML += '<div class="side-panel-section-content">';
        recipe.instructions.forEach((instruction, index) => {
            contentHTML += `<div class="side-panel-instruction" data-step="${index + 1}">${instruction}</div>`;
        });
        contentHTML += '</div></div>';
    }

    // Notes
    if (recipe.notes) {
        contentHTML += '<div class="side-panel-section">';
        contentHTML += '<h3>📌 Notes</h3>';
        contentHTML += `<div class="side-panel-section-content">${recipe.notes}</div>`;
        contentHTML += '</div>';
    }

    // Timestamps
    contentHTML += '<div class="side-panel-timestamps">';
    if (recipe.createdAt) {
        const createdDate = new Date(recipe.createdAt);
        contentHTML += `📅 Created: ${formatDate(createdDate)}`;
    }
    if (recipe.updatedAt) {
        const updatedDate = new Date(recipe.updatedAt);
        if (recipe.createdAt) contentHTML += ' | ';
        contentHTML += `🔄 Updated: ${formatDate(updatedDate)}`;
    }
    contentHTML += '</div>';

    sidePanelContent.innerHTML = contentHTML;

    // Add click handlers to tags in side panel
    sidePanelContent.querySelectorAll('.clickable-tag').forEach(tagEl => {
        tagEl.addEventListener('click', () => {
            const tagName = tagEl.dataset.tagName;

            // Close side panel
            closeSidePanel();

            // Navigate to home page
            navigateTo('home');

            // Clear any existing filters
            state.selectedTags.clear();

            // Toggle the tag filter
            toggleTagFilter(tagName);

            showToast(`Filtering by ${tagName}`, 'success');
        });
    });

    // Update favorites button
    const favoriteBtn = document.getElementById('sidePanelFavoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.innerHTML = recipe.isFavorite ? '⭐ Remove from Favorites' : '☆ Add to Favorites';
        favoriteBtn.className = recipe.isFavorite ? 'btn btn-secondary' : 'btn btn-primary';
        favoriteBtn.onclick = () => {
            toggleFavorite(recipe.id);
            // Update the button immediately
            const updatedRecipe = state.recipes.find(r => r.id === recipe.id);
            favoriteBtn.innerHTML = updatedRecipe.isFavorite ? '⭐ Remove from Favorites' : '☆ Add to Favorites';
            favoriteBtn.className = updatedRecipe.isFavorite ? 'btn btn-secondary' : 'btn btn-primary';
        };
    }

    // Setup shopping list button
    const shoppingBtn = document.getElementById('sidePanelShoppingBtn');
    if (shoppingBtn) {
        shoppingBtn.onclick = () => {
            addRecipesToShoppingList([recipe.id]);
        };
    }

    // Setup print button
    const printBtn = document.getElementById('sidePanelPrintBtn');
    if (printBtn) {
        printBtn.onclick = () => {
            printRecipe();
        };
    }

    // Setup edit button
    const editBtn = document.getElementById('sidePanelEditBtn');
    if (editBtn) {
        editBtn.onclick = () => {
            closeSidePanel();
            openRecipeEditorModal(recipe.id);
        };
    }

    // Setup delete button
    const deleteBtn = document.getElementById('sidePanelDeleteBtn');
    if (deleteBtn) {
        deleteBtn.onclick = () => {
            handleDeleteRecipeFromSidePanel();
        };
    }

    // Show the side panel with clean fade-in animation
    // Modal content is populated first, then we show it with a smooth animation
    // CSS handles the centering and sizing - no position tracking needed
    sidePanelOverlay.classList.add('active');
    sidePanel.classList.add('expanding');

    // Force reflow to ensure initial state is applied
    sidePanel.offsetHeight;

    // Use requestAnimationFrame to trigger smooth fade-in and scale-up
    requestAnimationFrame(() => {
        sidePanel.classList.add('active');
    });

    // Save current scroll position
    state.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    // Properly lock body scroll for all devices
    document.body.style.position = 'fixed';
    document.body.style.top = `-${state.scrollPosition}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    document.body.classList.add('modal-open'); // Prevent body scroll
}

function closeSidePanel() {
    const sidePanel = document.getElementById('sidePanel');
    const sidePanelOverlay = document.getElementById('sidePanelOverlay');

    if (!sidePanel || !sidePanelOverlay) return;

    // Clean fade-out animation - CSS handles the scaling and positioning
    sidePanel.classList.remove('active');
    sidePanel.classList.add('collapsing');

    // Fade out overlay
    sidePanelOverlay.classList.remove('active');

    // Clean up after animation completes
    setTimeout(() => {
        sidePanel.classList.remove('expanding', 'collapsing');
        sidePanel.style.top = '';
        sidePanel.style.left = '';
        sidePanel.style.width = '';
        sidePanel.style.height = '';
        sidePanel.style.transform = '';

        // Remove position: fixed and restore scroll position
        document.body.classList.remove('modal-open');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, state.scrollPosition);

        state.currentRecipe = null;
        state.sourceCard = null;
    }, 400); // Match transition duration
}

function handleDeleteRecipeFromSidePanel() {
    if (!state.currentRecipe) return;

    const recipeName = state.currentRecipe.name || 'this recipe';
    const confirmMessage = `Are you sure you want to delete "${recipeName}"?\n\nThis action cannot be undone.`;

    if (confirm(confirmMessage)) {
        const index = state.recipes.findIndex(r => r.id === state.currentRecipe.id);
        if (index !== -1) {
            state.recipes.splice(index, 1);
            saveRecipesToStorage();
            closeSidePanel();
            renderRecipes();
            showToast(`"${recipeName}" deleted successfully`, 'success');
        } else {
            showToast('Error: Recipe not found', 'error');
        }
    }
}

function printRecipe() {
    if (!state.currentRecipe) return;

    // Trigger the browser's print dialog
    window.print();
}

function setRecipeRating(recipeId, rating) {
    const recipe = state.recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    recipe.rating = rating;
    updateRecipeTimestamp(recipe);
    saveRecipesToStorage();

    // Update the stars in the side panel
    const starsContainer = document.querySelector(`.rating-stars[data-recipe-id="${recipeId}"]`);
    if (starsContainer) {
        const stars = starsContainer.querySelectorAll('.rating-star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
            }
        });

        // Update the rating text
        const ratingText = starsContainer.nextElementSibling;
        if (ratingText) {
            ratingText.textContent = `${rating} out of 5 stars`;
        }
    }

    showToast(`Rated ${rating} stars`, 'success');
}

// ===== Shopping List Functions =====
function saveShoppingListToStorage() {
    if (!isLocalStorageAvailable()) return;
    try {
        localStorage.setItem('shoppingList', JSON.stringify(state.shoppingList));
    } catch (e) {
        console.error('Failed to save shopping list:', e);
    }
}

function loadShoppingListFromStorage() {
    if (!isLocalStorageAvailable()) return;
    try {
        const saved = localStorage.getItem('shoppingList');
        if (saved) {
            state.shoppingList = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load shopping list:', e);
        state.shoppingList = [];
    }
}

function addRecipesToShoppingList(recipeIds) {
    recipeIds.forEach(recipeId => {
        const recipe = state.recipes.find(r => r.id === recipeId);
        if (!recipe || !recipe.ingredients) return;

        recipe.ingredients.forEach(ingredient => {
            // Parse ingredient to remove HTML tags
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = ingredient;
            const cleanIngredient = tempDiv.textContent || tempDiv.innerText || '';

            if (!cleanIngredient.trim()) return;

            // Check if ingredient already exists
            const existingItem = state.shoppingList.find(
                item => item.text.toLowerCase() === cleanIngredient.toLowerCase()
            );

            if (!existingItem) {
                state.shoppingList.push({
                    id: generateId(),
                    text: cleanIngredient,
                    checked: false,
                    source: recipe.name
                });
            }
        });
    });

    saveShoppingListToStorage();
    renderShoppingList();
    showToast('Ingredients added to shopping list', 'success');
}

function addCustomItemToShoppingList() {
    const itemText = prompt('Enter item name:');
    if (!itemText || !itemText.trim()) return;

    state.shoppingList.push({
        id: generateId(),
        text: itemText.trim(),
        checked: false,
        source: 'Custom'
    });

    saveShoppingListToStorage();
    renderShoppingList();
    showToast('Item added to shopping list', 'success');
}

function toggleShoppingListItem(itemId) {
    const item = state.shoppingList.find(i => i.id === itemId);
    if (item) {
        item.checked = !item.checked;
        saveShoppingListToStorage();
        renderShoppingList();
    }
}

function deleteShoppingListItem(itemId) {
    const index = state.shoppingList.findIndex(i => i.id === itemId);
    if (index !== -1) {
        state.shoppingList.splice(index, 1);
        saveShoppingListToStorage();
        renderShoppingList();
        showToast('Item removed', 'success');
    }
}

function clearShoppingList() {
    if (state.shoppingList.length === 0) {
        showToast('Shopping list is already empty', 'info');
        return;
    }

    if (confirm('Are you sure you want to clear the entire shopping list?')) {
        state.shoppingList = [];
        saveShoppingListToStorage();
        renderShoppingList();
        showToast('Shopping list cleared', 'success');
    }
}

function renderShoppingList() {
    const content = document.getElementById('shoppingListContent');
    const empty = document.getElementById('shoppingListEmpty');

    if (state.shoppingList.length === 0) {
        content.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    content.style.display = 'block';
    empty.style.display = 'none';

    // Group items by source
    const grouped = {};
    state.shoppingList.forEach(item => {
        const source = item.source || 'Other';
        if (!grouped[source]) {
            grouped[source] = [];
        }
        grouped[source].push(item);
    });

    let html = '';
    Object.keys(grouped).sort().forEach(source => {
        const items = grouped[source];
        const uncheckedCount = items.filter(i => !i.checked).length;

        html += `
            <div class="shopping-list-category">
                <div class="shopping-list-category-header">
                    <div class="shopping-list-category-title">${source}</div>
                    <div class="shopping-list-category-count">${uncheckedCount}/${items.length} remaining</div>
                </div>
        `;

        items.forEach(item => {
            html += `
                <div class="shopping-list-item ${item.checked ? 'checked' : ''}">
                    <input type="checkbox"
                           class="shopping-list-checkbox"
                           ${item.checked ? 'checked' : ''}
                           onchange="toggleShoppingListItem('${item.id}')">
                    <div class="shopping-list-item-text">${item.text}</div>
                    <button class="shopping-list-item-delete"
                            onclick="deleteShoppingListItem('${item.id}')"
                            title="Remove item">✕</button>
                </div>
            `;
        });

        html += '</div>';
    });

    content.innerHTML = html;
}

function openRecipeSelectionModal() {
    if (state.recipes.length === 0) {
        showToast('No recipes available. Add some recipes first!', 'error');
        return;
    }

    const modal = document.getElementById('recipeSelectionModal');
    const list = document.getElementById('recipeSelectionList');

    let html = '';
    state.recipes.forEach(recipe => {
        const ingredientCount = recipe.ingredients ? recipe.ingredients.length : 0;
        html += `
            <div class="recipe-selection-item" onclick="toggleRecipeSelection('${recipe.id}', this)">
                <input type="checkbox"
                       class="recipe-selection-checkbox"
                       data-recipe-id="${recipe.id}"
                       onclick="event.stopPropagation(); toggleRecipeSelection('${recipe.id}', this.parentElement)">
                <div class="recipe-selection-info">
                    <div class="recipe-selection-name">${recipe.name}</div>
                    <div class="recipe-selection-meta">${ingredientCount} ingredients</div>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;

    // Save current scroll position
    state.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    // Set body position fixed with top offset
    document.body.style.position = 'fixed';
    document.body.style.top = `-${state.scrollPosition}px`;

    modal.classList.add('visible');
    document.body.classList.add('modal-open');
}

function closeRecipeSelectionModal() {
    const modal = document.getElementById('recipeSelectionModal');
    closeModalWithAnimation(modal);
}

function toggleRecipeSelection(recipeId, element) {
    const checkbox = element.querySelector('.recipe-selection-checkbox');
    checkbox.checked = !checkbox.checked;
}

function confirmRecipeSelection() {
    const checkboxes = document.querySelectorAll('.recipe-selection-checkbox:checked');
    const selectedRecipeIds = Array.from(checkboxes).map(cb => cb.dataset.recipeId);

    if (selectedRecipeIds.length === 0) {
        showToast('Please select at least one recipe', 'error');
        return;
    }

    closeRecipeSelectionModal();
    addRecipesToShoppingList(selectedRecipeIds);

    // Navigate to shopping list page
    navigateTo('shopping-list');
}

// ===== Sample Recipes Import =====
// Load 2-3 sample recipes on first visit only
async function loadInitialSampleRecipes() {
    // Check if this is the first visit and user has no recipes
    const isFirstVisit = isLocalStorageAvailable() ?
        !localStorage.getItem('recipesLoaded') : false;

    if (!isFirstVisit || state.recipes.length > 0) {
        return; // Skip if not first visit or already has recipes
    }

    const initialSampleFiles = [
        'sample-recipes/chocolate-chip-cookies.json',
        'sample-recipes/avocado-toast.json',
        'sample-recipes/banana-bread.json',
        'sample-recipes/greek-salad.json'
    ];

    let loadedCount = 0;
    let errorCount = 0;

    try {
        showLoadingState('Loading sample recipes...');

        const importPromises = initialSampleFiles.map(async (filePath) => {
            try {
                const response = await fetch(filePath);
                if (!response.ok) {
                    console.warn(`Warning: Could not load ${filePath} (${response.status})`);
                    errorCount++;
                    return;
                }
                const data = await response.json();
                const recipe = normalizeRecipe(data);

                if (validateRecipe(recipe)) {
                    recipe.id = generateId();
                    recipe.createdAt = new Date().toISOString();
                    recipe.updatedAt = new Date().toISOString();
                    state.recipes.unshift(recipe);
                    loadedCount++;
                } else {
                    console.warn(`Warning: Invalid recipe format in ${filePath}`);
                    errorCount++;
                }
            } catch (error) {
                console.warn(`Warning: Error loading ${filePath}:`, error.message);
                errorCount++;
            }
        });

        await Promise.all(importPromises);

        if (state.recipes.length > 0) {
            saveRecipesToStorage();

            // Extract new tags
            const allTags = new Set(state.tags.map(t => t.name));
            state.recipes.forEach(recipe => {
                recipe.tags.forEach(tag => {
                    if (!allTags.has(tag)) {
                        state.tags.push({
                            id: generateId(),
                            name: tag,
                            color: generateRandomColor(),
                            defaultVisible: true
                        });
                        allTags.add(tag);
                    }
                });
            });
            saveTagsToStorage();

            // Mark that we've loaded initial recipes only if successful
            if (isLocalStorageAvailable()) {
                try {
                    localStorage.setItem('recipesLoaded', 'true');
                } catch (e) {
                    console.warn('Unable to save recipes loaded flag:', e);
                }
            }

            // Show success toast with count
            showToast(
                `Loaded ${loadedCount} sample recipe${loadedCount !== 1 ? 's' : ''}!`,
                'success'
            );
        } else if (errorCount > 0) {
            console.warn(`Failed to load any sample recipes (${errorCount} errors)`);
        }

        hideLoadingState();
    } catch (error) {
        console.error('Error loading initial sample recipes:', error);
        hideLoadingState();
    }
}

async function importSampleRecipes() {
    const sampleRecipeFiles = [
        'sample-recipes/chocolate-chip-cookies.json',
        'sample-recipes/spaghetti-carbonara.json',
        'sample-recipes/avocado-toast.json',
        'sample-recipes/banana-bread.json',
        'sample-recipes/greek-salad.json',
        'sample-recipes/chicken-stir-fry.json',
        'sample-recipes/beef-tacos.json'
    ];

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
        showLoadingState('Importing sample recipes...');

        const importPromises = sampleRecipeFiles.map(async (filePath) => {
            try {
                const response = await fetch(filePath);
                if (!response.ok) {
                    console.warn(`Warning: Could not fetch ${filePath} (${response.status})`);
                    errorCount++;
                    return;
                }
                const data = await response.json();
                const recipe = normalizeRecipe(data);

                if (validateRecipe(recipe)) {
                    // Check if recipe already exists by name
                    const existingRecipe = state.recipes.find(r =>
                        r.name.toLowerCase() === recipe.name.toLowerCase()
                    );

                    if (!existingRecipe) {
                        recipe.id = generateId();
                        recipe.createdAt = new Date().toISOString();
                        recipe.updatedAt = new Date().toISOString();
                        state.recipes.unshift(recipe);
                        successCount++;
                    } else {
                        skippedCount++;
                    }
                } else {
                    console.warn(`Warning: Invalid recipe format in ${filePath}`);
                    errorCount++;
                }
            } catch (error) {
                console.warn(`Warning: Error importing ${filePath}:`, error.message);
                errorCount++;
            }
        });

        await Promise.all(importPromises);

        if (successCount > 0) {
            saveRecipesToStorage();

            // Extract new tags
            const allTags = new Set(state.tags.map(t => t.name));
            state.recipes.forEach(recipe => {
                recipe.tags.forEach(tag => {
                    if (!allTags.has(tag)) {
                        state.tags.push({
                            id: generateId(),
                            name: tag,
                            color: generateRandomColor(),
                            defaultVisible: true
                        });
                        allTags.add(tag);
                    }
                });
            });
            saveTagsToStorage();

            // Render recipes
            renderRecipes();

            // Build informative message
            let message = `Successfully imported ${successCount} recipe${successCount !== 1 ? 's' : ''}`;
            if (skippedCount > 0) {
                message += `, skipped ${skippedCount} already imported`;
            }
            if (errorCount > 0) {
                message += `, ${errorCount} error${errorCount !== 1 ? 's' : ''}`;
            }
            showToast(message + '!', 'success');
        } else if (skippedCount > 0 && errorCount === 0) {
            showToast(`All ${skippedCount} sample recipes already imported!`, 'info');
        } else if (errorCount > 0) {
            showToast(`Failed to import sample recipes (${errorCount} error${errorCount !== 1 ? 's' : ''})`, 'error');
        } else {
            showToast('No recipes to import', 'info');
        }

        hideLoadingState();
    } catch (error) {
        console.error('Error importing sample recipes:', error);
        showToast('Error importing sample recipes', 'error');
        hideLoadingState();
    }
}

// ===== Word Document Import Functionality =====
let currentParsedRecipe = null;

async function handleWordDocumentImport(file) {
    const modal = document.getElementById('wordImportModal');
    const modalBody = modal.querySelector('.modal-body');

    // Show loading state
    modalBody.innerHTML = `
        <div class="word-import-loading">
            <div class="spinner"></div>
            <p>Parsing Word document...</p>
            <div class="word-import-progress">
                <div class="word-import-progress-bar" style="width: 50%"></div>
            </div>
        </div>
    `;

    modal.classList.add('active');

    try {
        // Parse the Word document
        const result = await WordRecipeParser.parseWordDocument(file);

        if (!result.success) {
            throw new Error(result.error || 'Failed to parse Word document');
        }

        // Store the parsed recipe globally
        currentParsedRecipe = result;

        // Restore modal content
        modalBody.innerHTML = `
            <div class="word-import-container">
                <!-- Confidence Indicators -->
                <div class="confidence-indicators" id="confidenceIndicators">
                    <div class="confidence-item">
                        <span class="confidence-label">Title:</span>
                        <div class="confidence-bar">
                            <div class="confidence-fill" id="titleConfidence"></div>
                        </div>
                        <span class="confidence-score" id="titleScore">0%</span>
                    </div>
                    <div class="confidence-item">
                        <span class="confidence-label">Ingredients:</span>
                        <div class="confidence-bar">
                            <div class="confidence-fill" id="ingredientsConfidence"></div>
                        </div>
                        <span class="confidence-score" id="ingredientsScore">0%</span>
                    </div>
                    <div class="confidence-item">
                        <span class="confidence-label">Instructions:</span>
                        <div class="confidence-bar">
                            <div class="confidence-fill" id="instructionsConfidence"></div>
                        </div>
                        <span class="confidence-score" id="instructionsScore">0%</span>
                    </div>
                    <div class="confidence-item overall">
                        <span class="confidence-label">Overall:</span>
                        <div class="confidence-bar">
                            <div class="confidence-fill" id="overallConfidence"></div>
                        </div>
                        <span class="confidence-score" id="overallScore">0%</span>
                    </div>
                </div>

                <!-- Tabbed Interface -->
                <div class="word-import-tabs">
                    <button class="word-tab active" data-tab="parsed">Parsed Data</button>
                    <button class="word-tab" data-tab="original">Original Document</button>
                </div>

                <!-- Parsed Data Tab -->
                <div class="word-tab-content active" id="parsedDataTab">
                    <!-- Title -->
                    <div class="form-group">
                        <label for="wordRecipeTitle">Recipe Title*</label>
                        <input type="text" id="wordRecipeTitle" class="form-control" maxlength="200" placeholder="Enter recipe title">
                    </div>

                    <!-- Images -->
                    <div class="form-group" id="wordImagesGroup" style="display: none;">
                        <label>Recipe Images (select one or more)</label>
                        <div class="word-images-grid" id="wordImagesGrid">
                            <!-- Image checkboxes will be inserted here -->
                        </div>
                    </div>

                    <!-- Metadata Row -->
                    <div class="metadata-row">
                        <div class="form-group">
                            <label for="wordPrepTime">Prep Time</label>
                            <input type="text" id="wordPrepTime" class="form-control" placeholder="e.g., 15 min">
                        </div>
                        <div class="form-group">
                            <label for="wordCookTime">Cook Time</label>
                            <input type="text" id="wordCookTime" class="form-control" placeholder="e.g., 30 min">
                        </div>
                        <div class="form-group">
                            <label for="wordServings">Servings</label>
                            <input type="number" id="wordServings" class="form-control" min="1" placeholder="e.g., 4">
                        </div>
                    </div>

                    <!-- Ingredients -->
                    <div class="form-group">
                        <label>Ingredients* <span class="item-count" id="ingredientsCount">0 items</span></label>
                        <div class="editable-list" id="wordIngredientsList">
                            <!-- Ingredient items will be inserted here -->
                        </div>
                        <button class="btn btn-secondary btn-sm" id="addIngredientBtn">+ Add Ingredient</button>
                    </div>

                    <!-- Instructions -->
                    <div class="form-group">
                        <label>Instructions* <span class="item-count" id="instructionsCount">0 steps</span></label>
                        <div class="editable-list" id="wordInstructionsList">
                            <!-- Instruction items will be inserted here -->
                        </div>
                        <button class="btn btn-secondary btn-sm" id="addInstructionBtn">+ Add Instruction</button>
                    </div>

                    <!-- Notes -->
                    <div class="form-group">
                        <label for="wordNotes">Notes</label>
                        <textarea id="wordNotes" class="form-control" rows="3" placeholder="Any additional notes or tips"></textarea>
                    </div>

                    <!-- Tags -->
                    <div class="form-group">
                        <label for="wordTags">Tags (comma-separated)</label>
                        <input type="text" id="wordTags" class="form-control" placeholder="e.g., Dinner, Italian, Quick">
                    </div>
                </div>

                <!-- Original Document Tab -->
                <div class="word-tab-content" id="originalDocTab">
                    <div class="original-doc-viewer" id="originalDocViewer">
                        <!-- Original HTML content will be displayed here -->
                    </div>
                </div>
            </div>
        `;

        // Populate the modal with parsed data
        populateWordImportModal(result);

        // Setup event listeners
        setupWordImportEventListeners();

    } catch (error) {
        console.error('Error importing Word document:', error);
        modalBody.innerHTML = `
            <div class="word-import-loading">
                <p style="color: var(--danger-color);">❌ Error: ${error.message}</p>
                <p>Please check the document format and try again.</p>
            </div>
        `;

        setTimeout(() => {
            modal.classList.remove('active');
        }, 3000);
    }
}

function populateWordImportModal(result) {
    const { recipe, confidence, rawHtml } = result;

    // Update confidence bars
    updateConfidenceBar('titleConfidence', 'titleScore', confidence.title);
    updateConfidenceBar('ingredientsConfidence', 'ingredientsScore', confidence.ingredients);
    updateConfidenceBar('instructionsConfidence', 'instructionsScore', confidence.instructions);
    updateConfidenceBar('overallConfidence', 'overallScore', confidence.overall);

    // Populate form fields
    document.getElementById('wordRecipeTitle').value = recipe.name || '';
    document.getElementById('wordPrepTime').value = recipe.prepTime || '';
    document.getElementById('wordCookTime').value = recipe.cookTime || '';
    document.getElementById('wordServings').value = recipe.servings || '';
    document.getElementById('wordNotes').value = recipe.notes || '';

    // Populate images if any
    if (recipe.images && recipe.images.length > 0) {
        const imagesGroup = document.getElementById('wordImagesGroup');
        const imagesGrid = document.getElementById('wordImagesGrid');
        imagesGroup.style.display = 'block';

        imagesGrid.innerHTML = recipe.images.map((img, index) => `
            <div class="word-image-item ${index === 0 ? 'selected' : ''}" onclick="toggleWordImage(this)">
                <img src="${img}" alt="Recipe image ${index + 1}">
                <input type="checkbox" class="word-image-checkbox" ${index === 0 ? 'checked' : ''} data-image-src="${img}">
                <div class="word-image-label">Image ${index + 1}</div>
            </div>
        `).join('');
    }

    // Populate ingredients
    populateEditableList('wordIngredientsList', recipe.ingredients, 'ingredient');
    updateItemCount('ingredientsCount', recipe.ingredients.length, 'items');

    // Populate instructions
    populateEditableList('wordInstructionsList', recipe.instructions, 'instruction');
    updateItemCount('instructionsCount', recipe.instructions.length, 'steps');

    // Populate original document viewer
    document.getElementById('originalDocViewer').innerHTML = rawHtml || '<p>No preview available</p>';
}

function updateConfidenceBar(barId, scoreId, value) {
    const bar = document.getElementById(barId);
    const score = document.getElementById(scoreId);

    bar.style.width = value + '%';
    score.textContent = value + '%';

    // Color code based on confidence
    if (value >= 80) {
        bar.style.background = '#4CAF50'; // Green
    } else if (value >= 60) {
        bar.style.background = '#8BC34A'; // Light green
    } else if (value >= 40) {
        bar.style.background = '#FFC107'; // Yellow
    } else {
        bar.style.background = '#FF5722'; // Red
    }
}

function populateEditableList(containerId, items, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map((item, index) => `
        <div class="editable-list-item">
            <span class="item-number">${index + 1}</span>
            <textarea class="item-text" placeholder="Enter ${type}">${item}</textarea>
            <button onclick="removeListItem(this)">✕</button>
        </div>
    `).join('');
}

function updateItemCount(countId, count, label) {
    const countElem = document.getElementById(countId);
    countElem.textContent = `${count} ${label}`;
}

function setupWordImportEventListeners() {
    // Tab switching
    const tabs = document.querySelectorAll('.word-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Update tab buttons
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update tab content
            document.getElementById('parsedDataTab').classList.remove('active');
            document.getElementById('originalDocTab').classList.remove('active');

            if (targetTab === 'parsed') {
                document.getElementById('parsedDataTab').classList.add('active');
            } else {
                document.getElementById('originalDocTab').classList.add('active');
            }
        });
    });

    // Add ingredient button
    document.getElementById('addIngredientBtn').addEventListener('click', () => {
        const list = document.getElementById('wordIngredientsList');
        const count = list.children.length + 1;
        const newItem = document.createElement('div');
        newItem.className = 'editable-list-item';
        newItem.innerHTML = `
            <span class="item-number">${count}</span>
            <textarea class="item-text" placeholder="Enter ingredient"></textarea>
            <button onclick="removeListItem(this)">✕</button>
        `;
        list.appendChild(newItem);
        updateItemCount('ingredientsCount', count, 'items');
        newItem.querySelector('textarea').focus();
    });

    // Add instruction button
    document.getElementById('addInstructionBtn').addEventListener('click', () => {
        const list = document.getElementById('wordInstructionsList');
        const count = list.children.length + 1;
        const newItem = document.createElement('div');
        newItem.className = 'editable-list-item';
        newItem.innerHTML = `
            <span class="item-number">${count}</span>
            <textarea class="item-text" placeholder="Enter instruction"></textarea>
            <button onclick="removeListItem(this)">✕</button>
        `;
        list.appendChild(newItem);
        updateItemCount('instructionsCount', count, 'steps');
        newItem.querySelector('textarea').focus();
    });

    // Close modal
    document.getElementById('wordImportClose').addEventListener('click', closeWordImportModal);
    document.getElementById('cancelWordImportBtn').addEventListener('click', closeWordImportModal);

    // Save recipe
    document.getElementById('saveWordImportBtn').addEventListener('click', saveWordImportRecipe);
}

function removeListItem(button) {
    const list = button.parentElement.parentElement;
    const item = button.parentElement;
    item.remove();

    // Renumber items
    const items = list.querySelectorAll('.editable-list-item');
    items.forEach((item, index) => {
        item.querySelector('.item-number').textContent = index + 1;
    });

    // Update count
    if (list.id === 'wordIngredientsList') {
        updateItemCount('ingredientsCount', items.length, 'items');
    } else if (list.id === 'wordInstructionsList') {
        updateItemCount('instructionsCount', items.length, 'steps');
    }
}

function toggleWordImage(imageItem) {
    imageItem.classList.toggle('selected');
    const checkbox = imageItem.querySelector('.word-image-checkbox');
    checkbox.checked = !checkbox.checked;
}

function closeWordImportModal() {
    const modal = document.getElementById('wordImportModal');
    modal.classList.remove('active');
    currentParsedRecipe = null;
}

function saveWordImportRecipe() {
    // Collect data from form
    const title = document.getElementById('wordRecipeTitle').value.trim();
    const prepTime = document.getElementById('wordPrepTime').value.trim();
    const cookTime = document.getElementById('wordCookTime').value.trim();
    const servings = document.getElementById('wordServings').value;
    const notes = document.getElementById('wordNotes').value.trim();
    const tags = document.getElementById('wordTags').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

    // Collect ingredients
    const ingredientItems = document.querySelectorAll('#wordIngredientsList .item-text');
    const ingredients = Array.from(ingredientItems)
        .map(item => item.value.trim())
        .filter(text => text.length > 0);

    // Collect instructions
    const instructionItems = document.querySelectorAll('#wordInstructionsList .item-text');
    const instructions = Array.from(instructionItems)
        .map(item => item.value.trim())
        .filter(text => text.length > 0);

    // Collect selected images
    const selectedImages = Array.from(document.querySelectorAll('.word-image-checkbox:checked'))
        .map(cb => cb.dataset.imageSrc);

    // Validate
    if (!title) {
        showToast('Please enter a recipe title', 'error');
        return;
    }

    if (ingredients.length === 0) {
        showToast('Please add at least one ingredient', 'error');
        return;
    }

    if (instructions.length === 0) {
        showToast('Please add at least one instruction', 'error');
        return;
    }

    // Create recipe object
    const recipe = {
        id: generateId(),
        name: title,
        ingredients: ingredients,
        instructions: instructions,
        tags: tags,
        prepTime: prepTime || null,
        cookTime: cookTime || null,
        servings: servings ? parseInt(servings, 10) : null,
        notes: notes,
        image: selectedImages.length > 0 ? selectedImages[0] : null, // Use first selected image
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Add recipe to state
    state.recipes.unshift(recipe);

    // Extract and add new tags
    const allTags = new Set(state.tags.map(t => t.name));
    tags.forEach(tag => {
        if (!allTags.has(tag)) {
            state.tags.push({
                id: generateId(),
                name: tag,
                color: getRandomColor(),
                defaultVisible: true
            });
        }
    });

    // Save and update UI
    saveRecipesToStorage();
    saveTags();
    renderRecipes();

    // Close modal and show success
    closeWordImportModal();
    showToast(`Recipe "${title}" imported successfully!`, 'success');

    // Show import results
    const importResults = document.getElementById('importResults');
    importResults.innerHTML = `
        <h3>Import Results:</h3>
        <div class="import-result-item success">
            ✓ Successfully imported: ${title}
        </div>
        <div style="margin-top: 12px; padding: 12px; background: var(--background-secondary); border-radius: 6px;">
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
                Confidence scores - Title: ${currentParsedRecipe.confidence.title}%,
                Ingredients: ${currentParsedRecipe.confidence.ingredients}%,
                Instructions: ${currentParsedRecipe.confidence.instructions}%
            </p>
        </div>
    `;
    importResults.classList.add('visible');
}

// Make Word import functions globally available
window.handleWordDocumentImport = handleWordDocumentImport;
window.removeListItem = removeListItem;
window.toggleWordImage = toggleWordImage;
window.closeWordImportModal = closeWordImportModal;
window.saveWordImportRecipe = saveWordImportRecipe;

// Make functions available globally
window.navigateTo = navigateTo;
window.exportAllRecipes = exportAllRecipes;
window.exportRecipesAsDocuments = exportRecipesAsDocuments;
window.archiveRecipesAsJSON = archiveRecipesAsJSON;
window.openRecipeEditorModal = openRecipeEditorModal;
window.closeRecipeEditorModal = closeRecipeEditorModal;
window.openSidePanel = openSidePanel;
window.closeSidePanel = closeSidePanel;
window.toggleShoppingListItem = toggleShoppingListItem;
window.deleteShoppingListItem = deleteShoppingListItem;
window.clearShoppingList = clearShoppingList;
window.addCustomItemToShoppingList = addCustomItemToShoppingList;
window.openRecipeSelectionModal = openRecipeSelectionModal;
window.closeRecipeSelectionModal = closeRecipeSelectionModal;
window.toggleRecipeSelection = toggleRecipeSelection;
window.confirmRecipeSelection = confirmRecipeSelection;
window.setRecipeRating = setRecipeRating;
window.importSampleRecipes = importSampleRecipes;
window.toggleFavoritesView = toggleFavoritesView;
