import "./globals.css";

export const metadata = {
  title: "kaji-wbs",
  description: "夫婦が「今日やること」を同じ画面で見て、やったら記録され、忘れそうなものがLINEに届く",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
