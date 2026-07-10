import { evaluateComplexity, selectModel, executeWithRotation } from '../lib/services/geminiRotationManager';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testComplexity() {
  console.log('--- Testing Complexity Evaluation ---');
  
  const low = evaluateComplexity({ title: 'Test', content: 'Short content' });
  console.log('Low complexity test (expected: "low"):', low);
  
  const med = evaluateComplexity({ title: 'A standard title', content: 'Word '.repeat(200) });
  console.log('Medium complexity test (expected: "medium"):', med);
  
  const highLength = evaluateComplexity({ title: 'A very long title', content: 'Word '.repeat(600) });
  console.log('High complexity by length test (expected: "high"):', highLength);
  
  const highLayout = evaluateComplexity({ title: 'Standard title', content: 'Short content', layout: 'dmagazine' });
  console.log('High complexity by layout test (expected: "high"):', highLayout);
  
  console.log('\n--- Testing Model Selection ---');
  console.log('Low Model:', selectModel('low'));
  console.log('Medium Model:', selectModel('medium'));
  console.log('High Model:', selectModel('high'));
}

async function testFallback() {
  console.log('\n--- Testing executeWithRotation Fallback to Env API Key ---');
  try {
    const result = await executeWithRotation(
      { title: 'Test Post title', content: 'Hello World! '.repeat(20) },
      async (key, model) => {
        console.log(`Runner called with key: ${key.substring(0, 8)}..., model: ${model}`);
        return 'MOCK SUCCESS RESPONSE';
      }
    );
    console.log('Execute with rotation success:', result);
  } catch (err: any) {
    console.error('Execute with rotation failed:', err.message || err);
  }
}

async function run() {
  await testComplexity();
  await testFallback();
}

run().catch(console.error);
