# Node.js Authentication Backend

A secure authentication backend built with Node.js, MongoDB, and optimized for Vercel deployment.

## Features

- **User Registration**: Sign up with first name, last name, email, and password
- **User Login**: Login with email, password, and optional "remember me"
- **JWT Authentication**: Access tokens (15min) and refresh tokens (7-30 days)
- **Password Security**: Bcrypt hashing with salt rounds
- **Input Validation**: Email validation and password strength requirements
- **CORS Support**: Cross-origin resource sharing enabled
- **MongoDB Integration**: Efficient database operations with connection pooling

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### User
- `GET /api/user/profile` - Get user profile (protected)

## Environment Variables

Create a `.env.local` file in your project root:

\`\`\`env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=authdb
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
NODE_ENV=production
\`\`\`

## Deployment on Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`
4. Add environment variables in Vercel dashboard

## Usage Examples

### Signup
\`\`\`javascript
const response = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'SecurePass123'
  })
});
\`\`\`

### Login
\`\`\`javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'SecurePass123',
    rememberMe: true
  })
});
\`\`\`

### Protected Route
\`\`\`javascript
const response = await fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
\`\`\`

## Security Features

- Password hashing with bcrypt (12 salt rounds)
- JWT token expiration (15min access, 7-30 days refresh)
- Input sanitization and validation
- CORS protection
- SQL injection prevention
- Rate limiting ready (add middleware as needed)

## Database Collections

- `users`: User profiles and credentials
- `refresh_tokens`: Active refresh tokens with expiration
