"use server";

import { getServerSideConfig } from "@/app/config/server";

export async function ocrImage(image: string): Promise<{ text?: string; error?: string }> {
  try {
    const config = getServerSideConfig();
    const apiKey = config.siliconFlowApiKey;
    if (!apiKey) {
      return { error: "SiliconFlow API key not configured" };
    }

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
      return { error: err };
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    return { text };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "OCR failed" };
  }
}
