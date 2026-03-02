import "./globals.css";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "DYNO Rechner",
  description: "Altersvorsorgedepot Rechner + DYNO bAV Vergleich",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={poppins.className}>
      <body>{children}</body>
    </html>
  );
}
