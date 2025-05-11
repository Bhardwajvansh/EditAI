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
  // New state for mode, uploads, model, and options
  const [mode, setMode] = useState("generate"); // "generate" | "edit" | "variation"
  const [input, setInput] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null); // For edit
  const [maskImage, setMaskImage] = useState(null); // For edit
  const [model, setModel] = useState("dall-e-2"); // For edit
  const [background, setBackground] = useState("auto"); // For edit (gpt-image-1)
  const [quality, setQuality] = useState("auto"); // For edit (gpt-image-1)
  const [size, setSize] = useState("1024x1024"); // For edit/generate
  const [formError, setFormError] = useState("");
  // Variation mode state
  const [variationImage, setVariationImage] = useState(null); // File for variation
  const [variationN, setVariationN] = useState(1); // Number of variations
  const [variationSize, setVariationSize] = useState("1024x1024"); // Size for variation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chat, setChat] = useState([]);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [expandedImageIdx, setExpandedImageIdx] = useState(null); // For multi-image expand
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
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          n: 1,
          size: "1024x1024",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to generate image");
      }
      const data = await res.json();
      console.log(data);

      const b64 = data.data?.[0]?.b64_json;
      if (b64) {
        const imageUrl = `data:image/png;base64,${b64}`;
        if (isRegenerate && imageIdx !== null) {
          setChat((prev) => {
            const updated = [...prev];
            updated[imageIdx] = { type: "image", content: imageUrl, prompt };
            return updated;
          });
        } else {
          setChat((prev) => [
            ...prev,
            { type: "image", content: imageUrl, prompt }
          ]);
        }
      } else {
        setError("No image returned.");
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
      <div className="w-full min-h-screen max-w-7xl bg-white/80 rounded-3xl shadow-xl p-8 flex flex-col">
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 mb-2 animate-fade-in">
            EditAI
          </h1>
          <p className="text-lg text-purple-400 animate-fade-in-slow">
            Describe an image or select a tool. Your prompts appear on the right, images on the left.
          </p>
        </div>

        <div className="flex-1 flex flex-col mb-4">
          <div
            className={`flex-1 overflow-y-auto rounded-xl bg-white/60 border border-purple-100 shadow-inner px-4 py-4 chat-scrollbar ${expandedIdx !== null ? "blur-sm pointer-events-none select-none" : ""}`}
            style={{ minHeight: 320, maxHeight: 420 }}
          >
            {chat.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
                {topics.map((topic, idx) => (
                  <div
                    key={topic.title}
                    className="bg-gradient-to-br from-[#f5f6ff] to-[#fbefff] rounded-xl shadow-md p-6 transition-transform duration-300 hover:scale-105 hover:shadow-lg border border-transparent hover:border-purple-200 animate-fade-in"
                    style={{ animationDelay: `${idx * 80}ms` }}
                    onClick={() => setInput(topic.desc)}
                  >
                    <div className="font-semibold text-lg text-purple-700 mb-1">{topic.title}</div>
                    <div className="text-purple-400">{topic.desc}</div>
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
                                className="rounded-2xl shadow-lg"
                                style={{ maxWidth: 140, maxHeight: 140 }}
                              />
                              <div className="flex gap-1 mt-1">
                                <button
                                  className="flex items-center justify-center p-1 rounded-lg bg-purple-100 hover:bg-purple-200 transition-colors text-purple-700 shadow"
                                  onClick={() => handleDownload(imgUrl)}
                                  title="Download"
                                  type="button"
                                  style={{ width: 28, height: 28 }}
                                >
                                  <Download size={16} />
                                </button>
                                <button
                                  className="flex items-center justify-center p-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 shadow"
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
                          className="rounded-2xl shadow-lg"
                          style={{ maxWidth: 280, maxHeight: 280 }}
                        />
                      )}
                    </div>
                    {/* Download/Regenerate/Expand for single image only */}
                    {!Array.isArray(msg.content) && (
                      <div className="flex gap-2 mt-1 ml-10">
                        <button
                          className="flex items-center justify-center p-2 rounded-lg bg-purple-100 hover:bg-purple-200 transition-colors text-purple-700 shadow"
                          onClick={() => handleDownload(msg.content)}
                          title="Download"
                          type="button"
                          style={{ width: 36, height: 36 }}
                        >
                          <Download size={20} />
                        </button>
                        <button
                          className="flex items-center justify-center p-2 rounded-lg bg-pink-100 hover:bg-pink-200 transition-colors text-pink-700 shadow"
                          onClick={() => handleRegenerate(msg.prompt, idx)}
                          title="Regenerate"
                          type="button"
                          disabled={loading}
                          style={{ width: 36, height: 36 }}
                        >
                          <RefreshCw size={20} />
                        </button>
                        <button
                          className="flex items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 shadow"
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
                    <div className="bg-gradient-to-br from-purple-400 to-pink-400 text-white px-4 py-2 rounded-xl shadow-md max-w-xs text-right break-words">
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
                  <div className="text-purple-400">Generating image...</div>
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
          className="flex flex-col gap-2 bg-white/70 rounded-xl border border-purple-100 px-4 py-2 shadow-inner"
          onSubmit={handleFormSubmit}
        >
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              className={`px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 ${
                mode === "generate"
                  ? "bg-gradient-to-br from-purple-400 to-pink-400 text-white"
                  : "bg-white border border-purple-200 text-purple-500"
              }`}
              onClick={() => handleModeChange("generate")}
              disabled={loading}
            >
              Generate
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 ${
                mode === "edit"
                  ? "bg-gradient-to-br from-pink-400 to-purple-400 text-white"
                  : "bg-white border border-pink-200 text-pink-500"
              }`}
              onClick={() => handleModeChange("edit")}
              disabled={loading}
            >
              Edit
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 ${
                mode === "variation"
                  ? "bg-gradient-to-br from-yellow-400 to-pink-400 text-white"
                  : "bg-white border border-yellow-200 text-yellow-600"
              }`}
              onClick={() => handleModeChange("variation")}
              disabled={loading}
            >
              Variation
            </button>
          </div>
          {/* Prompt Input (not for variation) */}
          {mode !== "variation" && (
            <input
              className="flex-1 bg-transparent outline-none text-purple-700 placeholder-purple-300 text-lg px-2 py-2 mb-1"
              placeholder={
                mode === "generate"
                  ? "Describe the image you want to create..."
                  : "Describe how you want to edit the image..."
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
          )}
          {/* Variation Mode Fields */}
          {mode === "variation" && (
            <div className="flex flex-col md:flex-row gap-2 items-center mb-1">
              <label className="text-yellow-600 font-medium">
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
                <span className="text-xs text-green-600 ml-2 animate-fade-in">
                  {variationImage.name}
                </span>
              )}
              <label className="text-yellow-600 font-medium ml-4">
                Number of Variations:
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={variationN}
                  onChange={e => setVariationN(Number(e.target.value))}
                  disabled={loading}
                  className="ml-2 w-16 px-2 py-1 rounded border border-yellow-200"
                />
              </label>
              <label className="text-yellow-600 font-medium ml-4">
                Size:
                <select
                  value={variationSize}
                  onChange={e => setVariationSize(e.target.value)}
                  disabled={loading}
                  className="ml-2 px-2 py-1 rounded border border-yellow-200"
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
            <div className="flex flex-col md:flex-row gap-2 items-center mb-1">
              <label className="text-purple-500 font-medium">
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
                <span className="text-xs text-green-600 ml-2 animate-fade-in">
                  {uploadedImage.name}
                </span>
              )}
              <label className="text-pink-500 font-medium ml-4">
                Mask (optional):
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleMaskUpload}
                  disabled={loading}
                  className="ml-2"
                />
              </label>
              {maskImage && (
                <span className="text-xs text-green-600 ml-2 animate-fade-in">
                  {maskImage.name}
                </span>
              )}
            </div>
          )}
          {/* Model Selection (Edit mode) */}
          {mode === "edit" && (
            <div className="flex flex-col md:flex-row gap-2 items-center mb-1">
              <label className="text-purple-500 font-medium">
                Model:
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  disabled={loading}
                  className="ml-2 px-2 py-1 rounded border border-purple-200"
                >
                  <option value="dall-e-2">dall-e-2</option>
                  <option value="gpt-image-1">gpt-image-1</option>
                </select>
              </label>
              {/* Advanced options for gpt-image-1 */}
              {model === "gpt-image-1" && (
                <>
                  <label className="text-purple-500 font-medium ml-4">
                    Background:
                    <select
                      value={background}
                      onChange={e => setBackground(e.target.value)}
                      disabled={loading}
                      className="ml-2 px-2 py-1 rounded border border-purple-200"
                    >
                      <option value="auto">auto</option>
                      <option value="transparent">transparent</option>
                      <option value="opaque">opaque</option>
                    </select>
                  </label>
                  <label className="text-purple-500 font-medium ml-4">
                    Quality:
                    <select
                      value={quality}
                      onChange={e => setQuality(e.target.value)}
                      disabled={loading}
                      className="ml-2 px-2 py-1 rounded border border-purple-200"
                    >
                      <option value="auto">auto</option>
                      <option value="high">high</option>
                      <option value="medium">medium</option>
                      <option value="low">low</option>
                    </select>
                  </label>
                  <label className="text-purple-500 font-medium ml-4">
                    Size:
                    <select
                      value={size}
                      onChange={e => setSize(e.target.value)}
                      disabled={loading}
                      className="ml-2 px-2 py-1 rounded border border-purple-200"
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
                <label className="text-purple-500 font-medium ml-4">
                  Size:
                  <select
                    value={size}
                    onChange={e => setSize(e.target.value)}
                    disabled={loading}
                    className="ml-2 px-2 py-1 rounded border border-purple-200"
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
              className="px-4 py-2 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 transition-colors duration-200 shadow-md text-white font-semibold disabled:opacity-60"
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
