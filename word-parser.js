/**
 * Word Document Parser for Recipe Import
 *
 * This module provides intelligent parsing of Word documents (.docx) to extract recipe information.
 * It uses multiple heuristics to identify titles, ingredients, instructions, and images.
 */

const WordRecipeParser = {
    /**
     * Main parsing function for Word documents
     * @param {File} file - The Word document file
     * @returns {Promise<Object>} Parsed recipe data with confidence scores
     */
    async parseWordDocument(file) {
        try {
            // Convert Word document to HTML using mammoth.js
            const arrayBuffer = await this.readFileAsArrayBuffer(file);

            const result = await mammoth.convertToHtml(
                { arrayBuffer },
                {
                    convertImage: mammoth.images.imgElement((image) => {
                        return image.read("base64").then((imageBuffer) => {
                            return {
                                src: `data:${image.contentType};base64,${imageBuffer}`
                            };
                        });
                    })
                }
            );

            const htmlContent = result.value;
            const messages = result.messages;

            // Create a DOM parser to analyze the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');

            // Extract images
            const images = this.extractImages(doc);

            // Parse the document structure
            const parsedData = this.parseDocumentStructure(doc);

            // Calculate confidence scores
            const confidence = this.calculateConfidence(parsedData);

            return {
                success: true,
                recipe: {
                    name: parsedData.title,
                    ingredients: parsedData.ingredients,
                    instructions: parsedData.instructions,
                    notes: parsedData.notes,
                    prepTime: parsedData.prepTime,
                    cookTime: parsedData.cookTime,
                    servings: parsedData.servings,
                    images: images
                },
                confidence: confidence,
                rawHtml: htmlContent,
                parseMessages: messages,
                sections: parsedData.sections // For debugging/verification UI
            };

        } catch (error) {
            console.error('Error parsing Word document:', error);
            return {
                success: false,
                error: error.message,
                recipe: null
            };
        }
    },

    /**
     * Read file as ArrayBuffer for mammoth.js
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Extract images from parsed document
     */
    extractImages(doc) {
        const images = [];
        const imgElements = doc.querySelectorAll('img');

        imgElements.forEach((img) => {
            const src = img.getAttribute('src');
            if (src && src.startsWith('data:')) {
                images.push(src);
            }
        });

        return images;
    },

    /**
     * Parse document structure using multiple heuristics
     */
    parseDocumentStructure(doc) {
        const allElements = doc.body.children;
        const elements = Array.from(allElements);

        // Detect title
        const title = this.detectTitle(elements);

        // Split document into sections
        const sections = this.detectSections(elements);

        // Detect ingredients
        const ingredients = this.detectIngredients(sections, elements);

        // Detect instructions
        const instructions = this.detectInstructions(sections, elements);

        // Detect metadata (prep time, cook time, servings)
        const metadata = this.detectMetadata(elements);

        // Detect notes
        const notes = this.detectNotes(sections, elements);

        return {
            title: title || 'Untitled Recipe',
            ingredients: ingredients,
            instructions: instructions,
            notes: notes,
            prepTime: metadata.prepTime,
            cookTime: metadata.cookTime,
            servings: metadata.servings,
            sections: sections
        };
    },

    /**
     * Detect recipe title using multiple heuristics
     */
    detectTitle(elements) {
        // Heuristic 1: Look for headings (h1, h2, h3)
        for (let i = 0; i < Math.min(5, elements.length); i++) {
            const elem = elements[i];
            if (['H1', 'H2', 'H3'].includes(elem.tagName)) {
                const text = elem.textContent.trim();
                if (text.length > 0 && text.length < 200) {
                    return text;
                }
            }
        }

        // Heuristic 2: Look for bold text in first few paragraphs
        for (let i = 0; i < Math.min(5, elements.length); i++) {
            const elem = elements[i];
            if (elem.tagName === 'P') {
                const strong = elem.querySelector('strong');
                if (strong) {
                    const text = strong.textContent.trim();
                    if (text.length > 0 && text.length < 200) {
                        // Check if it's the majority of the paragraph
                        const totalText = elem.textContent.trim();
                        if (text.length > totalText.length * 0.7) {
                            return text;
                        }
                    }
                }
            }
        }

        // Heuristic 3: Look for centered text at the top
        for (let i = 0; i < Math.min(5, elements.length); i++) {
            const elem = elements[i];
            const style = elem.getAttribute('style') || '';
            if (style.includes('text-align:center') || style.includes('text-align: center')) {
                const text = elem.textContent.trim();
                if (text.length > 0 && text.length < 200) {
                    return text;
                }
            }
        }

        // Heuristic 4: First non-empty paragraph (if short enough to be a title)
        for (let i = 0; i < Math.min(3, elements.length); i++) {
            const elem = elements[i];
            const text = elem.textContent.trim();
            if (text.length > 0 && text.length < 100) {
                return text;
            }
        }

        return null;
    },

    /**
     * Detect sections in the document (ingredients, instructions, etc.)
     */
    detectSections(elements) {
        const sections = [];
        const sectionKeywords = {
            ingredients: ['ingredient', 'what you need', 'you will need', 'materials', 'items needed'],
            instructions: ['instruction', 'direction', 'method', 'step', 'how to', 'preparation', 'procedure'],
            notes: ['note', 'tip', 'hint', 'suggestion', 'variation'],
            metadata: ['prep time', 'cook time', 'total time', 'serving', 'yield', 'makes']
        };

        elements.forEach((elem, index) => {
            const text = elem.textContent.trim().toLowerCase();

            // Check if this element is a section header
            for (const [sectionType, keywords] of Object.entries(sectionKeywords)) {
                for (const keyword of keywords) {
                    if (text.includes(keyword) && text.length < 100) {
                        // Likely a section header
                        sections.push({
                            type: sectionType,
                            startIndex: index,
                            headerText: elem.textContent.trim(),
                            element: elem
                        });
                        break;
                    }
                }
            }
        });

        // Add end indices
        for (let i = 0; i < sections.length; i++) {
            if (i < sections.length - 1) {
                sections[i].endIndex = sections[i + 1].startIndex;
            } else {
                sections[i].endIndex = elements.length;
            }
        }

        return sections;
    },

    /**
     * Detect ingredients using multiple heuristics
     */
    detectIngredients(sections, elements) {
        const ingredients = [];

        // Strategy 1: Use detected ingredients section
        const ingredientSection = sections.find(s => s.type === 'ingredients');
        if (ingredientSection) {
            const sectionElements = elements.slice(ingredientSection.startIndex + 1, ingredientSection.endIndex);
            return this.extractListItems(sectionElements);
        }

        // Strategy 2: Look for lists with measurement patterns
        const lists = elements.filter(e => e.tagName === 'UL' || e.tagName === 'OL');
        for (const list of lists) {
            const items = this.extractListItems([list]);

            // Check if items look like ingredients (contain measurements)
            const measurementCount = items.filter(item =>
                this.containsMeasurement(item)
            ).length;

            if (measurementCount > items.length * 0.5) {
                return items;
            }
        }

        // Strategy 3: Look for bullet-like patterns in paragraphs
        const bulletPatterns = /^[\u2022\u25E6\u2023\u2043\u2219\-\*•○●]\s/;
        for (const elem of elements) {
            if (elem.tagName === 'P') {
                const text = elem.textContent.trim();
                if (bulletPatterns.test(text) && this.containsMeasurement(text)) {
                    ingredients.push(text.replace(bulletPatterns, '').trim());
                }
            }
        }

        if (ingredients.length > 0) {
            return ingredients;
        }

        // Strategy 4: Look for lines with measurements before instructions
        const instructionsSection = sections.find(s => s.type === 'instructions');
        const endIndex = instructionsSection ? instructionsSection.startIndex : elements.length;

        for (let i = 0; i < endIndex; i++) {
            const elem = elements[i];
            const text = elem.textContent.trim();

            if (this.containsMeasurement(text) && text.length > 3 && text.length < 200) {
                ingredients.push(text);
            }
        }

        return ingredients;
    },

    /**
     * Detect instructions using multiple heuristics
     */
    detectInstructions(sections, elements) {
        const instructions = [];

        // Strategy 1: Use detected instructions section
        const instructionSection = sections.find(s => s.type === 'instructions');
        if (instructionSection) {
            const sectionElements = elements.slice(instructionSection.startIndex + 1, instructionSection.endIndex);
            return this.extractListItems(sectionElements);
        }

        // Strategy 2: Look for numbered lists
        const numberedLists = elements.filter(e => e.tagName === 'OL');
        if (numberedLists.length > 0) {
            return this.extractListItems(numberedLists);
        }

        // Strategy 3: Look for paragraphs with step indicators
        const stepPatterns = /^(step\s+)?\d+[\.\):\-]\s/i;
        for (const elem of elements) {
            if (elem.tagName === 'P') {
                const text = elem.textContent.trim();
                if (stepPatterns.test(text) || (text.length > 20 && !this.containsMeasurement(text))) {
                    const cleaned = text.replace(stepPatterns, '').trim();
                    if (cleaned.length > 10) {
                        instructions.push(cleaned);
                    }
                }
            }
        }

        if (instructions.length > 0) {
            return instructions;
        }

        // Strategy 4: Take paragraphs after ingredients as instructions
        const ingredientSection = sections.find(s => s.type === 'ingredients');
        const startIndex = ingredientSection ? ingredientSection.endIndex : 0;

        for (let i = startIndex; i < elements.length; i++) {
            const elem = elements[i];
            if (elem.tagName === 'P') {
                const text = elem.textContent.trim();
                if (text.length > 20 && text.length < 1000) {
                    instructions.push(text);
                }
            }
        }

        return instructions;
    },

    /**
     * Detect metadata (prep time, cook time, servings)
     */
    detectMetadata(elements) {
        const metadata = {
            prepTime: null,
            cookTime: null,
            servings: null
        };

        const text = elements.map(e => e.textContent).join('\n').toLowerCase();

        // Prep time patterns
        const prepTimeMatch = text.match(/prep(?:\s+time)?:\s*(\d+(?:\s*-\s*\d+)?)\s*(min(?:ute)?s?|hrs?|hours?)/i);
        if (prepTimeMatch) {
            metadata.prepTime = `${prepTimeMatch[1]} ${prepTimeMatch[2]}`;
        }

        // Cook time patterns
        const cookTimeMatch = text.match(/cook(?:\s+time)?:\s*(\d+(?:\s*-\s*\d+)?)\s*(min(?:ute)?s?|hrs?|hours?)/i);
        if (cookTimeMatch) {
            metadata.cookTime = `${cookTimeMatch[1]} ${cookTimeMatch[2]}`;
        }

        // Servings patterns
        const servingsMatch = text.match(/(?:serves?|yield|makes?):\s*(\d+)/i);
        if (servingsMatch) {
            metadata.servings = parseInt(servingsMatch[1], 10);
        }

        return metadata;
    },

    /**
     * Detect notes section
     */
    detectNotes(sections, elements) {
        const notesSection = sections.find(s => s.type === 'notes');
        if (notesSection) {
            const sectionElements = elements.slice(notesSection.startIndex + 1, notesSection.endIndex);
            return sectionElements.map(e => e.textContent.trim()).filter(t => t.length > 0).join('\n');
        }
        return '';
    },

    /**
     * Extract list items from elements
     */
    extractListItems(elements) {
        const items = [];

        for (const elem of elements) {
            if (elem.tagName === 'UL' || elem.tagName === 'OL') {
                const listItems = elem.querySelectorAll('li');
                listItems.forEach(li => {
                    const text = li.textContent.trim();
                    if (text.length > 0) {
                        items.push(text);
                    }
                });
            } else if (elem.tagName === 'P') {
                const text = elem.textContent.trim();
                if (text.length > 0) {
                    items.push(text);
                }
            }
        }

        return items;
    },

    /**
     * Check if text contains measurement patterns
     */
    containsMeasurement(text) {
        const measurementPatterns = [
            // Common measurement units
            /\d+\s*(cup|cups|tablespoon|tablespoons|tbsp|teaspoon|teaspoons|tsp|ounce|ounces|oz|pound|pounds|lb|lbs|gram|grams|g|kg|kilogram|ml|milliliter|liter|l)/i,
            // Fractions
            /\d+\s*[\/]\s*\d+/,
            // Unicode fractions
            /[¼½¾⅓⅔⅛⅜⅝⅞]/,
            // Quantity + item pattern
            /^\d+\s+[a-z]/i
        ];

        return measurementPatterns.some(pattern => pattern.test(text));
    },

    /**
     * Calculate confidence scores for parsed data
     */
    calculateConfidence(parsedData) {
        const scores = {
            title: 0,
            ingredients: 0,
            instructions: 0,
            overall: 0
        };

        // Title confidence
        if (parsedData.title && parsedData.title !== 'Untitled Recipe') {
            scores.title = parsedData.title.length < 100 ? 90 : 70;
        } else {
            scores.title = 20;
        }

        // Ingredients confidence
        if (parsedData.ingredients.length > 0) {
            const measurementCount = parsedData.ingredients.filter(ing =>
                this.containsMeasurement(ing)
            ).length;
            const measurementRatio = measurementCount / parsedData.ingredients.length;

            if (measurementRatio > 0.7) {
                scores.ingredients = 95;
            } else if (measurementRatio > 0.4) {
                scores.ingredients = 75;
            } else if (parsedData.ingredients.length >= 3) {
                scores.ingredients = 60;
            } else {
                scores.ingredients = 30;
            }
        } else {
            scores.ingredients = 0;
        }

        // Instructions confidence
        if (parsedData.instructions.length > 0) {
            const avgLength = parsedData.instructions.reduce((sum, inst) => sum + inst.length, 0) / parsedData.instructions.length;

            if (parsedData.instructions.length >= 3 && avgLength > 20) {
                scores.instructions = 90;
            } else if (parsedData.instructions.length >= 2) {
                scores.instructions = 70;
            } else {
                scores.instructions = 40;
            }
        } else {
            scores.instructions = 0;
        }

        // Overall confidence (weighted average)
        scores.overall = Math.round(
            scores.title * 0.2 +
            scores.ingredients * 0.4 +
            scores.instructions * 0.4
        );

        return scores;
    }
};

// Make it globally available
window.WordRecipeParser = WordRecipeParser;
