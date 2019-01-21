import { DynamoDBStreamHandler, AttributeValue } from 'aws-lambda';
import { Verifier } from 'tbv/lib/verifier';

export const handler: DynamoDBStreamHandler = async (event, context) => {
  for (const record of event.Records) {
    console.log('=========== RECORD ==========');
    console.log(JSON.stringify(record.dynamodb.OldImage, null, 2));
    console.log(JSON.stringify(record.dynamodb.NewImage, null, 2));

    const newItem: Item<PackageVersion> = record.dynamodb.NewImage;

    if (newItem && newItem.name && newItem.version) {
      console.log('--- verifying ---');
      const name = newItem.name.S;
      const version = newItem.version.S;
      console.log({ name, version });

      const verifier = new Verifier();
      verifier.on('failure', console.error);
      verifier.on('warning', console.error);
      verifier.on('notice', console.log);
      verifier.on('trace', console.log);

      try {
        const result = await verifier.verify(name, version);
        console.log({ result });
      } catch (err) {
        console.error(err);
      }
    }
  }
};

type Item<T> = { [key in keyof T]?: AttributeValue };

export type PackageVersion = {
  name: string;
  version: string;
  algo: string;
  status: Status;
};

export enum Status {
  'unknown' = 'unknown',
  'pending' = 'pending',
  'verified' = 'verified',
  'unverified' = 'unverified',
}
