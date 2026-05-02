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
    // In production: validate against Google Play API
    // const auth = new GoogleAuth({ credentials: ..., scopes: [...] });
    // const client = await auth.getClient();
    // const { data } = await client.request({
    //   url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`,
    // });
    // const status = data.purchaseState === 0 ? 'completed' : 'pending';
    // Update Supabase record

    const mockStatus = Math.random() > 0.1 ? "completed" : "refunded";

    return res.status(200).json({
      data: {
        token: purchaseToken,
        status: mockStatus,
      },
      message: `Purchase validated — status: ${mockStatus}`,
    });
  } catch {
    return res.status(500).json({ error: "Failed to validate with Google Play API" });
  }
}
