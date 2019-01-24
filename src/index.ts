import { DynamoDBStreamHandler, AttributeValue } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { Verifier } from 'tbv/lib/verifier';

const currentAlgo = 'tbv@0.2.0';

export const handler: DynamoDBStreamHandler = async event => {
  for (const record of event.Records) {
    const newItem: Item<PackageVersion> = record.dynamodb.NewImage;

    if (
      newItem &&
      newItem.name &&
      newItem.version &&
      newItem.algo &&
      newItem.status
    ) {
      const name = newItem.name.S;
      const version = newItem.version.S;
      const algo = newItem.algo.S;
      const status = newItem.status.S as PackageVersion['status'];

      if (
        status === 'unknown' ||
        (algo !== currentAlgo && status !== 'verified')
      ) {
        await setPackage({ name, version, algo, status: 'pending' });

        const verifier = new Verifier();

        try {
          const result = await verifier.verify(name, version);
          await setPackage({
            name,
            version,
            algo: currentAlgo,
            status: result ? 'verified' : 'unverified',
          });
        } catch (err) {
          console.error(err);
          await setPackage({ name, version, algo, status: 'error' });
        }
      }
    }
  }
};

async function setPackage(data: PackageVersion): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const ddb = new AWS.DynamoDB({
        region: 'us-east-2',
        apiVersion: '2012-10-18',
      });

      const params: AWS.DynamoDB.PutItemInput = {
        TableName: 'packages',
        Item: {
          name: { S: data.name },
          version: { S: data.version },
          algo: { S: data.algo },
          status: { S: data.status },
        },
      };
      ddb.putItem(params, err => (!!err ? reject(err) : resolve()));
    } catch (err) {
      reject(err);
    }
  });
}

type Item<T> = { [key in keyof T]?: AttributeValue };

export type PackageVersion = {
  name: string;
  version: string;
  algo: string;
  status:
    | 'unknown'
    | 'pending'
    | 'verified'
    | 'unverified'
    | 'timeout'
    | 'error';
};
