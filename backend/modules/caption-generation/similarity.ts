/**
 * Utility functions for checking text similarity and duplication.
 * Used for EPIC-07: Duplicate Content Checking.
 */

// Tokenize text into bigrams (2-word phrases) for better accuracy on long texts
export function tokenize(text: string): string[] {
  if (!text) return [];
  // Remove URLs, punctuation, and multiple spaces
  const cleanText = text
    .toLowerCase()
    .replace(/https?:\/\/[^\s]+/g, '') // remove urls
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ') // remove punctuation
    .replace(/\s{2,}/g, ' ') // remove extra spaces
    .trim();
    
  const words = cleanText.split(' ').filter(word => word.length > 0);
  
  if (words.length <= 1) return words;

  // Create bigrams
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i+1]}`);
  }
  
  return bigrams;
}

// Calculate Jaccard similarity between two texts (returns 0 to 1)
export function calculateTextSimilarity(text1: string, text2: string): number {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);
  
  if (tokens1.length === 0 && tokens2.length === 0) return 1;
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  let intersectionCount = 0;
  for (const token of set1) {
    if (set2.has(token)) {
      intersectionCount++;
    }
  }
  
  const unionCount = set1.size + set2.size - intersectionCount;
  
  if (unionCount === 0) return 0;
  return intersectionCount / unionCount;
}

// Find the most similar post from a list of recent posts
export function findMostSimilarPost(newText: string, recentPosts: { id: string, content: string }[], threshold: number = 0.75) {
  let maxSimilarity = 0;
  let mostSimilarPostId: string | null = null;
  let mostSimilarContent: string | null = null;

  for (const post of recentPosts) {
    // Some posts might have empty content, skip them
    if (!post.content) continue;
    
    const similarity = calculateTextSimilarity(newText, post.content);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilarPostId = post.id;
      mostSimilarContent = post.content;
    }
  }

  const isDuplicate = maxSimilarity >= threshold;

  return {
    isDuplicate,
    maxSimilarity,
    similarPostId: isDuplicate ? mostSimilarPostId : null,
    similarContent: isDuplicate ? mostSimilarContent : null,
  };
}
