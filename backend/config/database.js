// backend/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('📍 MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/touritai');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/touritai');
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
     console.log('🔍 Current database:', mongoose.connection.db.databaseName);
    
    // Check places collection
    const db = mongoose.connection.db;
    const places = await db.collection('places').find({}).toArray();
    console.log('🏢 Places found in collection:', places.length);
    
    if (places.length > 0) {
      console.log('📍 Sample place:', JSON.stringify(places[0], null, 2));
    }
    
    // List all collections to see what's available
    const collections = await db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));
    // Test the connection by counting documents
    const Place = require('../models/Place');
    const placeCount = await Place.countDocuments();
    console.log(`📍 Places in database: ${placeCount}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('📡 MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🛑 MongoDB connection closed due to app termination');
  process.exit(0);
});

module.exports = connectDB;