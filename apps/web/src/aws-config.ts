import type { ResourcesConfig } from 'aws-amplify';

const DEFAULT_REDIRECT_URLS = [
  'http://localhost:5173/',
  'https://movies.rajalahti.me/',
  'https://d1rv2osro1u0uc.cloudfront.net/',
];

const DEFAULT_SCOPES = ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'];

function readList(value: string | undefined, fallback: string[]) {
  if (!value) {
    return fallback;
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
}

const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'eu-north-1';
const COGNITO_USER_POOL_ID =
  import.meta.env.VITE_COGNITO_USER_POOL_ID || 'eu-north-1_Y5nn7dGTZ';
const COGNITO_USER_POOL_CLIENT_ID =
  import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '3cksc23hm5hpbdmuhbkjc003ap';
const COGNITO_IDENTITY_POOL_ID =
  import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID ||
  'eu-north-1:53e62a5b-81d8-4542-b6d4-f5dd401e23a1';
const COGNITO_DOMAIN =
  import.meta.env.VITE_COGNITO_DOMAIN ||
  'moviesearch-rajalahti.auth.eu-north-1.amazoncognito.com';

export const awsConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: COGNITO_USER_POOL_ID,
      userPoolClientId: COGNITO_USER_POOL_CLIENT_ID,
      identityPoolId: COGNITO_IDENTITY_POOL_ID,
      loginWith: {
        oauth: {
          domain: COGNITO_DOMAIN,
          scopes: readList(import.meta.env.VITE_COGNITO_SCOPES, DEFAULT_SCOPES),
          redirectSignIn: readList(
            import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN,
            DEFAULT_REDIRECT_URLS
          ),
          redirectSignOut: readList(
            import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT,
            DEFAULT_REDIRECT_URLS
          ),
          responseType: 'code',
        },
      },
    },
  },
};

export { AWS_REGION };
export const DYNAMODB_TABLE = import.meta.env.VITE_DYNAMODB_TABLE || 'MovieWatchlist';
export const MOVIE_API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001')
  .replace(/\/$/, '');
