import { fetchAuthSession } from 'aws-amplify/auth';
import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { AWS_REGION, DYNAMODB_TABLE } from '../aws-config';

export interface WatchlistItem {
  movieId: string;
  title: string;
  year: number;
  poster: string;
  addedAt: string;
  notes?: string;
}

async function getDynamoClient(): Promise<{ client: DynamoDBClient; userId: string }> {
  const session = await fetchAuthSession();
  
  if (!session.credentials || !session.identityId) {
    throw new Error('Not authenticated');
  }

  const client = new DynamoDBClient({
    region: AWS_REGION,
    credentials: session.credentials,
  });

  return { client, userId: session.identityId };
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const { client, userId } = await getDynamoClient();

  const command = new QueryCommand({
    TableName: DYNAMODB_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: marshall({ ':userId': userId }),
  });

  const result = await client.send(command);
  
  return (result.Items || []).map((item) => {
    const unmarshalled = unmarshall(item);
    return {
      movieId: unmarshalled.movieId,
      title: unmarshalled.title,
      year: unmarshalled.year,
      poster: unmarshalled.poster,
      addedAt: unmarshalled.addedAt,
      notes: unmarshalled.notes,
    };
  });
}

export async function addToWatchlist(movie: Omit<WatchlistItem, 'addedAt'>): Promise<void> {
  const { client, userId } = await getDynamoClient();

  const item = {
    userId,
    movieId: movie.movieId,
    title: movie.title,
    year: movie.year,
    poster: movie.poster,
    addedAt: new Date().toISOString(),
    ...(movie.notes && { notes: movie.notes }),
  };

  const command = new PutItemCommand({
    TableName: DYNAMODB_TABLE,
    Item: marshall(item),
  });

  await client.send(command);
}

export async function removeFromWatchlist(movieId: string): Promise<void> {
  const { client, userId } = await getDynamoClient();

  const command = new DeleteItemCommand({
    TableName: DYNAMODB_TABLE,
    Key: marshall({ userId, movieId }),
  });

  await client.send(command);
}
