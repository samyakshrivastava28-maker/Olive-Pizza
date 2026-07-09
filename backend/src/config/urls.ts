import dotenv from 'dotenv';
dotenv.config();

// Centralized Frontend URL configuration
export const FRONTEND_URL = process.env.FRONTEND_URL 
  || (process.env.NODE_ENV === 'production' ? 'https://olive-pizza.vercel.app' : 'http://localhost:5173');

export const API_BASE = process.env.API_BASE
  || (process.env.NODE_ENV === 'production' ? 'https://olive-pizza.vercel.app/api' : 'http://localhost:3000');
