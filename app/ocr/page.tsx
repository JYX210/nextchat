"use client";

import { useState, useRef, useCallback } from "react";
import { ocrImage } from "./actions";

export default function OcrPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
    setCameraReady(false);
  }, []);

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video metadata to load before allowing capture
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            setCameraReady(true);
            resolve();
          };
        });
      }
      setCameraOn(true);
    } catch {
      setError("无法打开相机，请在手机浏览器中打开并授权");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    setImageUrl(canvas.toDataURL("image/png"));
    stopCamera();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resizeImage = (src: string, maxDim = 1200): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim) {
          resolve(src);
          return;
        }
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        c.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.src = src;
    });
  };

  const runOcr = async () => {
    if (!imageUrl) return;
    setLoading(true);
    setProgress("图片处理中...");
    setError("");
    try {
      const small = await resizeImage(imageUrl, 1200);
      setProgress("识别中...");
      const data = await ocrImage(small);
      if (data.error) {
        setError(data.error);
        setProgress("");
      } else if (data.text) {
        setOcrText(data.text);
        setProgress("");
      } else {
        setError("未识别到文字，请确保图片清晰");
        setProgress("");
      }
    } catch (err) {
      setError("OCR 失败: " + (err instanceof Error ? err.message : ""));
      setProgress("");
    }
    setLoading(false);
  };

  const copyText = () => {
    navigator.clipboard.writeText(ocrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={s.container}>
      <h1 style={s.title}>OCR 识图</h1>
      <p style={s.sub}>拍照或选图，DeepSeek-OCR 精准识别</p>

      <div style={s.btns}>
        <button onClick={startCamera} style={s.btn}>拍照</button>
        <button onClick={() => fileRef.current?.click()} style={s.btn}>选图片</button>
        <input ref={fileRef} type="file" accept="image/*"
          onChange={handleFile} style={{ display: "none" }} />
      </div>

      {cameraOn && (
        <div style={s.camWrap}>
          <video ref={videoRef} autoPlay playsInline style={s.video} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div style={s.camBtns}>
            <button onClick={capturePhoto} style={s.btn} disabled={!cameraReady}>拍摄</button>
            <button onClick={stopCamera} style={s.btn2}>取消</button>
          </div>
        </div>
      )}

      {imageUrl && (
        <div style={s.preview}>
          <img src={imageUrl} alt="" style={s.img} />
          <div style={s.previewBtns}>
            <button onClick={runOcr} disabled={loading}
              style={{ ...s.btn, ...(loading ? s.btnOff : {}) }}>
              {loading ? progress || "识别中..." : "开始识别"}
            </button>
            <button onClick={() => { setImageUrl(null); setOcrText(""); setError(""); }}
              style={s.btn2}>重选</button>
          </div>
        </div>
      )}

      {error && <p style={s.err}>{error}</p>}

      {ocrText && (
        <div style={s.result}>
          <div style={s.resultHead}>
            <strong>结果：</strong>
            <button onClick={copyText} style={s.btnSm}>{copied ? "已复制" : "复制"}</button>
          </div>
          <pre style={s.text}>{ocrText}</pre>
        </div>
      )}

      <a href="/" style={s.back}>← 返回聊天</a>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 500, margin: "0 auto", padding: "20px 16px 40px",
    fontFamily: "system-ui, -apple-system, sans-serif" },
  title: { fontSize: 24, margin: "0 0 4px" },
  sub: { color: "#666", fontSize: 14, margin: "0 0 20px" },
  btns: { display: "flex", gap: 10, marginBottom: 16 },
  btn: { padding: "10px 20px", background: "#1677ff", color: "#fff",
    border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer" },
  btn2: { padding: "10px 20px", background: "#f0f0f0", color: "#333",
    border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer" },
  btnOff: { opacity: 0.5, cursor: "not-allowed" },
  btnSm: { padding: "4px 12px", background: "#1677ff", color: "#fff",
    border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" },
  camWrap: { marginBottom: 16 },
  video: { width: "100%", borderRadius: 8, background: "#000" },
  camBtns: { display: "flex", gap: 10, marginTop: 8 },
  preview: { marginBottom: 16 },
  img: { width: "100%", borderRadius: 8, marginBottom: 8 },
  previewBtns: { display: "flex", gap: 10 },
  err: { color: "#ff4d4f", margin: "8px 0", fontSize: 14 },
  result: { background: "#f6f8fa", padding: 12, borderRadius: 8, marginBottom: 16 },
  resultHead: { display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 8 },
  text: { whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 15,
    lineHeight: 1.6, margin: 0 },
  back: { display: "block", textAlign: "center", color: "#1677ff",
    textDecoration: "none", fontSize: 14 },
};
