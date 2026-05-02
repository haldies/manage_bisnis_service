import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { purchaseToken, packageName, productId } = req.body;

  if (!purchaseToken || !packageName || !productId) {
    return res.status(400).json({
      error: "purchaseToken, packageName, and productId are required",
    });
  }

  try {
    // In production: validate against Google Play API using service account
    // const auth = new GoogleAuth({ credentials: JSON.parse(serviceAccountJson), scopes: [...] });
    // const client = await auth.getClient();
    // const { data } = await client.request({
    //   url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`,
    // });
    // const status = data.paymentState === 1 ? 'active' : 'expired';
    // Update in Supabase: await supabase.from('subscription_purchases').update({ status, last_validated_at: new Date() }).eq('purchase_token', purchaseToken);

    // Mock response:
    const mockStatus = Math.random() > 0.2 ? "active" : "expired";
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);

    return res.status(200).json({
      data: {
        token: purchaseToken,
        status: mockStatus,
        expiry_date: expiry.toISOString(),
      },
      message: `Subscription validated — status: ${mockStatus}`,
    });
  } catch {
    return res.status(500).json({ error: "Failed to validate with Google Play API" });
  }
}
