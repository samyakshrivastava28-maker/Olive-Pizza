require('dotenv').config({path: '../.env'});
const { notificationQueue } = require('./src/services/notification/NotificationQueueService.js');

async function run() {
  console.log('Running processQueue()...');
  try {
    await notificationQueue.processQueue();
    console.log('Finished processQueue().');
  } catch (e) {
    console.error('Error during processQueue():', e);
  }
  process.exit(0);
}
run();
