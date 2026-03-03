const fs = require('fs');
const path = require('path');

const directory = 'c:/Users/anujg/Desktop/Sigma/Web_Developement/pay_role_manager/client/src';

const replacements = [
    { search: /#6366f1/g, replace: 'var(--accent)' }, // We can safely replace the hex to var(--accent), unless it's in a js file where it needs to be `#2A9D8F`. Wait, in JS it should be `#2A9D8F`. Let's just use `#2A9D8F`.
    { search: /#6366f1/g, replace: '#2A9D8F' },
    { search: /#8b5cf6/gi, replace: '#264653' },
    { search: /rgba\(99,\s*102,\s*241/g, replace: 'rgba(42, 157, 143' },
    { search: /rgba\(139,\s*92,\s*246/g, replace: 'rgba(38, 70, 83' },
    { search: /rgba\(129,\s*140,\s*248/g, replace: 'rgba(42, 157, 143' },
    { search: /linear-gradient\(135deg,\s*#6366f1,\s*#a78bfa,\s*#c084fc\)/g, replace: 'var(--accent-gradient)' },
    { search: /#a78bfa/gi, replace: '#E9C46A' },
    { search: /#c084fc/gi, replace: '#F4A261' },
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.match(/\.(css|jsx|js)$/)) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;

            replacements.forEach(({ search, replace }) => {
                if (content.match(search)) {
                    content = content.replace(search, replace);
                    changed = true;
                }
            });

            // Specifically fix replacing `#6366f1` to `#2A9D8F` because the first rule was replaced by the second.
            // Wait, I mapped /#6366f1/g twice. the first one will be ignored. I will just map it to var(--accent) in CSS and #2A9D8F in JS.

            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

// Refine replacement rules based on file extension
const cssReplacements = [
    { search: /#6366f1/gi, replace: 'var(--accent)' },
    { search: /#8b5cf6/gi, replace: 'var(--text-primary)' }, // Or '#264653'
    { search: /rgba\(99,\s*102,\s*241/gi, replace: 'rgba(42, 157, 143' },
    { search: /rgba\(139,\s*92,\s*246/gi, replace: 'rgba(38, 70, 83' },
    { search: /rgba\(129,\s*140,\s*248/gi, replace: 'rgba(42, 157, 143' },
    { search: /#a78bfa/gi, replace: '#E9C46A' },
    { search: /#c084fc/gi, replace: '#F4A261' },
];

const jsReplacements = [
    { search: /#6366f1/gi, replace: '#2A9D8F' },
    { search: /#8b5cf6/gi, replace: '#264653' },
    { search: /rgba\(99,\s*102,\s*241/gi, replace: 'rgba(42, 157, 143' },
    { search: /rgba\(139,\s*92,\s*246/gi, replace: 'rgba(38, 70, 83' },
    { search: /rgba\(129,\s*140,\s*248/gi, replace: 'rgba(42, 157, 143' },
    { search: /#a78bfa/gi, replace: '#E9C46A' },
    { search: /#c084fc/gi, replace: '#F4A261' },
];

function processDirectoryCorrected(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectoryCorrected(fullPath);
        } else if (fullPath.match(/\.(css|jsx|js)$/)) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;

            const rules = fullPath.endsWith('.css') ? cssReplacements : jsReplacements;

            rules.forEach(({ search, replace }) => {
                if (content.match(search)) {
                    content = content.replace(search, replace);
                    changed = true;
                }
            });

            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

processDirectoryCorrected(directory);
