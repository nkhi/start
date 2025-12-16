
const fs = require('fs');
const path = require('path');

// We need to import the data. Since themeConfigV2.ts is TypeScript, 
// and we are running this with node, we'll use a simple regex approach 
// to extract the object structure to avoid needing to compile TS or use ts-node.
// This is less robust but sufficient for a one-off generation script derived from a known file structure.

const themePath = path.join(__dirname, '../utils/themeConfigV2.ts');
const fileContent = fs.readFileSync(themePath, 'utf8');

// Primitive extraction of the object directly from source text
// We look for everything between "export const THEME_COLORS_V2: Record<ThemeNameV2, ThemeColors[]> = {" and "};"
const match = fileContent.match(/export const THEME_COLORS_V2: Record<ThemeNameV2, ThemeColors\[\]> = (\{[\s\S]*?\});/);

if (!match) {
    console.error("Could not find THEME_COLORS_V2 object in file.");
    process.exit(1);
}

// Evaluate the object string. We need to sanitize it to be valid JS json-like object
// But it has comments // ...
// And keys are not quoted.
// We can use 'eval' safely here since we trust our own file, wrapped in parens.
// But first strip comments.
let objectStr = match[1];
objectStr = objectStr.replace(/\/\/.*$/gm, ''); // Remove single line comments

// Wrap in parens and eval
const THEME_COLORS_V2 = eval('(' + objectStr + ')');

const PHASE_ORDER = [
    'night1', 'night2', 'night3',
    'dawn', 'sunrise', 'morning',
    'noon', 'afternoon', 'goldenHour',
    'sunset', 'dusk'
];

// SVG Configuration
const CARD_WIDTH = 200;
const CARD_HEIGHT = 120;
const GAP = 20;
const COLS = 5; // Variants per phase usually 5
const ROW_HEADER_HEIGHT = 40;

// Calculate total dimensions
const totalPhases = PHASE_ORDER.length;
const maxVariants = 5; // We know it's 5

const TOTAL_WIDTH = (CARD_WIDTH * maxVariants) + (GAP * (maxVariants - 1)) + 100; // +100 for padding/labels
const TOTAL_HEIGHT = (CARD_HEIGHT + ROW_HEADER_HEIGHT + GAP) * totalPhases + 100;

let svgContent = `<svg width="${TOTAL_WIDTH}" height="${TOTAL_HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="font-family: sans-serif;">
<rect width="100%" height="100%" fill="#111" />
`;

let currentY = 50;

PHASE_ORDER.forEach(phase => {
    const variants = THEME_COLORS_V2[phase] || [];
    
    // Draw Phase Label
    svgContent += `<text x="20" y="${currentY + 25}" fill="#fff" font-size="24" font-weight="bold">${phase.toUpperCase()}</text>`;
    
    currentY += ROW_HEADER_HEIGHT;
    
    variants.forEach((theme, index) => {
        const x = 20 + (index * (CARD_WIDTH + GAP));
        const y = currentY;
        
        // Draw Card Background
        svgContent += `<rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="12" fill="${theme.background}" stroke="rgba(255,255,255,0.1)" stroke-width="1" />`;
        
        // Draw Text/Icon placeholder (Sun circle)
        // Center icon
        const iconCx = x + CARD_WIDTH / 2;
        const iconCy = y + CARD_HEIGHT / 2 - 10;
        
        // Sun/Icon circle
        svgContent += `<circle cx="${iconCx}" cy="${iconCy}" r="20" fill="${theme.text}" />`;
        
        // Draw Theme ID
        svgContent += `<text x="${x + 10}" y="${y + CARD_HEIGHT - 15}" fill="${theme.text}" font-size="12" font-family="monospace">${theme.id}</text>`;
        
        // Draw Contrast Colors info (Hex codes)
        svgContent += `<text x="${x + 10}" y="${y + 20}" fill="${theme.text}" font-size="10" opacity="0.7">${theme.background} / ${theme.text}</text>`;
    });
    
    currentY += CARD_HEIGHT + GAP;
});

svgContent += `</svg>`;

const outputPath = path.join(__dirname, '../THEMES.md');
const svgPath = path.join(__dirname, '../themes-preview.svg');

// Write SVG
fs.writeFileSync(svgPath, svgContent);

// Write Markdown
const mdContent = `# Daylight Custom Themes

This document showcases the available color themes for the Daylight component.

**To regenerate this preview after updating themes, run:**
\`\`\`bash
npm run generate:themes
\`\`\`

![Themes Preview](./themes-preview.svg)

## Theme List

${PHASE_ORDER.map(phase => {
    const variants = THEME_COLORS_V2[phase] || [];
    return `### ${phase}\n` + variants.map(v => `- **${v.id}**: \`${v.background}\` (bg) / \`${v.text}\` (text)`).join('\n');
}).join('\n\n')}
`;

fs.writeFileSync(outputPath, mdContent);

console.log('Generated THEMES.md and themes-preview.svg');
