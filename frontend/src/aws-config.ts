import { ResourcesConfig } from 'aws-amplify';

export const awsConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'eu-north-1_Y5nn7dGTZ',
      userPoolClientId: '3cksc23hm5hpbdmuhbkjc003ap',
      identityPoolId: 'eu-north-1:53e62a5b-81d8-4542-b6d4-f5dd401e23a1',
      loginWith: {
        oauth: {
          domain: 'moviesearch-rajalahti.auth.eu-north-1.amazoncognito.com',
          scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
          redirectSignIn: [
            'http://localhost:5173/',
            'https://movies.rajalahti.me/',
            'https://d1rv2osro1u0uc.cloudfront.net/'
          ],
          redirectSignOut: [
            'http://localhost:5173/',
            'https://movies.rajalahti.me/',
            'https://d1rv2osro1u0uc.cloudfront.net/'
          ],
          responseType: 'code',
        },
      },
    },
  },
};

export const AWS_REGION = 'eu-north-1';
export const DYNAMODB_TABLE = 'MovieWatchlist';
export const MOVIE_API_BASE = 'https://t2eowh5je8.execute-api.eu-north-1.amazonaws.com/dev';
