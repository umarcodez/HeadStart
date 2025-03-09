/**
 * Domain Availability Service
 * 
 * In a production environment, this would connect to a domain API like Namecheap or use WHOIS lookup
 * For now, we're using a mock implementation
 */

// Popular TLDs for domain suggestions
const popularTLDs = [
  '.com', '.net', '.org', '.io', '.ai', '.co', '.app', '.tech', '.dev', '.me'
];

// A mock implementation of domain availability checking
const checkDomainAvailability = async (domain) => {
  // Parse domain name and TLD
  let domainName = domain;
  let tld = '.com';
  
  // If domain includes a dot, extract the TLD
  if (domain.includes('.')) {
    const parts = domain.split('.');
    tld = '.' + parts.pop();
    domainName = parts.join('.');
  }
  
  // Generate a predictable but seemingly random availability result
  // In a real implementation, this would call an external API
  const isAvailable = generateRandomAvailability(domainName, tld);
  
  return {
    domain: `${domainName}${tld}`,
    available: isAvailable,
    tld
  };
};

// Generate domain suggestions based on a business name
const generateDomainSuggestions = async (businessName) => {
  // Remove spaces and special characters
  const cleanName = businessName.toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, '');
  
  const suggestions = [];
  
  // Add variations with popular TLDs
  popularTLDs.forEach(tld => {
    suggestions.push({
      domain: `${cleanName}${tld}`,
      available: generateRandomAvailability(cleanName, tld),
      tld
    });
  });
  
  // Add variations with prefixes/suffixes
  const variations = [
    { name: `get${cleanName}`, tld: '.com' },
    { name: `join${cleanName}`, tld: '.com' },
    { name: `try${cleanName}`, tld: '.com' },
    { name: `${cleanName}app`, tld: '.com' },
    { name: `${cleanName}hq`, tld: '.com' },
    { name: `the${cleanName}`, tld: '.com' },
    { name: `${cleanName}`, tld: '.io' },
    { name: `${cleanName}`, tld: '.co' },
    { name: `${cleanName}`, tld: '.app' },
    { name: `${cleanName}`, tld: '.tech' }
  ];
  
  variations.forEach(v => {
    suggestions.push({
      domain: `${v.name}${v.tld}`,
      available: generateRandomAvailability(v.name, v.tld),
      tld: v.tld
    });
  });
  
  return suggestions;
};

// Helper function to generate a pseudo-random but consistent availability result
function generateRandomAvailability(name, tld) {
  // Use a simple hash function to generate a predictable but seemingly random result
  // This is just for the mock implementation
  const hash = (name + tld).split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  // Domains with common TLDs like .com should be less likely to be available
  const availabilityThreshold = {
    '.com': 0.2,   // 20% chance of availability
    '.net': 0.4,
    '.org': 0.5,
    '.io': 0.6,
    '.co': 0.4,
    '.app': 0.7,
    '.tech': 0.8,
    '.ai': 0.7,
    '.dev': 0.7,
    '.me': 0.6
  };
  
  const threshold = availabilityThreshold[tld] || 0.5;
  
  // Shorter domains are less likely to be available
  const lengthFactor = Math.min(name.length / 10, 1);
  const adjustedThreshold = threshold * (0.5 + lengthFactor / 2);
  
  return (hash % 100) / 100 < adjustedThreshold;
}

module.exports = {
  checkDomainAvailability,
  generateDomainSuggestions
}; 