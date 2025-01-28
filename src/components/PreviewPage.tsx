import React from "react";

/** 
 * PreviewPageコンポーネント: 
 * - 単一ページを表示します 
 * - 画像サイズを設定可能
 */
interface PreviewPageProps {
    text: string;
    orientation: "horizontal" | "vertical";
    font: string;
    titleSize: number;
    bodySize: number;
    lineHeight: number;
    width: number;  // 画像の幅
    height: number; // 画像の高さ
    title: string;
    scale?: number; // 1 (実寸), 2 (拡大) etc
    containerStyle?: React.CSSProperties; // 右パネルorダイアログで切り替え用
    pageStyle?: React.CSSProperties;      // ページのCSSなど
    paddingY?: number;
    paddingX?: number;
}

function PreviewPage({
    text,
    orientation,
    font,
    titleSize,
    bodySize,
    lineHeight,
    width,
    height,
    title,
    scale = 1,
    containerStyle,
    pageStyle,
    paddingY = 0,
    paddingX = 0,
}: PreviewPageProps) {
    // 縦書きの場合の引用符変換
    const displayedText =
        orientation === "vertical" ? transformQuotesForVertical(text) : text;

    return (
        <div
            className="relative border border-gray-300 flex items-center justify-center"
            style={{
                backgroundColor: "#fff",
                fontFamily: font,
                width: `${width}px`,
                height: `${height}px`,
                ...containerStyle,
            }}
        >
            {/* タイトルを絶対配置 */}
            <h1
                className="absolute font-bold"
                style={{
                    fontSize: `${titleSize}px`,
                    bottom: 8,
                    right: 8,
                }}
            >
                {title}
            </h1>

            {/* コンテンツ */}
            <div
                style={{
                    overflow: "hidden",
                    writingMode:
                        orientation === "vertical" ? "vertical-rl" : "horizontal-tb",
                    textOrientation: orientation === "vertical" ? "upright" : "mixed",
                    lineHeight,
                    whiteSpace: "pre-wrap",
                    fontSize: `${bodySize}px`,
                    boxSizing: "border-box",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "start",
                    paddingTop: `${paddingY}px`,
                    paddingBottom: `${paddingY}px`,
                    paddingLeft: `${paddingX}px`,
                    paddingRight: `${paddingX}px`,
                }}
            >
                <p key={displayedText.length}>
                    {renderTextWithCustomFont(displayedText)}
                </p>
            </div>
        </div>
    );
}

export default PreviewPage;

/** 縦書きの場合のみクォート記号を変換 */
function transformQuotesForVertical(text: string) {
    return text
        .replace(/“/g, "〝")
        .replace(/”/g, "〟")
        .replace(/"(.*?)"/gs, (_, p1) => {
            return `〝${p1}〟`;
        });
}

function renderTextWithCustomFont(text: string) {
    const parts = text.split(/(――|……)/g);
    return parts.map((part, index) => {
        const key = `${part}-${index}`;
        if (part === '――' || part === '……') {
            return <span key={key} style={{ fontFamily: "'Shippori Mincho'" }}>{part}</span>;
        }
        return <span key={key}>{part}</span>;
    });
}
