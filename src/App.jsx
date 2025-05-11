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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chat, setChat] = useState([]);
  const [expandedIdx, setExpandedIdx] = useState(null);
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

  async function handleGenerateImage(e) {
    e.preventDefault();
    setError("");
    if (!input.trim()) {
      setError("Please enter a prompt.");
      return;
    }
    setChat((prev) => [
      ...prev,
      { type: "user", content: input }
    ]);
    setInput("");
    await generateImage(input, false, null);
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
    generateImage(prompt, true, idx);
  }

  function handleExpand(idx) {
    setExpandedIdx(idx);
    document.body.style.overflow = "hidden";
  }

  function handleCloseExpand() {
    setExpandedIdx(null);
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
                      <img
                        src={msg.content}
                        alt="Generated"
                        className="rounded-2xl shadow-lg"
                        style={{ maxWidth: 280, maxHeight: 280 }}
                      />
                    </div>
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
          className="flex items-center bg-white/70 rounded-xl border border-purple-100 px-4 py-2 shadow-inner"
          onSubmit={handleGenerateImage}
        >
          <input
            className="flex-1 bg-transparent outline-none text-purple-700 placeholder-purple-300 text-lg px-2 py-2"
            placeholder="Describe the image you want to create..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="ml-2 p-2 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 transition-colors duration-200 shadow-md disabled:opacity-60"
            disabled={loading}
            tabIndex={-1}
          >
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <path
                d="M3 20l18-8-18-8v7l13 1-13 1v7z"
                fill="#fff"
              />
            </svg>
          </button>
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
