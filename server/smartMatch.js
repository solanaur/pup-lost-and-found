const TOKEN_RE = /[a-z0-9]+/g;
const COLORS = ['black', 'white', 'blue', 'red', 'green', 'navy', 'brown', 'gray', 'grey', 'yellow', 'pink', 'purple', 'silver', 'gold'];

function categorizeFromText(text) {
  const t = String(text || '').toLowerCase();
  if (/wallet|purse|coin/.test(t)) return 'Accessories';
  if (/id|card|license/.test(t)) return 'IDs/Documents';
  if (/phone|charger|cable|laptop|calculator|usb|flash/.test(t)) return 'Electronics';
  if (/bottle|flask|tumbler/.test(t)) return 'Personal Items';
  if (/hoodie|shirt|jacket|umbrella|glass|shoe/.test(t)) return 'Clothing';
  if (/key|lanyard/.test(t)) return 'Accessories';
  return 'General';
}

function extractColor(text) {
  const t = String(text || '').toLowerCase();
  return COLORS.find((c) => t.includes(c)) || '';
}

const { smartMatches, compareLostAndFound } = require('./matchingService');

module.exports = {
  smartMatches,
  compareLostAndFound,
  categorizeFromText,
  extractColor,
};
