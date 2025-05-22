// Production startup script with extra debugging
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug info
console.log('Starting production app with debugging info');
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);

// List files in key directories
try {
  console.log('\nFiles in src directory:');
  console.log(fs.readdirSync(path.join(__dirname, 'src')).join(', '));
  
  console.log('\nFiles in src/services directory:');
  console.log(fs.readdirSync(path.join(__dirname, 'src', 'services')).join(', '));
  
  console.log('\nFiles in src/controllers directory:');
  console.log(fs.readdirSync(path.join(__dirname, 'src', 'controllers')).join(', '));
  
  // Check if email-state.js exists
  const emailStatePath = path.join(__dirname, 'src', 'services', 'email-state.js');
  console.log('\nDoes email-state.js exist?', fs.existsSync(emailStatePath));
  
  if (fs.existsSync(emailStatePath)) {
    console.log('Content of email-state.js:');
    console.log(fs.readFileSync(emailStatePath, 'utf8').substring(0, 200) + '...');
  }
} catch (error) {
  console.error('Error checking files:', error);
}

// Import the actual application
try {
  console.log('\nImporting main application...');
  const importPromise = import('./src/index.js');
  importPromise.then(() => {
    console.log('Application started successfully');
  }).catch(error => {
    console.error('Error starting application:', error);
  });
} catch (error) {
  console.error('Error importing application:', error);
} 