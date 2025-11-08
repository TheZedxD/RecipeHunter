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
    searchActive: false,
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
    touchStartY: 0
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    loadDataFromStorage();
    setupEventListeners();
    setupRealTimeSearch();
    applyTheme();
    renderInitialView();
    setupMobileFeatures();
    setupFirstTimeGuide();

    // Log device info for debugging
    console.log('Device Info:', {
        isMobile: state.isMobile,
        isIOS: state.isIOS,
        isTouchDevice: state.isTouchDevice,
        userAgent: navigator.userAgent
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

    // Handle window resize for orientation changes
    window.addEventListener('resize', () => {
        state.isMobile = isMobile();
        hideContextMenu();
        hideSearchPreview();
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

function loadDataFromStorage() {
    // Check if localStorage is available (can be disabled in iOS private browsing)
    if (!isLocalStorageAvailable()) {
        console.warn('localStorage is not available. Data will not persist across sessions.');
        showToast('Running in private mode - recipes won\'t be saved', 'warning');
        // Initialize with default tags
        if (state.tags.length === 0) {
            state.tags = getDefaultTags();
        }
        return;
    }

    try {
        const storedRecipes = localStorage.getItem('recipes');
        const storedTags = localStorage.getItem('tags');
        const storedSettings = localStorage.getItem('settings');

        if (storedRecipes) {
            try {
                const parsedRecipes = JSON.parse(storedRecipes);
                // Validate that it's an array
                if (Array.isArray(parsedRecipes)) {
                    state.recipes = parsedRecipes;
                    // Ensure all recipes have required fields and timestamps
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
                        // Add isFavorite property if it doesn't exist
                        if (recipe.isFavorite === undefined) {
                            recipe.isFavorite = false;
                        }
                    });
                } else {
                    console.warn('Invalid recipes data format, resetting to empty array');
                    state.recipes = [];
                }
            } catch (e) {
                console.error('Error parsing recipes:', e);
                state.recipes = [];
                showToast('Error loading recipes from storage', 'error');
            }
        }

        if (storedTags) {
            try {
                const parsedTags = JSON.parse(storedTags);
                if (Array.isArray(parsedTags)) {
                    state.tags = parsedTags;
                } else {
                    console.warn('Invalid tags data format, will use defaults');
                    state.tags = [];
                }
            } catch (e) {
                console.error('Error parsing tags:', e);
                state.tags = [];
            }
        }

        // Load settings
        if (storedSettings) {
            try {
                const parsedSettings = JSON.parse(storedSettings);
                state.settings = { ...state.settings, ...parsedSettings };
            } catch (e) {
                console.error('Error parsing settings:', e);
            }
        }

        // Load shopping list
        loadShoppingListFromStorage();
    } catch (e) {
        console.error('Error accessing localStorage:', e);
        showToast('Error accessing local storage', 'error');
    }

    // Add default tags if none exist
    if (state.tags.length === 0) {
        state.tags = getDefaultTags();
        saveTagsToStorage();
    }

    // Ensure existing tags have defaultVisible property
    state.tags.forEach(tag => {
        if (tag.defaultVisible === undefined) {
            tag.defaultVisible = true;
        }
    });

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
        { name: 'Breakfast', color: '#F59E0B', defaultVisible: true },
        { name: 'Lunch', color: '#10B981', defaultVisible: true },
        { name: 'Dinner', color: '#3B82F6', defaultVisible: true },
        { name: 'Dessert', color: '#EC4899', defaultVisible: true },
        { name: 'Snack', color: '#F97316', defaultVisible: false },
        { name: 'Appetizer', color: '#06B6D4', defaultVisible: false },
        { name: 'Side Dish', color: '#84CC16', defaultVisible: false },
        { name: 'Vegetarian', color: '#059669', defaultVisible: true },
        { name: 'Vegan', color: '#14B8A6', defaultVisible: false },
        { name: 'Quick', color: '#8B5CF6', defaultVisible: true },
        { name: 'Slow Cooker', color: '#A855F7', defaultVisible: false },
        { name: 'Healthy', color: '#22C55E', defaultVisible: false }
    ];
}

function saveRecipesToStorage() {
    if (!isLocalStorageAvailable()) {
        console.warn('localStorage not available, skipping save');
        return;
    }

    try {
        const recipesJson = JSON.stringify(state.recipes);
        localStorage.setItem('recipes', recipesJson);
    } catch (e) {
        console.error('Error saving recipes to storage:', e);
        if (e.name === 'QuotaExceededError') {
            showToast('Storage quota exceeded. Please delete some recipes or clear browser data.', 'error');
        } else if (state.isIOS) {
            showToast('Unable to save - check if private browsing is enabled', 'error');
        } else {
            showToast('Error saving recipes', 'error');
        }
    }
}

function saveTagsToStorage() {
    if (!isLocalStorageAvailable()) {
        console.warn('localStorage not available, skipping save');
        return;
    }

    try {
        const tagsJson = JSON.stringify(state.tags);
        localStorage.setItem('tags', tagsJson);
    } catch (e) {
        console.error('Error saving tags to storage:', e);
        if (state.isIOS) {
            showToast('Unable to save - check if private browsing is enabled', 'error');
        } else {
            showToast('Error saving tags', 'error');
        }
    }
}

function saveSettingsToStorage() {
    if (!isLocalStorageAvailable()) {
        console.warn('localStorage not available, skipping save');
        return;
    }

    try {
        const settingsJson = JSON.stringify(state.settings);
        localStorage.setItem('settings', settingsJson);
    } catch (e) {
        console.error('Error saving settings to storage:', e);
        showToast('Error saving settings', 'error');
    }
}

// ===== Event Listeners Setup =====
function setupEventListeners() {
    // Search (handled by setupRealTimeSearch)
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');

    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearchClick);
    } else {
        console.warn('setupEventListeners: searchBtn element not found');
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearchClick();
        });
    } else {
        console.warn('setupEventListeners: searchInput element not found');
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
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileMenu();
        }
    });

    // Preferences Modal
    const preferencesBtn = document.getElementById('preferencesBtn');
    const preferencesModal = document.getElementById('preferencesModal');
    const preferencesClose = document.getElementById('preferencesClose');

    if (preferencesBtn && preferencesModal && preferencesClose) {
        preferencesBtn.addEventListener('click', () => {
            preferencesModal.classList.add('visible');
            document.body.classList.add('modal-open');
            updateActiveThemeCard();
        });

        preferencesClose.addEventListener('click', () => {
            preferencesModal.classList.remove('visible');
            document.body.classList.remove('modal-open');
        });

        preferencesModal.addEventListener('click', (e) => {
            if (e.target === preferencesModal) {
                preferencesModal.classList.remove('visible');
                document.body.classList.remove('modal-open');
            }
        });
    } else {
        if (!preferencesBtn) console.warn('setupEventListeners: preferencesBtn element not found');
        if (!preferencesModal) console.warn('setupEventListeners: preferencesModal element not found');
        if (!preferencesClose) console.warn('setupEventListeners: preferencesClose element not found');
    }

    // Theme switching
    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const theme = e.currentTarget.dataset.theme;
            setTheme(theme);
            updateActiveThemeCard();
        });
    });

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

function handleImageUpload(file) {
    console.log('handleImageUpload called with file:', file?.name);
    if (!file) {
        console.warn('No file provided to handleImageUpload');
        return;
    }

    // Check file size (max 5MB)
    console.log('Checking file size:', file.size, 'bytes');
    if (file.size > 5 * 1024 * 1024) {
        console.error('Image file too large:', file.size);
        showToast('Image size must be less than 5MB', 'error');
        return;
    }

    // Check file type
    console.log('Checking file type:', file.type);
    if (!file.type.startsWith('image/')) {
        console.error('Invalid file type:', file.type);
        showToast('Please select a valid image file', 'error');
        return;
    }

    console.log('Reading image file...');
    const reader = new FileReader();
    reader.onload = (e) => {
        console.log('Image file loaded successfully');
        state.currentImageData = e.target.result;
        displayImagePreview(state.currentImageData);
        showToast('Image uploaded successfully', 'success');
    };

    reader.onerror = () => {
        console.error('Error reading image file');
        showToast('Error reading image file', 'error');
    };

    reader.readAsDataURL(file);
}

function displayImagePreview(imageData) {
    console.log('displayImagePreview called');
    const preview = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImageBtn');

    preview.innerHTML = `<img src="${imageData}" alt="Recipe preview">`;
    removeBtn.style.display = 'inline-flex';
    console.log('Image preview displayed');
}

function removeRecipeImage() {
    console.log('removeRecipeImage called');
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
    // Handle add-recipe as modal instead of page navigation
    if (page === 'add-recipe') {
        openRecipeEditorModal();
        return;
    }

    state.currentPage = page;

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
    document.body.classList.add('mobile-menu-open');
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    if (mobileMenu) mobileMenu.classList.remove('active');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
    if (hamburgerBtn) hamburgerBtn.classList.remove('active');
    document.body.classList.remove('mobile-menu-open');
}

// ===== Search Functionality =====
function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    state.currentFilter = query;
    renderRecipes();
}

function handleSearchClick() {
    if (!state.searchActive) {
        activateSearch();
    }
    navigateTo('home');
}

function activateSearch() {
    state.searchActive = true;

    const searchSection = document.getElementById('searchSection');
    searchSection.classList.add('compact');

    renderRecipes();
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

    if (state.recipes.length === 0) {
        document.getElementById('emptyState').classList.add('visible');
    } else {
        renderRecipes();
    }
    updateFavoritesButton();
}

function renderRecipes() {
    const container = document.getElementById('resultsContainer');
    const emptyState = document.getElementById('emptyState');

    const filteredRecipes = getFilteredRecipes();

    container.innerHTML = '';

    if (filteredRecipes.length === 0) {
        emptyState.classList.add('visible');
        container.style.display = 'none';
    } else {
        emptyState.classList.remove('visible');
        container.style.display = 'grid';

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
    card.onclick = () => openSidePanel(recipe);

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

                // Ensure search is active
                if (!state.searchActive) {
                    activateSearch();
                }

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
        bodyHTML += `<img src="${recipe.image}" alt="${recipe.name}" class="modal-image">`;
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

            // Ensure search is active
            if (!state.searchActive) {
                activateSearch();
            }

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

    modal.classList.add('visible');
    document.body.classList.add('modal-open'); // Prevent body scroll on mobile
}

function closeModal() {
    const modal = document.getElementById('recipeModal');
    if (modal) {
        modal.classList.remove('visible');
    } else {
        console.warn('closeModal: recipeModal element not found');
    }
    document.body.classList.remove('modal-open'); // Re-enable body scroll
    state.currentRecipe = null;
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
    console.log('resetRecipeForm called');
    document.getElementById('recipeFormTitle').textContent = 'Add New Recipe';
    document.getElementById('recipeId').value = '';
    document.getElementById('recipeName').value = '';
    document.getElementById('prepTime').value = '';
    document.getElementById('cookTime').value = '';
    document.getElementById('servings').value = '';
    document.getElementById('selectedTags').innerHTML = '';

    // Clear rich text editors
    console.log('Clearing rich text editors...');
    setEditorContent('ingredients', []);
    setEditorContent('instructions', []);
    setEditorContent('notes', '');

    state.currentRecipe = null;
    state.currentImageData = null;
    removeRecipeImage();
    console.log('Recipe form reset complete');
}

function loadRecipeForEdit(recipe) {
    console.log('loadRecipeForEdit called for recipe:', recipe.name, '(ID:', recipe.id + ')');
    document.getElementById('recipeFormTitle').textContent = 'Edit Recipe';
    document.getElementById('recipeId').value = recipe.id;
    document.getElementById('recipeName').value = recipe.name;
    document.getElementById('prepTime').value = recipe.prepTime || '';
    document.getElementById('cookTime').value = recipe.cookTime || '';
    document.getElementById('servings').value = recipe.servings || '';

    // Set rich text editor content
    console.log('Loading rich text editors with recipe data...');
    console.log('- Ingredients count:', recipe.ingredients?.length || 0);
    console.log('- Instructions count:', recipe.instructions?.length || 0);
    setEditorContent('ingredients', recipe.ingredients || []);
    setEditorContent('instructions', recipe.instructions || []);
    setEditorContent('notes', recipe.notes || '');

    // Set tags
    const selectedTagsContainer = document.getElementById('selectedTags');
    selectedTagsContainer.innerHTML = '';
    console.log('Loading tags:', recipe.tags);
    if (recipe.tags) {
        recipe.tags.forEach(tagName => {
            addSelectedTag(tagName);
        });
    }

    // Set image
    if (recipe.image) {
        console.log('Recipe has image, displaying preview');
        state.currentImageData = recipe.image;
        displayImagePreview(recipe.image);
    } else {
        console.log('Recipe has no image');
        removeRecipeImage();
    }

    state.currentRecipe = recipe;
    console.log('Recipe loaded for edit successfully');
}

function handleRecipeSubmit(e) {
    console.log('handleRecipeSubmit called');
    e.preventDefault();

    const id = document.getElementById('recipeId').value || generateId();
    const name = document.getElementById('recipeName').value.trim();
    const prepTime = document.getElementById('prepTime').value.trim();
    const cookTime = document.getElementById('cookTime').value.trim();
    const servingsInput = document.getElementById('servings').value;
    const servings = servingsInput ? parseInt(servingsInput) : null;

    console.log('Form data collected:', { id, name, prepTime, cookTime, servings });

    // Get content from rich text editors
    console.log('Getting editor content...');
    const ingredients = getEditorContent('ingredients');
    const instructions = getEditorContent('instructions');
    const notesEditor = document.getElementById('notes');
    const notes = notesEditor.innerHTML.trim() === '' || notesEditor.innerHTML.trim() === '<br>'
        ? ''
        : notesEditor.innerHTML;

    console.log('Editor content retrieved:', {
        ingredientsCount: ingredients.length,
        instructionsCount: instructions.length,
        hasNotes: notes.length > 0
    });

    const tags = Array.from(document.getElementById('selectedTags').children)
        .map(el => el.textContent.replace('×', '').trim())
        .filter(tag => tag.length > 0); // Filter out empty tags

    console.log('Tags:', tags);

    // Validate required fields
    console.log('Validating form data...');
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

    console.log('Validation passed, creating recipe object...');
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
        console.log('Updating existing recipe at index:', existingIndex);
        state.recipes[existingIndex] = recipe;
        showToast('Recipe updated successfully', 'success');
    } else {
        console.log('Adding new recipe');
        state.recipes.unshift(recipe);
        showToast('Recipe added successfully', 'success');
    }

    saveRecipesToStorage();
    closeRecipeEditorModal();

    // Update the view
    if (state.searchActive) {
        renderRecipes();
    } else {
        activateSearch();
        renderRecipes();
    }
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
    console.log('addSelectedTag called with tag:', tagName);
    const container = document.getElementById('selectedTags');

    // Check if already added
    const existing = Array.from(container.children).find(
        el => el.textContent.replace('×', '').trim() === tagName
    );
    if (existing) {
        console.log('Tag already selected:', tagName);
        return;
    }

    const tag = state.tags.find(t => t.name === tagName);
    console.log('Tag object found:', tag);
    const tagEl = document.createElement('div');
    tagEl.className = 'selected-tag';
    tagEl.style.backgroundColor = tag?.color || '#8B5CF6';
    tagEl.innerHTML = `
        ${tagName}
        <button type="button" class="selected-tag-remove">×</button>
    `;

    tagEl.querySelector('.selected-tag-remove').addEventListener('click', () => {
        console.log('Removing tag:', tagName);
        tagEl.remove();
    });

    container.appendChild(tagEl);
    console.log('Tag added to selected tags');
}

// ===== Tags Page =====
function renderTagsPage() {
    const container = document.getElementById('tagsList');
    container.innerHTML = '';

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

    state.tags.push({ name, color, defaultVisible: true });
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

    if (jsonFiles.length === 0) {
        showToast('No valid JSON files found', 'error');
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
                        name: tag,
                        color: generateRandomColor()
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

    // Set message and type
    toast.textContent = message;
    toast.className = `toast ${type} visible`;

    // Auto-dismiss after duration
    toastTimeout = setTimeout(() => {
        toast.classList.remove('visible');

        // Show next toast in queue if any
        setTimeout(() => {
            if (toastQueue.length > 0) {
                const next = toastQueue.shift();
                showToast(next.message, next.type, next.duration);
            }
        }, 300); // Wait for fade out animation
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

// ===== Export Function (for backup) =====
function exportAllRecipes() {
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

// ===== Recipe Editor Modal Management =====
function openRecipeEditorModal(recipeId = null) {
    console.log('openRecipeEditorModal called with recipeId:', recipeId);
    const modal = document.getElementById('recipeEditorModal');
    const title = document.getElementById('recipeFormTitle');

    if (!modal) {
        console.error('Recipe editor modal element not found!');
        return;
    }

    if (recipeId) {
        console.log('Opening modal in edit mode for recipe:', recipeId);
        const recipe = state.recipes.find(r => r.id === recipeId);
        if (recipe) {
            console.log('Recipe found:', recipe.name);
            title.textContent = 'Edit Recipe';
            loadRecipeForEdit(recipe);
        } else {
            console.error('Recipe not found with ID:', recipeId);
        }
    } else {
        console.log('Opening modal in add mode');
        title.textContent = 'Add New Recipe';
        resetRecipeForm();
    }

    modal.classList.add('visible');
    document.body.classList.add('modal-open'); // Prevent body scroll on mobile
    console.log('Modal opened, setting up rich text editors...');
    setupRichTextEditors();
    console.log('Modal setup complete');
}

function closeRecipeEditorModal() {
    console.log('closeRecipeEditorModal called');
    const modal = document.getElementById('recipeEditorModal');
    if (!modal) {
        console.error('Recipe editor modal element not found!');
        return;
    }
    modal.classList.remove('visible');
    document.body.classList.remove('modal-open'); // Re-enable body scroll
    console.log('Resetting recipe form...');
    resetRecipeForm();
    console.log('Modal closed successfully');
}

// ===== Rich Text Editor Setup =====
function setupRichTextEditors() {
    console.log('setupRichTextEditors called');
    // Setup toolbar buttons
    const toolbars = document.querySelectorAll('.rich-text-toolbar');
    console.log('Found', toolbars.length, 'rich text toolbars');

    toolbars.forEach((toolbar, index) => {
        const buttons = toolbar.querySelectorAll('.toolbar-btn');
        const colorPicker = toolbar.querySelector('.color-picker');
        const targetId = toolbar.dataset.target;
        console.log(`Setting up toolbar ${index + 1} for target:`, targetId);

        buttons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const command = btn.dataset.command;
                console.log('Toolbar button clicked, command:', command, 'target:', targetId);

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
                console.log('Color picker changed for', targetId, '- color:', colorPicker.value);
                document.execCommand('foreColor', false, colorPicker.value);
                document.getElementById(targetId).focus();
            };
        }
    });
    console.log('Rich text editors setup complete');
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

    // Update main results if search is active
    if (state.searchActive) {
        renderRecipes();
    }

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

            // Ensure search is active
            if (!state.searchActive) {
                activateSearch();
            }

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
    console.log('getEditorContent called for:', editorId);
    const editor = document.getElementById(editorId);

    if (!editor) {
        console.warn('getEditorContent: Editor element not found:', editorId);
        return [];
    }

    const html = editor.innerHTML.trim();

    if (!html || html === '<br>') {
        console.log('Editor is empty:', editorId);
        return [];
    }

    // Split by <div> or <br> tags and clean up
    const lines = html
        .split(/<div>|<br>/gi)
        .map(line => line.replace(/<\/div>/gi, '').trim())
        .filter(line => line && line !== '<br>');

    console.log('Editor content extracted:', editorId, '- lines:', lines.length);
    return lines;
}

function setEditorContent(editorId, content) {
    console.log('setEditorContent called for:', editorId, 'with content:', Array.isArray(content) ? content.length + ' items' : typeof content);
    const editor = document.getElementById(editorId);

    if (!editor) {
        console.warn('setEditorContent: Editor element not found:', editorId);
        return;
    }

    if (Array.isArray(content)) {
        editor.innerHTML = content
            .map(line => line.includes('<') ? line : `<div>${line}</div>`)
            .join('');
        console.log('Set array content for', editorId);
    } else {
        editor.innerHTML = content || '';
        console.log('Set string content for', editorId);
    }
}

// ===== Side Panel Functions =====
function openSidePanel(recipe) {
    state.currentRecipe = recipe;

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
        contentHTML += `<img src="${recipe.image}" alt="${recipe.name}" class="side-panel-recipe-image">`;
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

            // Ensure search is active
            if (!state.searchActive) {
                activateSearch();
            }

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

    // Show the side panel
    sidePanelOverlay.classList.add('active');
    sidePanel.classList.add('active');
    document.body.classList.add('modal-open'); // Prevent body scroll
}

function closeSidePanel() {
    const sidePanel = document.getElementById('sidePanel');
    const sidePanelOverlay = document.getElementById('sidePanelOverlay');

    if (sidePanel) {
        sidePanel.classList.remove('active');
    }

    if (sidePanelOverlay) {
        sidePanelOverlay.classList.remove('active');
    }

    document.body.classList.remove('modal-open');
    state.currentRecipe = null;
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
    modal.classList.add('visible');
    document.body.classList.add('modal-open');
}

function closeRecipeSelectionModal() {
    const modal = document.getElementById('recipeSelectionModal');
    modal.classList.remove('visible');
    document.body.classList.remove('modal-open');
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
async function importSampleRecipes() {
    const sampleRecipeFiles = [
        'sample-recipes/chocolate-chip-cookies.json',
        'sample-recipes/spaghetti-carbonara.json',
        'sample-recipes/avocado-toast.json'
    ];

    let successCount = 0;
    let errorCount = 0;

    try {
        const importPromises = sampleRecipeFiles.map(async (filePath) => {
            try {
                const response = await fetch(filePath);
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${filePath}`);
                }
                const data = await response.json();
                const recipe = normalizeRecipe(data);

                if (validateRecipe(recipe)) {
                    recipe.id = generateId();
                    recipe.createdAt = new Date().toISOString();
                    recipe.updatedAt = new Date().toISOString();
                    state.recipes.unshift(recipe);
                    successCount++;
                } else {
                    throw new Error('Invalid recipe format');
                }
            } catch (error) {
                console.error(`Error importing ${filePath}:`, error);
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
                            name: tag,
                            color: generateRandomColor()
                        });
                        allTags.add(tag);
                    }
                });
            });
            saveTagsToStorage();

            // Activate search and render recipes
            if (!state.searchActive) {
                activateSearch();
            }
            renderRecipes();

            showToast(
                `Successfully imported ${successCount} sample recipe${successCount > 1 ? 's' : ''}!`,
                'success'
            );
        } else {
            showToast('Failed to import sample recipes', 'error');
        }
    } catch (error) {
        console.error('Error importing sample recipes:', error);
        showToast('Error importing sample recipes', 'error');
    }
}

// Make functions available globally
window.navigateTo = navigateTo;
window.exportAllRecipes = exportAllRecipes;
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
