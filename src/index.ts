import { DynamoDBStreamHandler } from 'aws-lambda';

export const handler: DynamoDBStreamHandler = (event, context) => {
  for (const record of event.Records) {
    console.log('=========== RECORD ==========');
    console.log(JSON.stringify(record.dynamodb.OldImage, null, 2));
    console.log(JSON.stringify(record.dynamodb.NewImage, null, 2));
  }
};
