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

### 📝 Recipe Management
- Add, edit, and delete recipes
- Store prep time, cook time, and servings
- Organize ingredients and step-by-step instructions
- Add custom notes and tips
- Tag recipes with custom categories

### 🏷️ Tag System
- Create custom tags with personalized colors
- View recipe count per tag
- Edit and delete tags
- Tags automatically suggested when adding recipes

### 📥 Import/Export
- Import recipes from JSON files
- Batch import multiple recipes at once
- Drag-and-drop or folder upload support
- Export all recipes for backup

### 💾 Local Storage
- All data stored in browser's local storage
- No server required - works completely offline
- Instant loading and saving

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
The `sample-recipes` folder contains example recipes to get you started:
- Classic Chocolate Chip Cookies
- Spaghetti Carbonara
- Perfect Avocado Toast

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
├── index.html          # Main application page
├── styles.css          # All styles and theme definitions
├── app.js             # Application logic
├── README.md          # This file
└── sample-recipes/    # Sample recipe files
    ├── chocolate-chip-cookies.json
    ├── spaghetti-carbonara.json
    └── avocado-toast.json
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

## Support
For issues or questions, please check the browser console for error messages and ensure you're using a modern browser with localStorage enabled.

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
