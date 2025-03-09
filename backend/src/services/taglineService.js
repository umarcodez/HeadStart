/**
 * Tagline Generation Service
 * 
 * In a production environment, this would connect to an NLP API
 * For now, we're using a mock implementation
 */

// A simple algorithm to generate tagline suggestions based on business name and keywords
const generateTaglines = async (businessName, keywords) => {
  const keywordList = keywords.split(',').map(k => k.trim());
  
  // Templates for tagline generation
  const templates = [
    "Your partner in {keyword}",
    "Revolutionizing {keyword} for tomorrow",
    "The future of {keyword} is here",
    "{keyword} redefined",
    "Excellence in {keyword}",
    "Transforming {keyword}, one step at a time",
    "Beyond {keyword}",
    "Where {keyword} meets innovation",
    "{keyword} made simple",
    "Empowering your {keyword} journey",
    "Think {keyword}. Think {businessName}",
    "{businessName}: Leading the way in {keyword}",
    "Innovate. Create. {keyword}",
    "For those who demand the best in {keyword}",
    "Your {keyword} solution",
    "Building a better {keyword} experience",
    "The smart choice for {keyword}",
    "{keyword} for the modern world",
    "We make {keyword} better",
    "Experience the {businessName} difference in {keyword}"
  ];
  
  // Business-specific templates
  const businessTemplates = [
    `${businessName}: Where quality meets excellence`,
    `${businessName}: Redefining standards`,
    `Discover the ${businessName} advantage`,
    `${businessName}: Beyond expectations`,
    `Your success, our mission at ${businessName}`,
    `${businessName}: Innovation that matters`,
    `Elevate your experience with ${businessName}`,
    `${businessName}: Solutions for tomorrow`,
    `Trust ${businessName} for excellence`,
    `${businessName}: Making a difference`
  ];
  
  const taglines = [];
  
  // Generate taglines using keywords and templates
  keywordList.forEach(keyword => {
    // Choose 3 random templates for each keyword
    const randomIndices = Array.from({length: templates.length}, (_, i) => i)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    randomIndices.forEach(index => {
      const template = templates[index];
      taglines.push(template
        .replace('{keyword}', keyword.toLowerCase())
        .replace('{businessName}', businessName));
    });
  });
  
  // Add business-specific taglines
  businessTemplates.forEach(template => {
    taglines.push(template);
  });
  
  // Randomize the order and return top 10
  return taglines.sort(() => 0.5 - Math.random()).slice(0, 10);
};

module.exports = {
  generateTaglines
}; 