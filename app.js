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
    currentRecipe: null,
    searchActive: false,
    currentFilter: '',
    selectedTags: new Set(),
    currentPage: 'home',
    currentImageData: null,
    isMobile: isMobile(),
    isIOS: isIOS(),
    isTouchDevice: isTouchDevice(),
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

// ===== Event Listeners Setup =====
function setupEventListeners() {
    // Search (handled by setupRealTimeSearch)
    document.getElementById('searchBtn').addEventListener('click', handleSearchClick);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearchClick();
    });

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            navigateTo(page);
        });
    });

    // Preferences Modal
    const preferencesBtn = document.getElementById('preferencesBtn');
    const preferencesModal = document.getElementById('preferencesModal');
    const preferencesClose = document.getElementById('preferencesClose');

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

    // Theme switching
    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const theme = e.currentTarget.dataset.theme;
            setTheme(theme);
            updateActiveThemeCard();
        });
    });

    // Recipe Form
    document.getElementById('recipeForm').addEventListener('submit', handleRecipeSubmit);
    document.getElementById('cancelBtn').addEventListener('click', closeRecipeEditorModal);

    // Tag Management
    document.getElementById('addTagBtn').addEventListener('click', handleAddTag);
    document.getElementById('newTagInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddTag();
    });

    // Recipe Tags Input
    const tagsInput = document.getElementById('recipeTagsInput');
    tagsInput.addEventListener('input', handleTagsInput);
    tagsInput.addEventListener('focus', showTagsSuggestions);
    tagsInput.addEventListener('blur', () => {
        setTimeout(() => hideTagsSuggestions(), 200);
    });

    // Import
    setupImportListeners();

    // Image Upload
    setupImageUploadListeners();

    // Recipe Detail Modal
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('recipeModal').addEventListener('click', (e) => {
        if (e.target.id === 'recipeModal') closeModal();
    });
    document.getElementById('editRecipeBtn').addEventListener('click', handleEditRecipe);
    document.getElementById('deleteRecipeBtn').addEventListener('click', handleDeleteRecipe);

    // Recipe Editor Modal
    document.getElementById('recipeEditorClose').addEventListener('click', closeRecipeEditorModal);
    document.getElementById('recipeEditorModal').addEventListener('click', (e) => {
        if (e.target.id === 'recipeEditorModal') closeRecipeEditorModal();
    });

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
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size must be less than 5MB', 'error');
        return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        state.currentImageData = e.target.result;
        displayImagePreview(state.currentImageData);
        showToast('Image uploaded successfully', 'success');
    };

    reader.onerror = () => {
        showToast('Error reading image file', 'error');
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
    // Handle add-recipe as modal instead of page navigation
    if (page === 'add-recipe') {
        openRecipeEditorModal();
        return;
    }

    state.currentPage = page;

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === page + 'Page');
    });

    // Show header and content if not visible
    if (!state.searchActive && page !== 'home') {
        activateSearch();
    }

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
    }
}

// ===== Search Functionality =====
function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    state.currentFilter = query;

    if (state.searchActive) {
        renderRecipes();
    }
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
    const header = document.getElementById('header');
    const contentArea = document.getElementById('contentArea');

    searchSection.classList.add('compact');
    header.classList.add('visible');
    contentArea.classList.add('visible');

    renderQuickTags();
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

// ===== Recipe Rendering =====
function renderInitialView() {
    if (state.recipes.length === 0) {
        document.getElementById('emptyState').classList.add('visible');
    } else {
        renderQuickTags();
    }
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
}

function getFilteredRecipes() {
    let filtered = [...state.recipes];

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

    return filtered;
}

function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.dataset.recipeId = recipe.id; // Add recipe ID for touch handlers
    card.onclick = () => openRecipeModal(recipe);

    // Add right-click context menu (only for non-touch devices)
    if (!state.isTouchDevice) {
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e, recipe);
        });
    }

    // Add image if exists
    if (recipe.image) {
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

    modal.classList.add('visible');
    document.body.classList.add('modal-open'); // Prevent body scroll on mobile
}

function closeModal() {
    document.getElementById('recipeModal').classList.remove('visible');
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
        showToast('Recipe name is required', 'error');
        document.getElementById('recipeName').focus();
        return;
    }

    if (name.length > 200) {
        showToast('Recipe name is too long (max 200 characters)', 'error');
        document.getElementById('recipeName').focus();
        return;
    }

    if (ingredients.length === 0) {
        showToast('At least one ingredient is required', 'error');
        document.getElementById('ingredients').focus();
        return;
    }

    if (instructions.length === 0) {
        showToast('At least one instruction is required', 'error');
        document.getElementById('instructions').focus();
        return;
    }

    // Validate servings if provided
    if (servings !== null && (servings < 1 || servings > 1000 || isNaN(servings))) {
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
        createdAt: state.currentRecipe?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const existingIndex = state.recipes.findIndex(r => r.id === id);
    if (existingIndex !== -1) {
        state.recipes[existingIndex] = recipe;
        showToast('Recipe updated successfully', 'success');
    } else {
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
    const container = document.getElementById('selectedTags');

    // Check if already added
    const existing = Array.from(container.children).find(
        el => el.textContent.replace('×', '').trim() === tagName
    );
    if (existing) return;

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
        image: data.image || null
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
    const modal = document.getElementById('recipeEditorModal');
    const title = document.getElementById('recipeFormTitle');

    if (recipeId) {
        const recipe = state.recipes.find(r => r.id === recipeId);
        if (recipe) {
            title.textContent = 'Edit Recipe';
            loadRecipeForEdit(recipe);
        }
    } else {
        title.textContent = 'Add New Recipe';
        resetRecipeForm();
    }

    modal.classList.add('visible');
    document.body.classList.add('modal-open'); // Prevent body scroll on mobile
    setupRichTextEditors();
}

function closeRecipeEditorModal() {
    const modal = document.getElementById('recipeEditorModal');
    modal.classList.remove('visible');
    document.body.classList.remove('modal-open'); // Re-enable body scroll
    resetRecipeForm();
}

// ===== Rich Text Editor Setup =====
function setupRichTextEditors() {
    // Setup toolbar buttons
    const toolbars = document.querySelectorAll('.rich-text-toolbar');

    toolbars.forEach(toolbar => {
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
                openRecipeModal(recipe);
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
    const editor = document.getElementById(editorId);
    const html = editor.innerHTML.trim();

    if (!html || html === '<br>') {
        return [];
    }

    // Split by <div> or <br> tags and clean up
    return html
        .split(/<div>|<br>/gi)
        .map(line => line.replace(/<\/div>/gi, '').trim())
        .filter(line => line && line !== '<br>');
}

function setEditorContent(editorId, content) {
    const editor = document.getElementById(editorId);

    if (Array.isArray(content)) {
        editor.innerHTML = content
            .map(line => line.includes('<') ? line : `<div>${line}</div>`)
            .join('');
    } else {
        editor.innerHTML = content || '';
    }
}

// Make functions available globally
window.navigateTo = navigateTo;
window.exportAllRecipes = exportAllRecipes;
window.openRecipeEditorModal = openRecipeEditorModal;
window.closeRecipeEditorModal = closeRecipeEditorModal;
