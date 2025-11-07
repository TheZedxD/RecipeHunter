// Recipe Hunter - Main Application JavaScript

// ===== State Management =====
const state = {
    recipes: [],
    tags: [],
    currentRecipe: null,
    searchActive: false,
    currentFilter: '',
    selectedTags: new Set(),
    currentPage: 'home'
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    loadDataFromStorage();
    setupEventListeners();
    applyTheme();
    renderInitialView();
}

// ===== Local Storage Management =====
function loadDataFromStorage() {
    const storedRecipes = localStorage.getItem('recipes');
    const storedTags = localStorage.getItem('tags');

    if (storedRecipes) {
        try {
            state.recipes = JSON.parse(storedRecipes);
        } catch (e) {
            console.error('Error loading recipes:', e);
            state.recipes = [];
        }
    }

    if (storedTags) {
        try {
            state.tags = JSON.parse(storedTags);
        } catch (e) {
            console.error('Error loading tags:', e);
            state.tags = [];
        }
    }

    // Add default tags if none exist
    if (state.tags.length === 0) {
        state.tags = [
            { name: 'Breakfast', color: '#F59E0B' },
            { name: 'Lunch', color: '#10B981' },
            { name: 'Dinner', color: '#3B82F6' },
            { name: 'Dessert', color: '#EC4899' },
            { name: 'Vegetarian', color: '#059669' },
            { name: 'Quick', color: '#8B5CF6' }
        ];
        saveTagsToStorage();
    }
}

function saveRecipesToStorage() {
    localStorage.setItem('recipes', JSON.stringify(state.recipes));
}

function saveTagsToStorage() {
    localStorage.setItem('tags', JSON.stringify(state.tags));
}

// ===== Event Listeners Setup =====
function setupEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);
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

    // Theme switching
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const theme = e.currentTarget.dataset.theme;
            setTheme(theme);
        });
    });

    // Recipe Form
    document.getElementById('recipeForm').addEventListener('submit', handleRecipeSubmit);
    document.getElementById('cancelBtn').addEventListener('click', () => navigateTo('home'));

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

    // Modal
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('recipeModal').addEventListener('click', (e) => {
        if (e.target.id === 'recipeModal') closeModal();
    });
    document.getElementById('editRecipeBtn').addEventListener('click', handleEditRecipe);
    document.getElementById('deleteRecipeBtn').addEventListener('click', handleDeleteRecipe);
}

function setupImportListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
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
    });

    fileInput.addEventListener('change', (e) => {
        handleFilesDrop(e.target.files);
    });
}

// ===== Theme Management =====
function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('theme', themeName);
    showToast(`Theme changed to ${themeName}`, 'success');
}

function applyTheme() {
    const savedTheme = localStorage.getItem('theme') || 'claude';
    document.body.setAttribute('data-theme', savedTheme);
}

// ===== Navigation =====
function navigateTo(page) {
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
        case 'add-recipe':
            resetRecipeForm();
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
    container.innerHTML = '';

    state.tags.forEach(tag => {
        const tagEl = document.createElement('div');
        tagEl.className = 'tag';
        tagEl.textContent = tag.name;
        tagEl.style.backgroundColor = tag.color + '20';
        tagEl.style.borderColor = tag.color;
        tagEl.style.color = tag.color;

        if (state.selectedTags.has(tag.name)) {
            tagEl.classList.add('selected');
            tagEl.style.backgroundColor = tag.color;
            tagEl.style.color = 'white';
        }

        tagEl.addEventListener('click', () => toggleTagFilter(tag.name));
        container.appendChild(tagEl);
    });
}

function toggleTagFilter(tagName) {
    if (state.selectedTags.has(tagName)) {
        state.selectedTags.delete(tagName);
    } else {
        state.selectedTags.add(tagName);
    }

    renderQuickTags();
    renderRecipes();
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
    if (state.currentFilter) {
        filtered = filtered.filter(recipe => {
            const searchText = state.currentFilter.toLowerCase();
            return (
                recipe.name.toLowerCase().includes(searchText) ||
                recipe.ingredients.some(ing => ing.toLowerCase().includes(searchText)) ||
                recipe.tags.some(tag => tag.toLowerCase().includes(searchText)) ||
                (recipe.notes && recipe.notes.toLowerCase().includes(searchText))
            );
        });
    }

    // Apply tag filter
    if (state.selectedTags.size > 0) {
        filtered = filtered.filter(recipe => {
            return recipe.tags.some(tag => state.selectedTags.has(tag));
        });
    }

    return filtered;
}

function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.onclick = () => openRecipeModal(recipe);

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

// ===== Recipe Modal =====
function openRecipeModal(recipe) {
    state.currentRecipe = recipe;

    const modal = document.getElementById('recipeModal');
    const modalName = document.getElementById('modalRecipeName');
    const modalBody = document.getElementById('modalBody');

    modalName.textContent = recipe.name;

    let bodyHTML = '';

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

    // Tags
    if (recipe.tags && recipe.tags.length > 0) {
        bodyHTML += '<div class="modal-section">';
        bodyHTML += '<h3>Tags</h3>';
        bodyHTML += '<div class="recipe-card-tags">';
        recipe.tags.forEach(tagName => {
            const tag = state.tags.find(t => t.name === tagName);
            const style = tag ? `style="background-color: ${tag.color}30; color: ${tag.color};"` : '';
            bodyHTML += `<span class="recipe-card-tag" ${style}>${tagName}</span>`;
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
    modal.classList.add('visible');
}

function closeModal() {
    document.getElementById('recipeModal').classList.remove('visible');
    state.currentRecipe = null;
}

function handleEditRecipe() {
    if (state.currentRecipe) {
        closeModal();
        loadRecipeForEdit(state.currentRecipe);
        navigateTo('add-recipe');
    }
}

function handleDeleteRecipe() {
    if (state.currentRecipe && confirm(`Are you sure you want to delete "${state.currentRecipe.name}"?`)) {
        const index = state.recipes.findIndex(r => r.id === state.currentRecipe.id);
        if (index !== -1) {
            state.recipes.splice(index, 1);
            saveRecipesToStorage();
            closeModal();
            renderRecipes();
            showToast('Recipe deleted successfully', 'success');
        }
    }
}

// ===== Recipe Form =====
function resetRecipeForm() {
    document.getElementById('recipeFormTitle').textContent = 'Add New Recipe';
    document.getElementById('recipeForm').reset();
    document.getElementById('recipeId').value = '';
    document.getElementById('selectedTags').innerHTML = '';
    state.currentRecipe = null;
}

function loadRecipeForEdit(recipe) {
    document.getElementById('recipeFormTitle').textContent = 'Edit Recipe';
    document.getElementById('recipeId').value = recipe.id;
    document.getElementById('recipeName').value = recipe.name;
    document.getElementById('prepTime').value = recipe.prepTime || '';
    document.getElementById('cookTime').value = recipe.cookTime || '';
    document.getElementById('servings').value = recipe.servings || '';
    document.getElementById('ingredients').value = recipe.ingredients.join('\n');
    document.getElementById('instructions').value = recipe.instructions.join('\n');
    document.getElementById('notes').value = recipe.notes || '';

    // Set tags
    const selectedTagsContainer = document.getElementById('selectedTags');
    selectedTagsContainer.innerHTML = '';
    recipe.tags.forEach(tagName => {
        addSelectedTag(tagName);
    });

    state.currentRecipe = recipe;
}

function handleRecipeSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('recipeId').value || generateId();
    const name = document.getElementById('recipeName').value.trim();
    const prepTime = document.getElementById('prepTime').value.trim();
    const cookTime = document.getElementById('cookTime').value.trim();
    const servings = parseInt(document.getElementById('servings').value) || null;
    const ingredients = document.getElementById('ingredients').value
        .split('\n')
        .map(i => i.trim())
        .filter(i => i.length > 0);
    const instructions = document.getElementById('instructions').value
        .split('\n')
        .map(i => i.trim())
        .filter(i => i.length > 0);
    const notes = document.getElementById('notes').value.trim();

    const tags = Array.from(document.getElementById('selectedTags').children)
        .map(el => el.textContent.replace('×', '').trim());

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
    navigateTo('home');
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
            <div class="tag-item-count">${count} recipe${count !== 1 ? 's' : ''}</div>
            <button class="tag-item-delete">×</button>
        `;

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

    state.tags.push({ name, color });
    saveTagsToStorage();
    renderTagsPage();
    renderQuickTags();

    nameInput.value = '';
    colorInput.value = '#8B5CF6';

    showToast('Tag added successfully', 'success');
}

function deleteTag(tagName) {
    if (confirm(`Delete tag "${tagName}"? It will be removed from all recipes.`)) {
        state.tags = state.tags.filter(t => t.name !== tagName);

        // Remove tag from all recipes
        state.recipes.forEach(recipe => {
            recipe.tags = recipe.tags.filter(t => t !== tagName);
        });

        saveTagsToStorage();
        saveRecipesToStorage();
        renderTagsPage();
        renderQuickTags();

        showToast('Tag deleted successfully', 'success');
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
        instructions: Array.isArray(data.instructions) ? data.instructions :
                     Array.isArray(data.steps) ? data.steps : [],
        tags: Array.isArray(data.tags) ? data.tags :
              Array.isArray(data.categories) ? data.categories : [],
        prepTime: data.prepTime || data.prep_time || '',
        cookTime: data.cookTime || data.cook_time || '',
        servings: data.servings || null,
        notes: data.notes || data.description || ''
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

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} visible`;

    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
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

// Make navigateTo available globally for inline onclick handlers
window.navigateTo = navigateTo;
window.exportAllRecipes = exportAllRecipes;
