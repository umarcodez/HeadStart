/**
 * Business Name Generation Service
 * 
 * In a production environment, this would connect to the OpenAI API
 * For now, we're using a mock implementation
 */

// A simple algorithm to generate business name suggestions based on industry and keywords
const generateBusinessNames = async (industry, keywords) => {
  const keywordList = keywords.split(',').map(k => k.trim());
  
  // Basic prefixes and suffixes by industry
  const industryPrefixes = {
    'technology': ['Tech', 'Digi', 'Cyber', 'Quantum', 'Nexus'],
    'food': ['Tasty', 'Savory', 'Fresh', 'Gourmet', 'Delish'],
    'healthcare': ['Care', 'Heal', 'Vital', 'Well', 'Life'],
    'education': ['Learn', 'Edu', 'Smart', 'Bright', 'Mind'],
    'finance': ['Wealth', 'Capital', 'Prosper', 'Asset', 'Fund'],
    'retail': ['Shop', 'Store', 'Market', 'Retail', 'Mart'],
    'default': ['Nova', 'Prime', 'Elite', 'Peak', 'Apex']
  };
  
  const industrySuffixes = {
    'technology': ['Systems', 'Solutions', 'Tech', 'Labs', 'AI'],
    'food': ['Eats', 'Kitchen', 'Bites', 'Cuisine', 'Plate'],
    'healthcare': ['Health', 'Care', 'Med', 'Clinic', 'Wellness'],
    'education': ['Academy', 'School', 'Learning', 'Education', 'Institute'],
    'finance': ['Finance', 'Invest', 'Wealth', 'Capital', 'Money'],
    'retail': ['Shop', 'Mart', 'Store', 'Market', 'Retail'],
    'default': ['Group', 'Co', 'Inc', 'Collective', 'Enterprise']
  };
  
  // Get prefixes and suffixes for the given industry or use default
  const prefixes = industryPrefixes[industry.toLowerCase()] || industryPrefixes.default;
  const suffixes = industrySuffixes[industry.toLowerCase()] || industrySuffixes.default;
  
  // Generate business names using combinations of prefixes, keywords, and suffixes
  const names = [];
  
  // Method 1: Prefix + Keyword
  keywordList.forEach(keyword => {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    names.push(`${prefix}${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`);
  });
  
  // Method 2: Keyword + Suffix
  keywordList.forEach(keyword => {
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    names.push(`${keyword.charAt(0).toUpperCase() + keyword.slice(1)}${suffix}`);
  });
  
  // Method 3: Prefix + Modified Keyword
  keywordList.forEach(keyword => {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    // Take first 3-4 chars of keyword
    const shortKeyword = keyword.substring(0, 3 + Math.floor(Math.random() * 2));
    names.push(`${prefix}${shortKeyword.charAt(0).toUpperCase() + shortKeyword.slice(1)}`);
  });
  
  // Method 4: Combined Keywords
  if (keywordList.length >= 2) {
    for (let i = 0; i < keywordList.length - 1; i++) {
      const firstWord = keywordList[i].charAt(0).toUpperCase() + keywordList[i].slice(1, 3);
      const secondWord = keywordList[i+1].charAt(0).toUpperCase() + keywordList[i+1].slice(1);
      names.push(`${firstWord}${secondWord}`);
    }
  }
  
  // Method 5: Industry-specific names
  names.push(`${industry.charAt(0).toUpperCase() + industry.slice(1)}Hub`);
  names.push(`${industry.charAt(0).toUpperCase() + industry.slice(1)}Pro`);
  
  // Randomize the order
  return names.sort(() => 0.5 - Math.random()).slice(0, 10);
};

module.exports = {
  generateBusinessNames
}; 