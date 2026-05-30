import { getServerSideConfig } from "@/app/config/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image) {
      return Response.json({ error: "no image" }, { status: 400 });
    }

    const config = getServerSideConfig();
    const apiKey = config.siliconFlowApiKey;
    if (!apiKey) {
      return Response.json(
        { error: "SiliconFlow API key not configured" },
        { status: 500 }
      );
    }

    // Strip data URL prefix if present, keep just base64
    const base64 = image.replace(/^data:image\/\w+;base64,/, "");

    const resp = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-OCR",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64}` },
              },
              { type: "text", text: "<image>\nFree OCR." },
            ],
          },
        ],
        max_tokens: 4096,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return Response.json({ error: err }, { status: resp.status });
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";

    return Response.json({ text });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "OCR failed" },
      { status: 500 }
    );
  }
}
