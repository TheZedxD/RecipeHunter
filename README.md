# Recipe Hunter 🍳

A modern, feature-rich recipe management web application with a beautiful UI inspired by Claude. Organize, search, and manage your recipes with ease.

## Features

### 🎨 Beautiful UI with Multiple Themes
- **Claude Theme** - Default elegant theme
- **Dark Mode** - Easy on the eyes
- **Light Mode** - Clean and bright
- **Forest Theme** - Nature-inspired green tones
- **Ocean Theme** - Calming blue palette
- **Sunset Theme** - Warm orange and red hues

### 🔍 Smart Search & Filtering
- Real-time search across recipe names, ingredients, and tags
- Tag-based filtering with visual indicators
- Search interface that elegantly transitions from center to top-left
- Quick tag buttons for instant filtering
- Favorites view for quick access to favorite recipes

### 📝 Recipe Management
- Add, edit, and delete recipes with rich text editor
- Store prep time, cook time, and servings
- Organize ingredients and step-by-step instructions
- Add custom notes and tips with HTML formatting support
- Tag recipes with custom categories
- Upload recipe images (base64 support)
- Favorite recipes for quick access

### 🏷️ Tag System
- Create custom tags with personalized colors
- View recipe count per tag
- Edit and delete tags
- Tags automatically suggested when adding recipes
- Auto-color generation for new tags

### 📥 Import/Export - **NEW & Enhanced!**
- **Export as Documents (ZIP)** - Download all recipes as beautifully formatted text files
  - Perfect for printing or sharing
  - Clean formatting with no HTML tags
  - Numbered files (001-recipe-name.txt)
  - Includes metadata and timestamps
  - README file included in archive
- **Archive as JSON** - Machine-readable backup format
  - Full data preservation
  - Re-importable format
  - Perfect for backup and transfer
- Import recipes from JSON files
- Batch import multiple recipes at once
- Drag-and-drop or folder upload support
- Smart duplicate detection (won't re-import existing recipes)

### ✨ Sample Recipes - **NEW!**
- **4 recipes loaded automatically on first visit**
  - Chocolate Chip Cookies
  - Avocado Toast
  - Banana Bread
  - Greek Salad
- **"Try Sample Recipes" button loads 3 additional recipes**
  - Spaghetti Carbonara
  - Chicken Stir Fry
  - Beef Tacos
- No duplicates created - smart detection prevents re-importing
- All tags automatically extracted and colored

### 🛒 Shopping List
- Add ingredients from recipes to shopping list
- Create custom shopping list items
- Check off items as you shop
- Clear completed items or entire list

### 💾 Local Storage
- All data stored in browser's local storage
- No server required - works completely offline
- Instant loading and saving
- Warning shown if localStorage unavailable (private mode)

### ⌨️ Keyboard Shortcuts
- `Ctrl/Cmd + F` - Focus search
- `Ctrl/Cmd + N` - Add new recipe
- `Escape` - Close modals/panels
- `?` - Show help modal

### ❓ Help & Tips - **Enhanced!**
- **Non-blocking help modal** - See content behind while reading help
- Keyboard shortcuts reference
- Quick tips for getting started
- Recipe format documentation
- Semi-transparent overlay with backdrop blur

## Getting Started

### Quick Start
1. Open `index.html` in any modern web browser
2. Start adding recipes or import existing ones

### Adding Your First Recipe
1. Click the "Add Recipe" button or navigate using the top menu
2. Fill in the recipe details:
   - **Name** (required)
   - **Prep Time** (e.g., "15 min")
   - **Cook Time** (e.g., "30 min")
   - **Servings** (number)
   - **Ingredients** (one per line)
   - **Instructions** (one step per line)
   - **Tags** (type to see suggestions)
   - **Notes** (any additional tips)
3. Click "Save Recipe"

### Importing Recipes

#### JSON Format
Recipes should be in JSON format:

```json
{
  "name": "Recipe Name",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"],
  "tags": ["tag1", "tag2"],
  "prepTime": "15 min",
  "cookTime": "30 min",
  "servings": 4,
  "notes": "Optional notes"
}
```

#### Import Methods
1. **Drag and Drop**: Drag JSON files directly onto the upload area
2. **Click to Browse**: Click the upload area to select files
3. **Folder Upload**: Select multiple files or entire folders

### Sample Recipes
The `sample-recipes` folder contains 7 example recipes to get you started:
- Classic Chocolate Chip Cookies
- Spaghetti Carbonara
- Perfect Avocado Toast
- Moist Banana Bread
- Greek Salad
- Chicken Stir Fry
- Beef Tacos

**Note:** 4 recipes load automatically on your first visit. Click "Try Sample Recipes" to load all 7.

## Usage Tips

### Search
- Type in the search bar to filter recipes by name, ingredients, or tags
- Press Enter or click the search button to activate
- Clear the search to see all recipes again

### Tags
- Click quick tags below the search bar to filter by category
- Click again to remove the filter
- Combine multiple tag filters to narrow results
- Manage tags from the Tags page

### Themes
- Hover over the theme button (top-right) to see all available themes
- Click any theme to switch instantly
- Your theme preference is saved automatically

### Organizing Recipes
- Use consistent tag names (e.g., "Breakfast", "Lunch", "Dinner")
- Add preparation and cooking times for easy planning
- Use the notes field for substitutions, tips, or variations
- Keep ingredients and instructions clear and concise

### Backup Your Recipes

#### Method 1: Export as Documents (ZIP)
1. Navigate to the "Data" page
2. Click "Export as Documents (ZIP)"
3. Download contains all recipes as formatted text files
4. Perfect for printing or sharing

#### Method 2: Archive as JSON
1. Navigate to the "Data" page
2. Click "Archive as JSON"
3. Download contains all recipes as JSON
4. Use this format to re-import recipes later

#### Method 3: Browser Console (Legacy)
Open browser console and run:
```javascript
exportAllRecipes()
```
This will download all your recipes as a JSON file.

## Technical Details

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Technologies Used
- Pure HTML5
- CSS3 with CSS Variables for theming
- Vanilla JavaScript (ES6+)
- Local Storage API
- File API for imports

### File Structure
```
RecipeHunter/
├── index.html                      # Main application page
├── styles.css                      # All styles and theme definitions
├── app.js                          # Application logic
├── README.md                       # This file
├── CHANGELOG.md                    # Version history and release notes
├── TEST_REPORT.md                  # Comprehensive test report
├── CHANGES_DOCUMENTATION.md        # Detailed change tracking
├── *.backup                        # Backup files for rollback
└── sample-recipes/                 # Sample recipe files (7 total)
    ├── chocolate-chip-cookies.json
    ├── spaghetti-carbonara.json
    ├── avocado-toast.json
    ├── banana-bread.json
    ├── greek-salad.json
    ├── chicken-stir-fry.json
    └── beef-tacos.json
```

### Data Storage
All data is stored in the browser's `localStorage`:
- `recipes` - Array of all recipe objects
- `tags` - Array of tag objects with names and colors
- `theme` - Current theme preference

### No Server Required
This is a completely client-side application. No server, database, or backend required. All data is stored locally in your browser.

## Keyboard Shortcuts
- `Enter` in search bar - Activate search
- `Escape` in modal - Close modal
- `Enter` in new tag input - Add tag

## Privacy & Security
- All data stays on your device
- No external connections or tracking
- No cookies or analytics
- Complete privacy and control over your recipes

## Customization

### Adding New Themes
Edit `styles.css` and add a new theme block:

```css
[data-theme="mytheme"] {
    --bg-primary: #yourcolor;
    --text-primary: #yourcolor;
    /* ... other variables */
}
```

Then add the theme option to `index.html` in the theme dropdown.

### Modifying Default Tags
Edit the default tags in `app.js` in the `loadDataFromStorage()` function.

## Troubleshooting

### Recipes Not Saving
- Check if browser has localStorage enabled
- Ensure you're not in private/incognito mode
- Check browser storage quota

### Import Not Working
- Verify JSON file format is correct
- Check browser console for error messages
- Ensure files are valid JSON

### Search Not Working
- Click the search button or press Enter to activate
- Try clearing filters and searching again

## Future Enhancements
- Recipe ratings and favorites
- Print-friendly recipe cards
- Meal planning calendar
- Shopping list generation
- Recipe sharing via export links
- Image uploads for recipes
- Nutritional information
- Serving size calculator

## License
This project is open source and available for personal and commercial use.

## Testing & Quality Assurance

### Comprehensive Testing Performed
Recipe Hunter has undergone extensive testing to ensure quality and reliability:

- ✅ **38 test cases** covering all major features
- ✅ **Sample recipes** - Verified loading, duplicate detection, tag extraction
- ✅ **Export features** - Both ZIP and JSON exports tested
- ✅ **Help modal** - All interaction methods verified
- ✅ **UI/UX** - Button states, loading indicators, error handling
- ✅ **Performance** - Load times, animations, memory usage analyzed
- ✅ **Accessibility** - Keyboard navigation, screen readers, ARIA labels

**Test Results:** All tests passed (38/38) ✅

For detailed test results, see [TEST_REPORT.md](TEST_REPORT.md)

### Documentation
- **TEST_REPORT.md** - Comprehensive test report with results
- **CHANGES_DOCUMENTATION.md** - Detailed change tracking
- **CHANGELOG.md** - Version history and release notes

### Rollback & Safety
Backup files are provided for safe rollback:
- `app.js.backup` - Original JavaScript file
- `styles.css.backup` - Original CSS file
- `index.html.backup` - Original HTML file

To rollback: `cp *.backup <original-filename>`

## Support
For issues or questions:
1. Check [TEST_REPORT.md](TEST_REPORT.md) for known issues
2. Review [CHANGELOG.md](CHANGELOG.md) for recent changes
3. Check browser console for error messages
4. Ensure you're using a modern browser with localStorage enabled

---

## Mobile Testing Checklist

### iOS Safari
- [ ] Recipe creation and editing works
- [ ] localStorage persists (not in private mode)
- [ ] Images upload and compress correctly
- [ ] Touch gestures work (long-press, tap, swipe)
- [ ] Safe area insets respected
- [ ] Keyboard doesn't break layout
- [ ] Modals scroll correctly
- [ ] No zoom on input focus

### iOS Chrome
- [ ] All iOS Safari tests
- [ ] Viewport height handles correctly

### Android Chrome
- [ ] Recipe CRUD operations work
- [ ] Address bar hide/show doesn't break layout
- [ ] Back button behavior correct
- [ ] File uploads work
- [ ] Touch feedback responsive

### Android Firefox
- [ ] All Android Chrome tests
- [ ] Rich text editor works

### Landscape Mode (All)
- [ ] Layout adapts correctly
- [ ] Modals don't overflow
- [ ] Navigation accessible
- [ ] FAB positioned correctly

### Offline Mode
- [ ] App loads without internet
- [ ] Data persists
- [ ] Warning shown when offline
- [ ] Sync works when reconnected

### Accessibility
- [ ] Touch targets minimum 44x44px
- [ ] Screen reader navigation works
- [ ] Skip-to-content link functional
- [ ] Keyboard navigation complete
- [ ] Focus indicators visible
- [ ] ARIA labels present on icon buttons

---

**Enjoy organizing your recipes! Happy cooking! 🍳👨‍🍳👩‍🍳**
