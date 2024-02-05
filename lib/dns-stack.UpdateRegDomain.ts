import { type AWSError, Route53Domains } from "aws-sdk";
import { type PromiseResult } from "aws-sdk/lib/request";

const route53domains = new Route53Domains({ region: "us-east-1" }); // Route53Domains is only available in us-east-1

/**
 * the Hosted Zone name servers will create new name servers
 * which needs to be reflected in the domain registrar
 * so this function updates the list of name servers stored in the registered domain with the new ones
 */
const updateRegisteredNameServers = async (
  domain: string,
  nameServers: string
): Promise<
  PromiseResult<Route53Domains.Types.UpdateDomainNameserversResponse, AWSError>
> =>
  await route53domains
    .updateDomainNameservers({
      DomainName: domain,
      Nameservers: nameServers.split(",").map((ns) => ({ Name: ns })),
    })
    .promise();

export async function handler(event: any): Promise<any> {
  const { domain, nameServers } = event.ResourceProperties;

  switch (event.RequestType) {
    case "Create":
      await updateRegisteredNameServers(domain, nameServers);
      return { PhysicalResourceId: nameServers };

    case "Update":
      if (event.PhysicalResourceId !== nameServers)
        await updateRegisteredNameServers(domain, nameServers);
      return { PhysicalResourceId: nameServers };

    default:
  }
}
