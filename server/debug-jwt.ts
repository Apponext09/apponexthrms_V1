import { getEnv } from './src/config/env';

const env = getEnv();

console.log('JWT Private Key:');
console.log('─'.repeat(70));
console.log(env.JWT_PRIVATE_KEY);
console.log('─'.repeat(70));
console.log(`Length: ${env.JWT_PRIVATE_KEY.length}`);
console.log(`Starts with: ${env.JWT_PRIVATE_KEY.substring(0, 50)}`);
console.log(`Ends with: ${env.JWT_PRIVATE_KEY.substring(env.JWT_PRIVATE_KEY.length - 50)}`);

console.log('\n\nJWT Public Key:');
console.log('─'.repeat(70));
console.log(env.JWT_PUBLIC_KEY);
console.log('─'.repeat(70));
console.log(`Length: ${env.JWT_PUBLIC_KEY.length}`);
