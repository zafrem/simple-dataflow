const extractDomainFromTag = (tag) => {
  const match = tag.match(/^(.+)_(db|api|app|storage|pipes)$/);
  return match ? match[1] : null;
};

const generateTagPattern = (pattern, data) => {
  return pattern.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] || match;
  });
};

const validateTag = (tag) => {
  const regex = /^[a-zA-Z0-9_-]+_(db|api|app|storage|pipes)$/;
  return regex.test(tag);
};

const normalizeComponentName = (name) => {
  return name.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
};

const inferComponentType = (name, source = '') => {
  const nameLower = name.toLowerCase();
  const sourceLower = source.toLowerCase();
  
  if (nameLower.includes('db') || nameLower.includes('database') || 
      sourceLower.includes('postgres') || sourceLower.includes('mysql') || 
      sourceLower.includes('mongo')) {
    return 'DB';
  }
  
  if (nameLower.includes('api') || nameLower.includes('service') || 
      sourceLower.includes('swagger') || sourceLower.includes('openapi')) {
    return 'API';
  }
  
  return 'APP';
};

const generateUniqueTag = (name, type, existingTags = []) => {
  const baseName = normalizeComponentName(name);
  const typeSuffix = type.toLowerCase();
  let tag = `${baseName}_${typeSuffix}`;
  let counter = 1;
  
  while (existingTags.includes(tag)) {
    tag = `${baseName}_${counter}_${typeSuffix}`;
    counter++;
  }
  
  return tag;
};

module.exports = {
  extractDomainFromTag,
  generateTagPattern,
  validateTag,
  normalizeComponentName,
  inferComponentType,
  generateUniqueTag
};