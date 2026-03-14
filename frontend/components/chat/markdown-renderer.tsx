"use client";

import React, { useState } from "react";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Download, X } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CustomImage({ src, alt }: { src?: string; alt?: string }) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!src) return;
      
      const response = await fetch(src);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Failed to download image", err);
      window.open(src, "_blank");
    }
  };

  return (
    <span className="relative group inline-block my-4">
      <PhotoView src={src}>
        <img
          src={src}
          alt={alt || "Generated Image"}
          className="max-w-full h-auto rounded-xl shadow-sm border border-border/50 cursor-pointer transition-opacity group-hover:opacity-90 align-middle"
          loading="lazy"
        />
      </PhotoView>
      <button
        onClick={handleDownload}
        className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
        title="Download image"
      >
        <Download className="w-4 h-4" />
      </button>
    </span>
  );
}

const MemoizedCodeBlock = React.memo(
  ({ className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const codeString = String(children).replace(/\n$/, "");

    if (match) {
      return (
        <div className="not-prose my-3 rounded-xl overflow-hidden border border-border/30 bg-[#282c34]">
          <div className="flex items-center justify-between px-4 py-2 bg-[#21252b] border-b border-border/20">
            <span className="text-xs font-mono text-muted-foreground">{match[1]}</span>
            <CopyButton text={codeString} />
          </div>
          <SyntaxHighlighter
            style={oneDark}
            language={match[1]}
            PreTag="div"
            customStyle={{
              margin: 0,
              padding: "1rem",
              background: "transparent",
              fontSize: "0.8rem",
              lineHeight: "1.5",
            }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    }

    if (!children || String(children).trim() === "") return null;
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-muted text-sm font-mono text-foreground" {...props}>
        {children}
      </code>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.children === nextProps.children && prevProps.className === nextProps.className;
  }
);

const remarkPluginsList = [remarkGfm];

const markdownComponents: any = {
  img({ src, alt }: any) {
    return <CustomImage src={typeof src === "string" ? src : undefined} alt={alt} />;
  },
  code: MemoizedCodeBlock,
  p({ children }: any) {
    return <p className="mb-3 last:mb-0 leading-7">{children}</p>;
  },
  h1({ children }: any) {
    return <h1 className="text-xl font-bold mt-5 mb-3">{children}</h1>;
  },
  h2({ children }: any) {
    return <h2 className="text-lg font-semibold mt-4 mb-2">{children}</h2>;
  },
  h3({ children }: any) {
    return <h3 className="text-base font-semibold mt-3 mb-2">{children}</h3>;
  },
  ul({ children }: any) {
    return <ul className="list-disc list-inside space-y-1 mb-3 ml-1">{children}</ul>;
  },
  ol({ children }: any) {
    return <ol className="list-decimal list-inside space-y-1 mb-3 ml-1">{children}</ol>;
  },
  li({ children }: any) {
    return <li className="leading-7">{children}</li>;
  },
  blockquote({ children }: any) {
    return (
      <blockquote className="border-l-3 border-primary/40 pl-4 my-3 italic text-muted-foreground">
        {children}
      </blockquote>
    );
  },
  a({ href, children }: any) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
        {children}
      </a>
    );
  },
  strong({ children }: any) {
    return <strong className="font-semibold text-foreground">{children}</strong>;
  },
  em({ children }: any) {
    return <em className="italic">{children}</em>;
  },
  hr() {
    return <hr className="my-4 border-border/50" />;
  },
  table({ children }: any) {
    return (
      <div className="my-3 overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-sm">{children}</table>
      </div>
    );
  },
  thead({ children }: any) {
    return <thead className="bg-muted/50 border-b border-border/50">{children}</thead>;
  },
  th({ children }: any) {
    return <th className="px-3 py-2 text-left font-medium">{children}</th>;
  },
  td({ children }: any) {
    return <td className="px-3 py-2 border-t border-border/30">{children}</td>;
  },
};

export const MarkdownRenderer = React.memo(({ content }: MarkdownRendererProps) => {
  const handleDownloadGlobal = async (src: string) => {
    try {
      if (!src) return;
      const response = await fetch(src);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Failed to download image", err);
      window.open(src, "_blank");
    }
  };

  return (
    <PhotoProvider
      maskOpacity={0.95}
      toolbarRender={({ index, images }: any) => {
        const currentImage = images[index];
        return (
          <div className="flex gap-4 mr-4 items-center">
            <button
              onClick={() => handleDownloadGlobal(currentImage?.src || "")}
              className="text-white/80 hover:text-white transition-colors"
              title="Download image"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        );
      }}
    >
      <div className="prose-chat">
        <ReactMarkdown
        
          remarkPlugins={remarkPluginsList}
          urlTransform={(value) => value}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    </PhotoProvider>
  );
});
