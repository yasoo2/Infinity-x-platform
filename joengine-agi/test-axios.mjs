
console.log('Attempting to import axios...');
import axios from 'axios';
console.log('axios imported successfully.');

async function testAxios() {
  try {
    console.log('Making a GET request to google.com...');
    const response = await axios.get('https://google.com');
    console.log('Request successful. Status:', response.status);
  } catch (error) {
    console.error('Axios request failed:', error.message);
  }
}

testAxios();
