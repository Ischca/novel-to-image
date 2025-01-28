"use client";

import React, { useState, useRef, useMemo } from "react";
import html2canvas from "html2canvas";
import PreviewPage from '@/components/PreviewPage';

/** ---区切りでページ分割 */
function splitPagesByDelimiter(text: string) {
  const lines = text.split("\n");
  const pages: string[] = [];
  let currentLines: string[] = [];

  lines.forEach((line) => {
    if (line.trim() === "---") {
      pages.push(currentLines.join("\n"));
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  });
  if (currentLines.length > 0) {
    pages.push(currentLines.join("\n"));
  }
  return pages;
}

export default function Home() {
  /**
   * メイン画面：タイトル等のフォーム。小プレビューは省略気味でOK
   */
  const [title, setTitle] = useState("作品タイトルを入力してください");
  const [story, setStory] = useState(
    `本文を入力してください。
「---」のみの行がある場合、そこで画像を分割します。
---
“引用符”や"ダブルクォート"は、縦書きではミニュートに変換されます。`
  );
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("vertical");
  const [font, setFont] = useState("'M PLUS 2'");
  const [titleSize, setTitleSize] = useState(14);
  const [bodySize, setBodySize] = useState(14);
  const [lineHeight, setLineHeight] = useState(2.5);
  const [imageWidth, setImageWidth] = useState(600);
  const [imageHeight, setImageHeight] = useState(600);

  // const [tweetText, setTweetText] = useState("小説宣伝です！");
  const [status, setStatus] = useState("");

  // ダイアログ表示
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 詳細設定
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // ストーリー分割
  const storyPages = useMemo(() => splitPagesByDelimiter(story), [story]);

  // 複数ページをスライド式に確認
  const [currentPageIdx, setCurrentPageIdx] = useState(0);

  const finalRef = useRef<HTMLDivElement>(null);

  // パディングの状態を追加
  const [paddingY, setPaddingY] = useState(12);
  const [paddingX, setPaddingX] = useState(12);

  /** モーダルを開く */
  const openModal = () => {
    setCurrentPageIdx(0);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setStatus("");
  };

  /** ダイアログで投稿(キャプチャ) */
  const handleFinalSubmit = async () => {
    if (!finalRef.current) return;
    setStatus("キャプチャ中...");

    const canvas = await html2canvas(finalRef.current);
    const dataURL = canvas.toDataURL("image/png");

    setStatus("サーバー送信中...");
    // 実際には /api/tweetなど
    const resp = await fetch("/api/tweet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        imageBase64: dataURL,
        // tweetText,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json();
      setStatus(`投稿失敗: ${JSON.stringify(err)}`);
      return;
    }
    const json = await resp.json();
    if (json.success) {
      setStatus("投稿成功！");
    } else {
      setStatus(`投稿エラー: ${JSON.stringify(json)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold">Novel Promo Maker: パネル内最大横幅＆縦スクロール</h1>
      </header>

      <main className="flex mx-auto h-lvh w-full p-4 flex-col md:flex-row gap-4">
        {/* 左：入力フォーム */}
        <section className="w-1/3 bg-white text-black p-4 rounded shadow-md max-w-md overflow-y-auto">
          <h2 className="text-lg font-semibold mb-2">入力フォーム</h2>
          <label className="block mt-2 font-bold">作品タイトル</label>
          <input
            className="w-full p-2 border rounded"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="block mt-4 font-bold">本文</label>
          <textarea
            className="w-full p-2 border rounded"
            rows={5}
            value={story}
            onChange={(e) => setStory(e.target.value)}
          />

          {/* 向き */}
          <label className="block mt-4 font-bold">文字の向き</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="orientation"
                value="horizontal"
                checked={orientation === "horizontal"}
                onChange={(_) => {
                  if (orientation !== "horizontal") {
                    setOrientation("horizontal");
                    // パディング入れ替えのロジックを削除
                  }
                }}
              />
              横書き
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="orientation"
                value="vertical"
                checked={orientation === "vertical"}
                onChange={(_) => {
                  if (orientation !== "vertical") {
                    setOrientation("vertical");
                    // パディング入れ替えのロジックを削除
                  }
                }}
              />
              縦書き
            </label>
          </div>

          {/* フォント */}
          <label className="block mt-4 font-bold">フォント</label>
          <select
            className="w-full p-2 border rounded"
            value={font}
            onChange={(e) => setFont(e.target.value)}
          >
            <option value="'M PLUS 2'">M PLUS 2</option>
            <option value="'Zen Maru Gothic'">Zen Maru Gothic</option>
            <option value="'Shippori Mincho'">Shippori Mincho</option>
            <option value="'Yuji Syuku'">Yuji Syuku</option>
            <option value="'Kaisei Tokumin'">Kaisei Tokumin</option>
          </select>

          {/* タイトルサイズ */}
          <label className="block mt-4 font-bold">
            タイトル文字サイズ: <input type="number" value={titleSize} className="w-16 text-right" onChange={(e) => setTitleSize(Number(e.target.value))} />
          </label>
          <input
            type="range"
            className="w-full"
            min={8}
            max={40}
            value={titleSize}
            onChange={(e) => setTitleSize(Number(e.target.value))}
          />

          {/* 本文サイズ */}
          <label className="block mt-4 font-bold">
            本文文字サイズ: <input type="number" value={bodySize} className="w-16 text-right" onChange={(e) => setBodySize(Number(e.target.value))} />
          </label>
          <input
            type="range"
            className="w-full"
            min={8}
            max={40}
            value={bodySize}
            onChange={(e) => setBodySize(Number(e.target.value))}
          />

          {/* 詳細設定 */}
          <button className="mt-4 px-4 py-2 w-full bg-gray-300 rounded hover:bg-gray-400"
            onClick={() => setIsDetailOpen(!isDetailOpen)}
          >
            {isDetailOpen ? "詳細設定 ▲" : "詳細設定 ▼"}
          </button>
          {isDetailOpen && (
            <div className="flex-col gap-4">
              {/* 行間 */}
              <label className="block mt-4 font-bold">
                行間: <input type="number" value={lineHeight} className="w-16 text-right" onChange={(e) => setLineHeight(Number(e.target.value))} />
              </label>
              <input
                type="range"
                className="w-full"
                min={1}
                max={3}
                step={0.1}
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
              />

              {/* 画像幅 */}
              <label className="block mt-4 font-bold">
                画像幅(px): <input type="number" value={imageWidth} className="w-16 text-right" onChange={(e) => setImageWidth(Number(e.target.value))} />
              </label>
              <input
                type="range"
                className="w-full"
                min={100}
                max={1000}
                value={imageWidth}
                onChange={(e) => setImageWidth(Number(e.target.value))}
              />

              {/* 画像高さ */}
              <label className="block mt-4 font-bold">
                画像高さ(px): <input type="number" value={imageHeight} className="w-16 text-right" onChange={(e) => setImageHeight(Number(e.target.value))} />
              </label>
              <input
                type="range"
                className="w-full"
                min={100}
                max={1000}
                value={imageHeight}
                onChange={(e) => setImageHeight(Number(e.target.value))}
              />

              {/* パディング設定 */}
              <label className="block mt-4 font-bold">パディング（上下）: <input type="number" value={paddingY} className="w-16 text-right" onChange={(e) => setPaddingY(Number(e.target.value))} />px</label>
              <input
                type="range"
                className="w-full"
                min={0}
                max={100}
                value={paddingY}
                onChange={(e) => setPaddingY(Number(e.target.value))}
              />

              <label className="block mt-4 font-bold">パディング（左右）: <input type="number" value={paddingX} className="w-16 text-right" onChange={(e) => setPaddingX(Number(e.target.value))} />px</label>
              <input
                type="range"
                className="w-full"
                min={0}
                max={100}
                value={paddingX}
                onChange={(e) => setPaddingX(Number(e.target.value))}
              />
            </div>
          )}

          {/* ボタン */}
          <button
            onClick={openModal}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            確認
          </button>
        </section>

        {/* 右：プレビュー → 横幅いっぱい, 縦スクロール */}
        <section
          className="h-full max-h-full bg-white text-black rounded shadow-md p-4 flex-1"
          style={{
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          <h2 className="text-lg font-semibold mb-2">プレビュー</h2>
          <div className="overflow-auto w-full justify-items-center">
            {storyPages.map((page, idx) => (
              <PreviewPage
                key={idx}
                text={page}
                orientation={orientation}
                font={font}
                titleSize={titleSize}
                bodySize={bodySize}
                lineHeight={lineHeight}
                width={imageWidth}
                height={imageHeight}
                title={title}
                paddingY={paddingY}
                paddingX={paddingX}
                scale={1}
                pageStyle={{}}
              />
            ))}
          </div>
        </section>
      </main>

      {/* ダイアログ(4:3で画面に収める) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto"
          onClick={closeModal}
        >
          <div
            className="bg-white text-black rounded shadow-lg relative flex flex-col gap-2"
            style={{
              width: "90%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 bg-gray-300 px-2 py-1 rounded"
              onClick={() => {
                setIsModalOpen(false);
                setStatus("");
              }}
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mt-2 px-4">最終確認</h2>

            <div className="flex items-center justify-center gap-2 px-4 mt-1">
              <button
                className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
                onClick={() => setCurrentPageIdx((i) => Math.max(0, i - 1))}
                disabled={currentPageIdx === 0}
              >
                Prev
              </button>
              <span>
                Page {currentPageIdx + 1}/{storyPages.length}
              </span>
              <button
                className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
                onClick={() => setCurrentPageIdx((i) => Math.min(storyPages.length - 1, i + 1))}
                disabled={currentPageIdx === storyPages.length - 1}
              >
                Next
              </button>
            </div>

            {/* キャプチャ対象 */}
            <div
              ref={finalRef}
              className="border border-gray-300 justify-items-center w-fit h-fit mx-auto"
              style={{
                position: "relative",
                fontFamily: font,
              }}
            >
              <PreviewPage
                text={storyPages[currentPageIdx]}
                orientation={orientation}
                font={font}
                titleSize={titleSize}
                bodySize={bodySize}
                lineHeight={lineHeight}
                width={imageWidth}
                height={imageHeight}
                title={title}
                paddingY={paddingY}
                paddingX={paddingX}
                scale={1}
                pageStyle={{
                  minHeight: "300px",
                }}
              />
            </div>

            <div className="flex gap-2 justify-end px-4 py-2">
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded"
                onClick={() => {
                  setIsModalOpen(false);
                  setStatus("");
                }}
              >
                キャンセル
              </button>
              <button
                className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={handleFinalSubmit}
              >
                投稿
              </button>
            </div>
            {status && <p className="text-red-500 text-center mb-2">{status}</p>}
          </div>
        </div>
      )}

      <footer className="text-center text-sm text-gray-500 my-2">
        2025 Novel Promo Maker
      </footer>
    </div>
  );
}