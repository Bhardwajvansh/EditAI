import React, { useState, useRef, useEffect } from "react";
import { User, Bot, Download, RefreshCw, Maximize2, X } from "lucide-react";

const topics = [
  {
    "title": "Generate Image",
    "desc": "A futuristic city skyline at sunset with flying cars and neon lights"
  },
  {
    "title": "Edit Image",
    "desc": "Remove the red car from the street and replace it with a bicycle"
  },
  {
    "title": "Apply Filters",
    "desc": "Apply a vintage sepia filter to a portrait of a woman in a garden"
  },
  {
    "title": "Remove Background",
    "desc": "Isolate the person in the image and remove the background completely"
  },
  {
    "title": "Image Upscale",
    "desc": "Upscale a low-resolution image of a mountain landscape to 4K"
  },
  {
    "title": "Style Transfer",
    "desc": "Recreate a photo of a cat in the style of Van Gogh’s Starry Night"
  }
];

const UserLogo = () => (
  <span className="inline-flex w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 items-center justify-center shadow-md">
    <User size={22} color="white" style={{ display: "block" }} />
  </span>
);

const BotLogo = () => (
  <span className="inline-flex w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 items-center justify-center shadow-md">
    <Bot size={22} color="white" style={{ display: "block" }} />
  </span>
);

export default function App() {
  const [mode, setMode] = useState("generate");
  const [input, setInput] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [maskImage, setMaskImage] = useState(null);
  const [showMaskEditor, setShowMaskEditor] = useState(false);
  const [maskCanvasUrl, setMaskCanvasUrl] = useState(null);
  const [maskBrush, setMaskBrush] = useState("brush");
  const [maskBrushSize, setMaskBrushSize] = useState(24);
  const maskCanvasRef = useRef(null);
  const maskDrawing = useRef(false);
  const [maskDrawColor, setMaskDrawColor] = useState("rgba(255,0,0,0.7)");

  const [genModel, setGenModel] = useState("dall-e-2");
  const [genN, setGenN] = useState(1);
  const [genSize, setGenSize] = useState("1024x1024");
  const [genQuality, setGenQuality] = useState("auto");
  const [genBackground, setGenBackground] = useState("auto");
  const [genOutputFormat, setGenOutputFormat] = useState("png");
  const [genOutputCompression, setGenOutputCompression] = useState(100);
  const [genModeration, setGenModeration] = useState("auto");
  const [genResponseFormat, setGenResponseFormat] = useState("url");
  const [genStyle, setGenStyle] = useState("vivid");
  const [genUser, setGenUser] = useState("");

  const [model, setModel] = useState("dall-e-2");
  const [background, setBackground] = useState("auto");
  const [quality, setQuality] = useState("auto");
  const [size, setSize] = useState("1024x1024");

  const [formError, setFormError] = useState("");
  const [variationImage, setVariationImage] = useState(null);
  const [variationN, setVariationN] = useState(1);
  const [variationSize, setVariationSize] = useState("1024x1024");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chat, setChat] = useState([]);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [expandedImageIdx, setExpandedImageIdx] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const chatEndRef = useRef(null);

  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat, loading]);

  async function generateImage(prompt, isRegenerate = false, imageIdx = null) {
    setLoading(true);
    setError("");
    try {
      // Build request body based on selected model and options
      const body = {
        prompt,
        model: genModel,
        n: genN,
        size: genSize,
      };
      // Quality
      if (
        (genModel === "gpt-image-1" && genQuality !== "auto") ||
        (genModel === "dall-e-3" && genQuality !== "auto") ||
        (genModel === "dall-e-2" && genQuality === "standard")
      ) {
        body.quality = genQuality;
      }
      // Background (gpt-image-1)
      if (genModel === "gpt-image-1") {
        body.background = genBackground;
        body.output_format = genOutputFormat;
        if ((genOutputFormat === "jpeg" || genOutputFormat === "webp") && genOutputCompression !== 100) {
          body.output_compression = genOutputCompression;
        }
        body.moderation = genModeration;
      }
      // Response format (dall-e-2, dall-e-3)
      if ((genModel === "dall-e-2" || genModel === "dall-e-3") && genResponseFormat) {
        body.response_format = genResponseFormat;
      }
      // Style (dall-e-3)
      if (genModel === "dall-e-3") {
        body.style = genStyle;
      }
      // User
      if (genUser && genUser.trim().length > 0) {
        body.user = genUser.trim();
      }

      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to generate image");
      }
      const data = await res.json();
      // Parse response: url or b64_json, single or multiple images
      let images = [];
      if (data.data && Array.isArray(data.data)) {
        for (const img of data.data) {
          if (img.url) images.push(img.url);
          else if (img.b64_json) images.push(`data:image/png;base64,${img.b64_json}`);
        }
      }
      if (images.length === 0) {
        setError("No image returned.");
        setLoading(false);
        return;
      }
      if (images.length === 1) {
        if (isRegenerate && imageIdx !== null) {
          setChat((prev) => {
            const updated = [...prev];
            updated[imageIdx] = { type: "image", content: images[0], prompt };
            return updated;
          });
        } else {
          setChat((prev) => [
            ...prev,
            { type: "image", content: images[0], prompt }
          ]);
        }
      } else {
        setChat((prev) => [
          ...prev,
          { type: "image", content: images, prompt }
        ]);
      }
    } catch (err) {
      setError(err.message || "Error generating image.");
    } finally {
      setLoading(false);
    }
  }

  // Mode toggle handler
  function handleModeChange(newMode) {
    setMode(newMode);
    setFormError("");
    setError("");
    // Reset all form fields on mode change
    setUploadedImage(null);
    setMaskImage(null);

    // Reset GENERATE options
    setGenModel("dall-e-2");
    setGenN(1);
    setGenSize("1024x1024");
    setGenQuality("auto");
    setGenBackground("auto");
    setGenOutputFormat("png");
    setGenOutputCompression(100);
    setGenModeration("auto");
    setGenResponseFormat("url");
    setGenStyle("vivid");
    setGenUser("");

    // Reset EDIT options
    setModel("dall-e-2");
    setBackground("auto");
    setQuality("auto");
    setSize("1024x1024");

    setInput("");
    setVariationImage(null);
    setVariationN(1);
    setVariationSize("1024x1024");
  }

  // File input handlers
  function handleImageUpload(e) {
    const file = e.target.files[0];
    setUploadedImage(file);
  }
  function handleMaskUpload(e) {
    const file = e.target.files[0];
    setMaskImage(file);
  }
  function handleVariationImageUpload(e) {
    const file = e.target.files[0];
    setVariationImage(file);
  }

  // Unified form submit handler
  async function handleFormSubmit(e) {
    e.preventDefault();
    setFormError("");
    setError("");
    if (mode === "variation") {
      // Validate variation image
      if (!variationImage) {
        setFormError("Please upload a PNG image for variation.");
        return;
      }
      if (variationImage.type !== "image/png") {
        setFormError("Variation image must be a PNG file.");
        return;
      }
      if (variationImage.size > 4 * 1024 * 1024) {
        setFormError("Variation image must be less than 4MB.");
        return;
      }
      if (variationN < 1 || variationN > 10) {
        setFormError("Number of variations must be between 1 and 10.");
        return;
      }
      // Optionally: check if image is square (client-side)
      const checkSquare = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (ev) {
          const img = new window.Image();
          img.onload = function () {
            resolve(img.width === img.height);
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(variationImage);
      });
      if (!checkSquare) {
        setFormError("Variation image must be square (width = height).");
        return;
      }
      setChat((prev) => [
        ...prev,
        { type: "user", content: "Create variation" }
      ]);
      await createVariation();
      return;
    }
    if (!input.trim()) {
      setFormError("Please enter a prompt.");
      return;
    }
    if (mode === "edit" && !uploadedImage) {
      setFormError("Please upload an image to edit.");
      return;
    }
    setChat((prev) => [
      ...prev,
      { type: "user", content: input }
    ]);
    setInput("");
    if (mode === "generate") {
      await generateImage(input, false, null);
    } else {
      await editImage(input);
    }
  }

  // Image Variation API integration
  async function createVariation() {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", variationImage);
      formData.append("n", variationN);
      formData.append("size", variationSize);
      formData.append("model", "dall-e-2");
      formData.append("response_format", "url");
      const res = await fetch("https://api.openai.com/v1/images/variations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });
      if (!res.ok) {
        let err;
        try {
          err = await res.json();
        } catch {
          err = { error: { message: "Failed to create variation" } };
        }
        throw new Error(err.error?.message || "Failed to create variation");
      }
      const data = await res.json();
      if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
        setError("No variation images returned.");
        setLoading(false);
        return;
      }
      // Show all returned images in chat (as a grid if n > 1)
      if (data.data.length === 1) {
        setChat((prev) => [
          ...prev,
          { type: "image", content: data.data[0].url, prompt: "Variation" }
        ]);
      } else {
        setChat((prev) => [
          ...prev,
          { type: "image", content: data.data.map(img => img.url), prompt: "Variation" }
        ]);
      }
    } catch (err) {
      setError(err.message || "Error creating variation.");
    } finally {
      setLoading(false);
    }
  }

  // Image Edit API integration
  async function editImage(prompt) {
    setLoading(true);
    setError("");
    try {
      // Validate file types and sizes
      if (model === "dall-e-2") {
        if (uploadedImage.type !== "image/png") {
          setFormError("dall-e-2 requires a PNG image.");
          setLoading(false);
          return;
        }
        if (uploadedImage.size > 4 * 1024 * 1024) {
          setFormError("dall-e-2 image must be less than 4MB.");
          setLoading(false);
          return;
        }
        if (maskImage && maskImage.type !== "image/png") {
          setFormError("Mask must be a PNG file.");
          setLoading(false);
          return;
        }
        if (maskImage && maskImage.size > 4 * 1024 * 1024) {
          setFormError("Mask must be less than 4MB.");
          setLoading(false);
          return;
        }
      } else if (model === "gpt-image-1") {
        const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
        if (!allowedTypes.includes(uploadedImage.type)) {
          setFormError("gpt-image-1 supports PNG, JPG, or WEBP images.");
          setLoading(false);
          return;
        }
        if (uploadedImage.size > 25 * 1024 * 1024) {
          setFormError("gpt-image-1 image must be less than 25MB.");
          setLoading(false);
          return;
        }
        if (maskImage && maskImage.type !== "image/png") {
          setFormError("Mask must be a PNG file.");
          setLoading(false);
          return;
        }
        if (maskImage && maskImage.size > 4 * 1024 * 1024) {
          setFormError("Mask must be less than 4MB.");
          setLoading(false);
          return;
        }
      }

      const formData = new FormData();
      formData.append("image", uploadedImage);
      if (maskImage) formData.append("mask", maskImage);
      formData.append("prompt", prompt);
      formData.append("model", model);
      formData.append("size", size);

      if (model === "gpt-image-1") {
        formData.append("background", background);
        formData.append("quality", quality);
        // gpt-image-1 always returns base64
      } else {
        // dall-e-2: allow user to choose url or b64_json? For now, use url for smaller payloads
        formData.append("response_format", "url");
      }

      const res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let err;
        try {
          err = await res.json();
        } catch {
          err = { error: { message: "Failed to edit image" } };
        }
        throw new Error(err.error?.message || "Failed to edit image");
      }
      const data = await res.json();
      // Handle both url and b64_json responses
      let imageUrl = "";
      if (data.data?.[0]?.url) {
        imageUrl = data.data[0].url;
      } else if (data.data?.[0]?.b64_json) {
        imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
      } else {
        setError("No image returned.");
        setLoading(false);
        return;
      }
      setChat((prev) => [
        ...prev,
        { type: "image", content: imageUrl, prompt }
      ]);
    } catch (err) {
      setError(err.message || "Error editing image.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload(url) {
    const link = document.createElement("a");
    link.href = url;
    link.download = "ai-image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleRegenerate(prompt, idx) {
    if (mode === "generate") {
      generateImage(prompt, true, idx);
    } else {
      // For edit mode, reuse last uploaded image/mask/model/options
      editImage(prompt);
    }
  }

  function handleExpand(idx, imageIdx = null) {
    setExpandedIdx(idx);
    setExpandedImageIdx(imageIdx);
    document.body.style.overflow = "hidden";
  }

  function handleCloseExpand() {
    setExpandedIdx(null);
    setExpandedImageIdx(null);
    document.body.style.overflow = "";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f6ff] to-[#fbefff] flex items-center justify-center">
      <div className="w-full min-h-screen max-w-7xl bg-white rounded-sm border border-gray-200 shadow-sm p-4 flex flex-col">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-black mb-1 animate-fade-in">
            EditAI
          </h1>
          <p className="text-sm text-black animate-fade-in-slow">
            Describe an image or select a tool. Your prompts appear on the right, images on the left.
          </p>
        </div>

        <div className="flex-1 flex flex-col mb-4">
          <div className={`flex-1 overflow-y-auto rounded-sm bg-gray-50 border border-gray-200 shadow-sm px-3 py-3 chat-scrollbar ${expandedIdx !== null ? "blur-sm pointer-events-none select-none" : ""}`}
            style={{ minHeight: 320, maxHeight: 420 }}
          >
            {chat.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                {topics.map((topic, idx) => (
                  <div
                    key={topic.title}
                    className="bg-white rounded-sm shadow-sm p-4 transition-transform duration-300 hover:scale-105 hover:shadow-md border border-gray-200 animate-fade-in"
                    style={{ animationDelay: `${idx * 80}ms` }}
                    onClick={() => setInput(topic.desc)}
                  >
                    <div className="font-semibold text-black mb-1">{topic.title}</div>
                    <div className="text-black">{topic.desc}</div>
                  </div>
                ))}
              </div>
            )}
            {chat.map((msg, idx) => (
              <div
                key={idx}
                className={`flex w-full mb-4 items-end ${msg.type === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.type === "image" ? (
                  <div className="flex flex-col items-start animate-slide-in-left">
                    <div className="flex items-center mb-1 gap-2">
                      <BotLogo />
                      {/* Support single or multiple images */}
                      {Array.isArray(msg.content) ? (
                        <div className="flex flex-wrap gap-2">
                          {msg.content.map((imgUrl, i) => (
                            <div key={i} className="flex flex-col items-center">
                              <img
                                src={imgUrl}
                                alt={`Variation ${i + 1}`}
                                className="rounded-sm shadow-sm"
                                style={{ maxWidth: 140, maxHeight: 140 }}
                              />
                              <div className="flex gap-1 mt-1">
                                <button
                                  className="flex items-center justify-center p-1 rounded-sm bg-gray-100 hover:bg-gray-200 transition-colors text-black shadow-sm"
                                  onClick={() => handleDownload(imgUrl)}
                                  title="Download"
                                  type="button"
                                  style={{ width: 28, height: 28 }}
                                >
                                  <Download size={16} />
                                </button>
                                <button
                                  className="flex items-center justify-center p-1 rounded-sm bg-gray-100 hover:bg-gray-200 transition-colors text-black shadow-sm"
                                  onClick={() => handleExpand(idx, i)}
                                  title="Expand"
                                  type="button"
                                  style={{ width: 28, height: 28 }}
                                >
                                  <Maximize2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <img
                          src={msg.content}
                          alt="Generated"
                          className="rounded-sm shadow-sm"
                          style={{ maxWidth: 280, maxHeight: 280 }}
                        />
                      )}
                    </div>
                    {/* Download/Regenerate/Expand for single image only */}
                    {!Array.isArray(msg.content) && (
                      <div className="flex gap-2 mt-1 ml-10">
                        <button
                          className="flex items-center justify-center p-2 rounded-sm bg-gray-100 hover:bg-gray-200 transition-colors text-black shadow-sm"
                          onClick={() => handleDownload(msg.content)}
                          title="Download"
                          type="button"
                          style={{ width: 36, height: 36 }}
                        >
                          <Download size={20} />
                        </button>
                        <button
                          className="flex items-center justify-center p-2 rounded-sm bg-gray-100 hover:bg-gray-200 transition-colors text-black shadow-sm"
                          onClick={() => handleRegenerate(msg.prompt, idx)}
                          title="Regenerate"
                          type="button"
                          disabled={loading}
                          style={{ width: 36, height: 36 }}
                        >
                          <RefreshCw size={20} />
                        </button>
                        <button
                          className="flex items-center justify-center p-2 rounded-sm bg-gray-100 hover:bg-gray-200 transition-colors text-black shadow-sm"
                          onClick={() => handleExpand(idx)}
                          title="Expand"
                          type="button"
                          style={{ width: 36, height: 36 }}
                        >
                          <Maximize2 size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center animate-slide-in-right gap-2">
                    <div className="bg-gray-100 text-black px-4 py-2 rounded-sm shadow-sm max-w-xs text-right break-words">
                      {msg.content}
                    </div>
                    <UserLogo />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex w-full mb-4 items-end justify-start">
                <div className="flex items-center animate-fade-in">
                  <div className="loader mr-2" />
                  <div className="text-black">Generating image...</div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-center animate-fade-in mb-2">{error}</div>
        )}

        <form
          className="flex flex-col gap-2 bg-white rounded-sm border border-gray-200 px-3 py-2 shadow-sm"
          onSubmit={handleFormSubmit}
        >
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              className={`px-4 py-2 rounded-sm font-medium shadow-sm transition-colors duration-200 ${mode === "generate"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-blue-300 text-black"
                }`}
              onClick={() => handleModeChange("generate")}
              disabled={loading}
            >
              Generate
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-sm font-medium shadow-sm transition-colors duration-200 ${mode === "edit"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-blue-300 text-black"
                }`}
              onClick={() => handleModeChange("edit")}
              disabled={loading}
            >
              Edit
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-sm font-medium shadow-sm transition-colors duration-200 ${mode === "variation"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-blue-300 text-black"
                }`}
              onClick={() => handleModeChange("variation")}
              disabled={loading}
            >
              Variation
            </button>
          </div>
          {/* Prompt Input (for generate and edit modes) */}
          {(mode === "generate" || mode === "edit") && (
            <input
              className="flex-1 bg-transparent outline-none text-black placeholder-gray-400 text-lg px-2 py-2 mb-1"
              placeholder={
                mode === "generate"
                  ? "Describe the image you want to create..."
                  : "Describe how you want to edit the image..."
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={
                (mode === "generate" && genModel === "gpt-image-1") ? 32000 :
                  (mode === "generate" && genModel === "dall-e-3") ? 4000 :
                    1000
              }
              disabled={loading}
            />
          )}
          {/* Generate Mode Fields */}
          {mode === "generate" && (
            <div className="flex flex-col gap-2 mb-1">
              {/* Model Selection */}
              <label className="text-black font-medium">
                Model:
                <select
                  value={genModel}
                  onChange={e => setGenModel(e.target.value)}
                  disabled={loading}
                  className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                >
                  <option value="dall-e-2">dall-e-2</option>
                  <option value="dall-e-3">dall-e-3</option>
                  <option value="gpt-image-1">gpt-image-1</option>
                </select>
              </label>
              {/* Background (gpt-image-1 only) */}
              {genModel === "gpt-image-1" && (
                <label className="text-black font-medium">
                  Background:
                  <select
                    value={genBackground}
                    onChange={e => setGenBackground(e.target.value)}
                    disabled={loading}
                    className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                  >
                    <option value="auto">auto</option>
                    <option value="transparent">transparent</option>
                    <option value="opaque">opaque</option>
                  </select>
                </label>
              )}
              {/* Output Format (gpt-image-1 only) */}
              {genModel === "gpt-image-1" && (
                <label className="text-black font-medium">
                  Output Format:
                  <select
                    value={genOutputFormat}
                    onChange={e => setGenOutputFormat(e.target.value)}
                    disabled={loading}
                    className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                  >
                    <option value="png">png</option>
                    <option value="jpeg">jpeg</option>
                    <option value="webp">webp</option>
                  </select>
                </label>
              )}
              {/* Output Compression (gpt-image-1 + jpeg/webp only) */}
              {genModel === "gpt-image-1" && (genOutputFormat === "jpeg" || genOutputFormat === "webp") && (
                <label className="text-black font-medium">
                  Output Compression:
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={genOutputCompression}
                    onChange={e => setGenOutputCompression(Number(e.target.value))}
                    disabled={loading}
                    className="ml-2 w-16 px-2 py-1 rounded-sm border border-gray-300"
                  />
                  <span className="ml-1 text-xs text-black">%</span>
                </label>
              )}
              {/* Moderation (gpt-image-1 only) */}
              {genModel === "gpt-image-1" && (
                <label className="text-black font-medium">
                  Moderation:
                  <select
                    value={genModeration}
                    onChange={e => setGenModeration(e.target.value)}
                    disabled={loading}
                    className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                  >
                    <option value="auto">auto</option>
                    <option value="low">low</option>
                  </select>
                </label>
              )}
              {/* Style (dall-e-3 only) */}
              {genModel === "dall-e-3" && (
                <label className="text-black font-medium">
                  Style:
                  <select
                    value={genStyle}
                    onChange={e => setGenStyle(e.target.value)}
                    disabled={loading}
                    className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                  >
                    <option value="vivid">vivid</option>
                    <option value="natural">natural</option>
                  </select>
                </label>
              )}
              {/* Advanced Options Dropdown */}
              <div>
                <button
                  type="button"
                  className="text-black font-medium underline text-sm mb-1"
                  onClick={() => setShowAdvanced((v) => !v)}
                  style={{ outline: "none" }}
                >
                  {showAdvanced ? "Hide" : "Show"} Advanced Options
                </button>
                {showAdvanced && (
                  <div className="flex flex-col gap-2 p-3 rounded-sm border border-gray-200 bg-gray-50 shadow-sm mt-1">
                    {/* Number of Images */}
                    <label className="text-black font-medium">
                      Number of Images:
                      <input
                        type="number"
                        min={1}
                        max={genModel === "dall-e-3" ? 1 : 10}
                        value={genN}
                        onChange={e => setGenN(Number(e.target.value))}
                        disabled={loading}
                        className="ml-2 w-16 px-2 py-1 rounded-sm border border-gray-300"
                      />
                    </label>
                    {/* Size */}
                    <label className="text-black font-medium">
                      Size:
                      <select
                        value={genSize}
                        onChange={e => setGenSize(e.target.value)}
                        disabled={loading}
                        className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                      >
                        {genModel === "gpt-image-1" && (
                          <>
                            <option value="1024x1024">1024x1024</option>
                            <option value="1536x1024">1536x1024 (landscape)</option>
                            <option value="1024x1536">1024x1536 (portrait)</option>
                            <option value="auto">auto</option>
                          </>
                        )}
                        {genModel === "dall-e-2" && (
                          <>
                            <option value="256x256">256x256</option>
                            <option value="512x512">512x512</option>
                            <option value="1024x1024">1024x1024</option>
                          </>
                        )}
                        {genModel === "dall-e-3" && (
                          <>
                            <option value="1024x1024">1024x1024</option>
                            <option value="1792x1024">1792x1024 (landscape)</option>
                            <option value="1024x1792">1024x1792 (portrait)</option>
                          </>
                        )}
                      </select>
                    </label>
                    {/* Quality */}
                    {(genModel === "gpt-image-1" || genModel === "dall-e-3" || genModel === "dall-e-2") && (
                      <label className="text-black font-medium">
                        Quality:
                        <select
                          value={genQuality}
                          onChange={e => setGenQuality(e.target.value)}
                          disabled={loading}
                          className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                        >
                          {genModel === "gpt-image-1" && (
                            <>
                              <option value="auto">auto</option>
                              <option value="high">high</option>
                              <option value="medium">medium</option>
                              <option value="low">low</option>
                            </>
                          )}
                          {genModel === "dall-e-3" && (
                            <>
                              <option value="auto">auto</option>
                              <option value="hd">hd</option>
                              <option value="standard">standard</option>
                            </>
                          )}
                          {genModel === "dall-e-2" && (
                            <>
                              <option value="standard">standard</option>
                            </>
                          )}
                        </select>
                      </label>
                    )}
                    {/* Response Format (dall-e-2, dall-e-3 only) */}
                    {(genModel === "dall-e-2" || genModel === "dall-e-3") && (
                      <label className="text-black font-medium">
                        Response Format:
                        <select
                          value={genResponseFormat}
                          onChange={e => setGenResponseFormat(e.target.value)}
                          disabled={loading}
                          className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                        >
                          <option value="url">url</option>
                          <option value="b64_json">b64_json</option>
                        </select>
                      </label>
                    )}
                    {/* User (optional) */}
                    <label className="text-black font-medium">
                      User (optional):
                      <input
                        type="text"
                        value={genUser}
                        onChange={e => setGenUser(e.target.value)}
                        disabled={loading}
                        className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                        placeholder="user id"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Variation Mode Fields */}
          {mode === "variation" && (
            <div className="flex flex-col md:flex-row gap-2 items-center mb-1">
              <label className="cursor-pointer text-black font-medium">
                Image for Variation:
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleVariationImageUpload}
                  disabled={loading}
                  className="ml-2"
                />
              </label>
              {variationImage && (
                <span className="text-xs text-black ml-2 animate-fade-in">
                  {variationImage.name}
                </span>
              )}
              <label className="text-black font-medium ml-4">
                Number of Variations:
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={variationN}
                  onChange={e => setVariationN(Number(e.target.value))}
                  disabled={loading}
                  className="ml-2 w-16 px-2 py-1 rounded-sm border border-gray-300"
                />
              </label>
              <label className="text-black font-medium ml-4">
                Size:
                <select
                  value={variationSize}
                  onChange={e => setVariationSize(e.target.value)}
                  disabled={loading}
                  className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                >
                  <option value="256x256">256x256</option>
                  <option value="512x512">512x512</option>
                  <option value="1024x1024">1024x1024</option>
                </select>
              </label>
            </div>
          )}
          {/* Image Upload (Edit mode) */}
          {mode === "edit" && (
            <div className="flex flex-col md:flex-row gap-2 items-center mb-1 cursor-pointer">
              <label className="cursor-pointer text-black font-medium">
                Image to Edit:
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                  disabled={loading}
                  className="ml-2"
                />
              </label>
              {uploadedImage && (
                <span className="text-xs text-black ml-2 animate-fade-in">
                  {uploadedImage.name}
                </span>
              )}
              {/* Mask Editor Button */}
              {uploadedImage && (
                <button
                  type="button"
                  className="ml-4 px-3 py-1 rounded-sm bg-gray-100 hover:bg-gray-200 text-black font-medium shadow-sm transition-colors"
                  onClick={() => setShowMaskEditor(true)}
                  disabled={loading}
                >
                  {maskCanvasUrl ? "Edit Mask" : "Draw Mask"}
                </button>
              )}
              {maskCanvasUrl && (
                <span className="text-xs text-black ml-2 animate-fade-in">
                  Mask ready
                </span>
              )}
            </div>
          )}
          {/* Model Selection (Edit mode) */}
          {mode === "edit" && (
            <div className="flex flex-col md:flex-row gap-2 items-center mb-1">
              <label className="text-black font-medium">
                Model:
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  disabled={loading}
                  className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                >
                  <option value="dall-e-2">dall-e-2</option>
                  <option value="gpt-image-1">gpt-image-1</option>
                </select>
              </label>
              {/* Advanced options for gpt-image-1 */}
              {model === "gpt-image-1" && (
                <>
                  <label className="text-black font-medium ml-4">
                    Background:
                    <select
                      value={background}
                      onChange={e => setBackground(e.target.value)}
                      disabled={loading}
                      className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                    >
                      <option value="auto">auto</option>
                      <option value="transparent">transparent</option>
                      <option value="opaque">opaque</option>
                    </select>
                  </label>
                  <label className="text-black font-medium ml-4">
                    Quality:
                    <select
                      value={quality}
                      onChange={e => setQuality(e.target.value)}
                      disabled={loading}
                      className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                    >
                      <option value="auto">auto</option>
                      <option value="high">high</option>
                      <option value="medium">medium</option>
                      <option value="low">low</option>
                    </select>
                  </label>
                  <label className="text-black font-medium ml-4">
                    Size:
                    <select
                      value={size}
                      onChange={e => setSize(e.target.value)}
                      disabled={loading}
                      className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                    >
                      <option value="1024x1024">1024x1024</option>
                      <option value="1536x1024">1536x1024 (landscape)</option>
                      <option value="1024x1536">1024x1536 (portrait)</option>
                      <option value="auto">auto</option>
                    </select>
                  </label>
                </>
              )}
              {/* Size for dall-e-2 */}
              {model === "dall-e-2" && (
                <label className="text-black font-medium ml-4">
                  Size:
                  <select
                    value={size}
                    onChange={e => setSize(e.target.value)}
                    disabled={loading}
                    className="ml-2 px-2 py-1 rounded-sm border border-gray-300"
                  >
                    <option value="256x256">256x256</option>
                    <option value="512x512">512x512</option>
                    <option value="1024x1024">1024x1024</option>
                  </select>
                </label>
              )}
            </div>
          )}
          {/* Form Error */}
          {formError && (
            <div className="text-red-500 text-center animate-fade-in mb-1">{formError}</div>
          )}
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-sm bg-blue-700 hover:bg-blue-800 transition-colors duration-200 shadow-sm text-white font-medium disabled:opacity-60"
              disabled={loading}
            >
              {loading
                ? mode === "edit"
                  ? "Editing..."
                  : "Generating..."
                : mode === "edit"
                  ? "Edit Image"
                  : "Generate Image"}
            </button>
          </div>
        </form>
      </div>

      {/* Mask Editor Modal */}
      {showMaskEditor && uploadedImage && (
        <MaskEditorModal
          imageFile={uploadedImage}
          onClose={() => setShowMaskEditor(false)}
          onSaveMask={(maskUrl, maskFile) => {
            setMaskCanvasUrl(maskUrl);
            setMaskImage(maskFile);
            setShowMaskEditor(false);
          }}
          brush={maskBrush}
          setBrush={setMaskBrush}
          brushSize={maskBrushSize}
          setBrushSize={setMaskBrushSize}
        />
      )}

      {expandedIdx !== null && chat[expandedIdx] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-fast"
          style={{ animation: "fadeInFast 0.25s cubic-bezier(.4,0,.2,1) both" }}
        >
          <div className="relative flex flex-col items-center">
            <button
              className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors shadow"
              onClick={handleCloseExpand}
              title="Close"
              type="button"
              style={{ zIndex: 10 }}
            >
              <X size={28} />
            </button>
            {/* Expanded image logic: support single or multi-image */}
            {Array.isArray(chat[expandedIdx].content) && expandedImageIdx !== null ? (
              <img
                src={chat[expandedIdx].content[expandedImageIdx]}
                alt="Expanded"
                className="rounded-2xl shadow-2xl animate-zoom-in"
                style={{
                  maxWidth: "90vw",
                  maxHeight: "80vh",
                  border: "4px solid #a78bfa",
                  background: "#fff",
                }}
              />
            ) : (
              <img
                src={chat[expandedIdx].content}
                alt="Expanded"
                className="rounded-2xl shadow-2xl animate-zoom-in"
                style={{
                  maxWidth: "90vw",
                  maxHeight: "80vh",
                  border: "4px solid #a78bfa",
                  background: "#fff",
                }}
              />
            )}
          </div>
          <style>
            {`
            @keyframes fadeInFast {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .animate-fade-in-fast {
              animation: fadeInFast 0.25s cubic-bezier(.4,0,.2,1) both;
            }
            @keyframes zoomIn {
              from { transform: scale(0.8); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            .animate-zoom-in {
              animation: zoomIn 0.3s cubic-bezier(.4,0,.2,1) both;
            }
            `}
          </style>
        </div>
      )}
      <style>
        {`
        .chat-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #a78bfa #f5f6ff;
        }
        .chat-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background: #a78bfa;
          border-radius: 8px;
        }
        .chat-scrollbar::-webkit-scrollbar-track {
          background: #f5f6ff;
        }
        .animate-fade-in {
          animation: fadeIn 0.7s cubic-bezier(.4,0,.2,1) both;
        }
        .animate-fade-in-slow {
          animation: fadeIn 1.2s cubic-bezier(.4,0,.2,1) both;
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.5s cubic-bezier(.4,0,.2,1) both;
        }
        .animate-slide-in-right {
          animation: slideInRight 0.5s cubic-bezier(.4,0,.2,1) both;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px);}
          to { opacity: 1; transform: none;}
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px);}
          to { opacity: 1; transform: none;}
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px);}
          to { opacity: 1; transform: none;}
        }
        .loader {
          border: 4px solid #e9d5ff;
          border-top: 4px solid #a78bfa;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
        `}
      </style>
    </div>
  );
}

// MaskEditorModal Component
function MaskEditorModal({
  imageFile,
  onClose,
  onSaveMask,
  brush,
  setBrush,
  brushSize,
  setBrushSize
}) {
  const [img, setImg] = useState(null);
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 });
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    if (!imageFile) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      const image = new window.Image();
      image.onload = function () {
        setImg(image);
        setCanvasDims({ width: image.width, height: image.height });
      };
      image.src = ev.target.result;
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  const lastPoint = useRef(null);
  function getCtx() {
    return canvasRef.current?.getContext("2d");
  }
  function handlePointerDown(e) {
    drawing.current = true;
    lastPoint.current = getPointerPos(e);
    drawAt(e, true);
  }
  function handlePointerMove(e) {
    if (!drawing.current) return;
    drawAt(e, false);
  }
  function handlePointerUp() {
    drawing.current = false;
    lastPoint.current = null;
  }
  function getPointerPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (canvasRef.current.width / rect.width);
    const y = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (canvasRef.current.height / rect.height);
    return { x, y };
  }
  function drawAt(e, isStart) {
    const ctx = getCtx();
    const { x, y } = getPointerPos(e);
    ctx.save();
    ctx.globalCompositeOperation = brush === "brush" ? "source-over" : "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = brush === "brush" ? "rgba(255,0,0,1)" : "rgba(0,0,0,0)";
    ctx.lineWidth = brushSize;
    if (isStart || !lastPoint.current) {
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
      ctx.fillStyle = brush === "brush" ? "rgba(255,0,0,1)" : "rgba(0,0,0,0)";
      ctx.shadowColor = "rgba(255,0,0,0.2)";
      ctx.shadowBlur = brush === "brush" ? 4 : 0;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.restore();
    lastPoint.current = { x, y };
  }
  function handleClear() {
    const ctx = getCtx();
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }
  function handleSave() {
    canvasRef.current.toBlob(
      (blob) => {
        const url = canvasRef.current.toDataURL("image/png");
        const file = new File([blob], "mask.png", { type: "image/png" });
        onSaveMask(url, file);
      },
      "image/png"
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "1.5rem",
          boxShadow: "0 8px 32px rgba(80,0,120,0.18)",
          padding: "2rem",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: 340,
          minHeight: 340,
          maxWidth: "96vw",
          maxHeight: "96vh"
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "#fff",
            borderRadius: "50%",
            border: "none",
            boxShadow: "0 1px 4px #a78bfa33",
            width: 40,
            height: 40,
            cursor: "pointer",
            zIndex: 10
          }}
          title="Close"
        >
          <X size={28} />
        </button>
        <div
          style={{
            marginBottom: 24,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "min(90vw, 600px)",
            height: "min(70vh, 600px)"
          }}
        >
          {img && (
            <>
              <img
                src={img.src}
                alt="To Edit"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: "1rem",
                  boxShadow: "0 2px 12px #a78bfa33",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  zIndex: 1
                }}
              />
              <canvas
                ref={canvasRef}
                width={img.width}
                height={img.height}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                  borderRadius: "1rem",
                  boxShadow: "0 2px 12px #a78bfa33",
                  cursor: brush === "brush" ? "crosshair" : "not-allowed",
                  zIndex: 2,
                  pointerEvents: "auto"
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              />
            </>
          )}
        </div>
        <div className="mask-toolbar" style={{
          marginTop: 8,
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center"
        }}>
          <button
            className={brush === "brush" ? "active" : ""}
            onClick={() => setBrush("brush")}
            type="button"
            style={{
              padding: "0.5rem 1.2rem",
              borderRadius: "0.5rem",
              border: "none",
              background: brush === "brush" ? "#a78bfa" : "#f3e8ff",
              color: brush === "brush" ? "#fff" : "#7c3aed",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Brush
          </button>
          <button
            className={brush === "eraser" ? "active" : ""}
            onClick={() => setBrush("eraser")}
            type="button"
            style={{
              padding: "0.5rem 1.2rem",
              borderRadius: "0.5rem",
              border: "none",
              background: brush === "eraser" ? "#a78bfa" : "#f3e8ff",
              color: brush === "eraser" ? "#fff" : "#7c3aed",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Eraser
          </button>
          <label style={{ color: "#a78bfa", fontWeight: 500 }}>
            Size:
            <input
              type="range"
              min={8}
              max={64}
              value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
              style={{ marginLeft: 8, verticalAlign: "middle" }}
            />
            <span style={{ marginLeft: 4 }}>{brushSize}px</span>
          </label>
          <button
            onClick={handleClear}
            type="button"
            style={{
              padding: "0.5rem 1.2rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#f3e8ff",
              color: "#7c3aed",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Clear
          </button>
          <button
            style={{
              background: "#a78bfa",
              color: "#fff",
              padding: "0.5rem 1.2rem",
              borderRadius: "0.5rem",
              border: "none",
              fontWeight: 600,
              cursor: "pointer"
            }}
            onClick={handleSave}
            type="button"
          >
            Save Mask
          </button>
        </div>
        <div className="text-xs text-purple-400 mt-2" style={{ maxWidth: 400, textAlign: "center" }}>
          <b>How to use:</b> Mark the areas to edit with the brush. Use eraser to remove mask. The mask will be transparent where not marked. Click "Save Mask" when done.
        </div>
      </div>
    </div>
  );
}
