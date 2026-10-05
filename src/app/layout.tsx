import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const display = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PromoTC — Más tarjetas. Más beneficios.",
  description:
    "Descubre las promociones de tus tarjetas de crédito en un solo lugar. Qik, LAFISE, BHD, Scotiabank, Cibao, Santa Cruz y más.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("promotc-theme");var dark=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
