import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type Stripe from "stripe";

const cognitoRegion = process.env.COGNITO_REGION || process.env.AWS_REGION || "";
const userPoolId = process.env.COGNITO_USER_POOL_ID || "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const tenantsTable = process.env.TENANTS_TABLE || "";
const entitlementsTable = process.env.ENTITLEMENTS_TABLE || "";
const awsRegion = process.env.AWS_REGION || process.env.COGNITO_REGION || "";

const PLAN_CAPS: Record<string, { requestsPerMonth: number; tokensPerMonth: number }> = {
  free: { requestsPerMonth: 100, tokensPerMonth: 200000 },
  core: { requestsPerMonth: 500, tokensPerMonth: 2000000 },
  professional: { requestsPerMonth: 2000, tokensPerMonth: 10000000 },
};

const ddb = awsRegion ? new DynamoDBClient({ region: awsRegion }) : null;

const normalizePlan = (value: unknown) => {
  const plan = String(value || "free").toLowerCase().trim();
  if (plan.includes("professional") || plan.includes("pro")) return "professional";
  if (plan.includes("core")) return "core";
  return "free";
};

const inferPlanFromText = (...values: Array<unknown>) => {
  for (const value of values) {
    const normalized = normalizePlan(value);
    if (normalized !== "free") return normalized;
  }
  return normalizePlan(values[0]);
};

const toIsoFromEpoch = (epochSeconds?: number | null) =>
  typeof epochSeconds === "number" && Number.isFinite(epochSeconds)
    ? new Date(epochSeconds * 1000).toISOString()
    : null;

const updateCognitoUser = async (email: string, attributes: Record<string, string>) => {
  if (!cognitoRegion || !userPoolId) {
    return;
  }

  const client = new CognitoIdentityProviderClient({ region: cognitoRegion });
  const command = new AdminUpdateUserAttributesCommand({
    UserPoolId: userPoolId,
    Username: email,
    UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({ Name, Value })),
  });

  await client.send(command);
};

const findTenantByField = async (field: string, value: string) => {
  if (!ddb || !tenantsTable || !field || !value) return null;
  const result = await ddb.send(
    new ScanCommand({
      TableName: tenantsTable,
      FilterExpression: "#field = :value",
      ExpressionAttributeNames: { "#field": field },
      ExpressionAttributeValues: marshall({ ":value": value }),
      Limit: 1,
    })
  );
  const first = result.Items?.[0];
  return first ? (unmarshall(first) as Record<string, unknown>) : null;
};

const updateTenant = async (tenantId: string, values: Record<string, unknown>) => {
  if (!ddb || !tenantsTable || !tenantId) return;

  const now = new Date().toISOString();
  const cleaned = Object.entries(values).reduce<Record<string, unknown>>((acc, [k, v]) => {
    if (v !== undefined) acc[k] = v;
    return acc;
  }, {});
  cleaned.updatedAt = now;

  const updateKeys = Object.keys(cleaned);
  if (!updateKeys.length) return;

  const names: Record<string, string> = {};
  const marshalledValues: Record<string, unknown> = {};
  const expressions: string[] = [];

  for (const key of updateKeys) {
    names[`#${key}`] = key;
    marshalledValues[`:${key}`] = cleaned[key];
    expressions.push(`#${key} = :${key}`);
  }

  await ddb.send(
    new UpdateItemCommand({
      TableName: tenantsTable,
      Key: marshall({ tenantId }),
      UpdateExpression: `SET ${expressions.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: marshall(marshalledValues, { removeUndefinedValues: true }),
    })
  );
};

const writeEntitlements = async ({
  tenantId,
  plan,
  isActive,
  stripeSubId,
  renewsAt,
}: {
  tenantId: string;
  plan: string;
  isActive: boolean;
  stripeSubId?: string;
  renewsAt?: string | null;
}) => {
  if (!ddb || !entitlementsTable || !tenantId) return;
  const caps = PLAN_CAPS[normalizePlan(plan)] || PLAN_CAPS.free;
  await ddb.send(
    new PutItemCommand({
      TableName: entitlementsTable,
      Item: marshall(
        {
          tenantId,
          plan: normalizePlan(plan),
          isActive,
          stripeSubId: stripeSubId || undefined,
          renewsAt: renewsAt || undefined,
          llmRequestsPerMonth: caps.requestsPerMonth,
          llmTokensPerMonth: caps.tokensPerMonth,
          updatedAt: new Date().toISOString(),
        },
        { removeUndefinedValues: true }
      ),
    })
  );
};

const resolveCustomerEmail = async (customerId: string, fallbackEmail = "") => {
  if (fallbackEmail) return fallbackEmail;
  if (!customerId) return "";
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !("deleted" in customer)) {
      return customer.email || "";
    }
  } catch {
    // no-op
  }
  return "";
};

const resolveTenantForBilling = async ({
  email,
  customerId,
}: {
  email?: string;
  customerId?: string;
}) => {
  let tenant = null;
  if (customerId) {
    tenant = await findTenantByField("stripeCustomerId", customerId);
  }
  if (!tenant && email) {
    tenant = await findTenantByField("primaryUserEmail", email);
  }
  return tenant;
};

const statusToActive = (status: string) => ["active", "trialing"].includes(String(status || "").toLowerCase());

const updateTenantAndEntitlements = async ({
  email,
  customerId,
  subscriptionId,
  status,
  plan,
  renewsAt,
}: {
  email?: string;
  customerId?: string;
  subscriptionId?: string;
  status: string;
  plan: string;
  renewsAt?: string | null;
}) => {
  const tenant = await resolveTenantForBilling({ email, customerId });
  const tenantId = typeof tenant?.tenantId === "string" ? tenant.tenantId : "";
  if (!tenantId) return;

  await updateTenant(tenantId, {
    plan: normalizePlan(plan),
    stripeCustomerId: customerId || tenant?.stripeCustomerId,
    stripeSubId: subscriptionId || tenant?.stripeSubId,
    status,
    renewsAt: renewsAt || null,
  });

  await writeEntitlements({
    tenantId,
    plan,
    isActive: statusToActive(status),
    stripeSubId: subscriptionId,
    renewsAt: renewsAt || null,
  });
};

export async function POST(request: Request) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = typeof session.customer === "string" ? session.customer : "";
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : "";
      const email = await resolveCustomerEmail(
        customerId,
        session.customer_email || session.customer_details?.email || (typeof session.metadata?.email === "string" ? session.metadata.email : "")
      );

      let subscription: Stripe.Subscription | null = null;
      if (subscriptionId) {
        try {
          subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price"],
          });
        } catch {
          subscription = null;
        }
      }

      const plan = inferPlanFromText(
        session.metadata?.plan,
        subscription?.metadata?.plan,
        subscription?.items?.data?.[0]?.price?.lookup_key,
        subscription?.items?.data?.[0]?.price?.nickname
      );
      const renewsAt = toIsoFromEpoch(subscription?.current_period_end ?? null);

      if (email) {
        await updateCognitoUser(email, {
          "custom:plan": plan || "unknown",
          "custom:plan_interval":
            typeof session.metadata?.plan_interval === "string"
              ? session.metadata.plan_interval
              : subscription?.items?.data?.[0]?.price?.recurring?.interval || "unknown",
          "custom:stripe_cus_id": customerId || "unknown",
          "custom:stripe_sub_id": subscriptionId || "unknown",
          "custom:sub_status": subscription?.status || "active",
        });
      }

      await updateTenantAndEntitlements({
        email,
        customerId,
        subscriptionId,
        status: subscription?.status || "active",
        plan,
        renewsAt,
      });
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : "";
      const email = await resolveCustomerEmail(customerId);
      const plan = inferPlanFromText(
        subscription.metadata?.plan,
        subscription.items?.data?.[0]?.price?.lookup_key,
        subscription.items?.data?.[0]?.price?.nickname
      );
      const renewsAt = toIsoFromEpoch(subscription.current_period_end ?? null);

      if (email) {
        await updateCognitoUser(email, {
          "custom:plan": plan,
          "custom:stripe_cus_id": customerId || "unknown",
          "custom:stripe_sub_id": subscription.id || "unknown",
          "custom:sub_status": subscription.status || "unknown",
        });
      }

      await updateTenantAndEntitlements({
        email,
        customerId,
        subscriptionId: subscription.id,
        status: subscription.status || (event.type === "customer.subscription.deleted" ? "canceled" : "unknown"),
        plan,
        renewsAt,
      });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : "";
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : "";
      const email = await resolveCustomerEmail(customerId);

      let subscription: Stripe.Subscription | null = null;
      if (subscriptionId) {
        try {
          subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
        } catch {
          subscription = null;
        }
      }

      const plan = inferPlanFromText(
        subscription?.metadata?.plan,
        subscription?.items?.data?.[0]?.price?.lookup_key,
        subscription?.items?.data?.[0]?.price?.nickname
      );
      const status = subscription?.status || "past_due";
      const renewsAt = toIsoFromEpoch(subscription?.current_period_end ?? null);

      if (email) {
        await updateCognitoUser(email, {
          "custom:plan": plan,
          "custom:stripe_cus_id": customerId || "unknown",
          "custom:stripe_sub_id": subscriptionId || "unknown",
          "custom:sub_status": status,
        });
      }

      await updateTenantAndEntitlements({
        email,
        customerId,
        subscriptionId,
        status,
        plan,
        renewsAt,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "webhook_handler_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
