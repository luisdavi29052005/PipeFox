
// Import and run backend server
import('./backend/src/server.ts').then(() => {
  console.log('Backend server started');
}).catch(error => {
  console.error('Error starting backend server:', error);
});
