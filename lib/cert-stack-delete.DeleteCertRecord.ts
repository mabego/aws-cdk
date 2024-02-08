import { type AWSError, Route53 } from "aws-sdk";
import { type PromiseResult } from "aws-sdk/lib/request";
import {
  type ChangeResourceRecordSetsResponse,
  type ListResourceRecordSetsResponse,
} from "aws-sdk/clients/route53";

const route53 = new Route53({ region: "us-east-1" });
const certRecordType: string = "CNAME";
const certRecordTTL: number = 300;
const changeAction: string = "DELETE";

/**
 * AWS Certificate Manager creates a CNAME resource record set for certificate validation through DNS.
 * Currently, ACM cannot delete this record, which blocks the deletion of the stack's hosted zone:
 * https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/837.
 * This function deletes the CNAME record created by ACM.
 */
const deleteCertificateRecord = async (
  hostedZoneId: string,
  name: string,
  value: string,
): Promise<PromiseResult<ChangeResourceRecordSetsResponse, AWSError>> =>
  await route53
    .changeResourceRecordSets({
      HostedZoneId: hostedZoneId,
      ChangeBatch: {
        Changes: [
          {
            Action: changeAction,
            ResourceRecordSet: {
              Name: name,
              Type: certRecordType,
              TTL: certRecordTTL,
              ResourceRecords: [{ Value: value }],
            },
          },
        ],
      },
    })
    .promise();

const listResourceRecordSets = async (
  hostedZoneId: string,
): Promise<PromiseResult<ListResourceRecordSetsResponse, AWSError>> =>
  await route53.listResourceRecordSets({ HostedZoneId: hostedZoneId }).promise();

export async function handler(event: any): Promise<any> {
  const { hostedZoneId } = event.ResourceProperties;

  if (event.RequestType !== "Delete") {
    return;
  }

  const recordSetsList = await listResourceRecordSets(hostedZoneId);

  if (recordSetsList.ResourceRecordSets.length < 3) {
    return;
  }

  const certRecord = recordSetsList.ResourceRecordSets.find((r) => r.Type === certRecordType);

  let certRecordName: string | undefined;
  if (certRecord?.Name !== null) {
    certRecordName = certRecord?.Name;
  }

  let value: string | undefined;
  if (certRecord?.ResourceRecords !== null) {
    value = certRecord?.ResourceRecords?.find(Boolean)?.Value;
  }

  await deleteCertificateRecord(hostedZoneId, certRecordName!, value!);
}
