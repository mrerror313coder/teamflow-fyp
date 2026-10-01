const mongoose = require('mongoose');
const dns = require('dns');

// Configure reliable DNS servers to resolve MongoDB Atlas SRV/TXT records on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if not supported in environment
}

const connectDB = async () => {
  let uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teamflow';

  // Automatically remove angle brackets if user left <password> brackets by mistake
  if (uri.includes('<') && uri.includes('>')) {
    uri = uri.replace(/<([^>]+)>/g, '$1');
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(` MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`⚠️ MongoDB Connection Error: ${error.message}`);
    if (error.message.includes('bad auth') || error.message.includes('authentication failed')) {
      console.warn(`
----------------------------------------------------------------------
⚠️  MONGODB AUTHENTICATION FAILED:
The password in your MONGO_URI in backend/.env is incorrect!
1. Go to MongoDB Atlas (cloud.mongodb.com) -> Database Access
2. Check the user "grimecoughraven_db_user" (or click "Edit" -> "Edit Password")
3. Set a simple password (e.g. Arham12345) and update backend/.env
----------------------------------------------------------------------
      `);
    } else {
      console.warn(`
----------------------------------------------------------------------
ℹ️  TIP: If you haven't set up MongoDB Atlas yet:
1. Create a free database at https://cloud.mongodb.com
2. Copy your connection string into backend/.env:
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/teamflow?retryWrites=true&w=majority
----------------------------------------------------------------------
      `);
    }
    return null;
  }
};

module.exports = connectDB;

