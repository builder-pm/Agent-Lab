import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { GlobalSidebar } from "@/components/GlobalSidebar";
import { AuthProvider } from "./_context/AuthContext";
import Script from 'next/script';
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
    variable: "--font-space-grotesk",
    subsets: ["latin"],
});

const spaceMono = Space_Mono({
    variable: "--font-space-mono",
    weight: ["400", "700"],
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Agent Lab Pro",
    description: "Interactive AI Agent Orchestration Platform",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/logo.svg" type="image/svg+xml" />
                <Script
                    src={`https://www.googletagmanager.com/gtag/js?id=G-HVJ3F9PLB6`}
                    strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'G-HVJ3F9PLB6');
                    `}
                </Script>
            </head>
            <body
                className={`${spaceGrotesk.variable} ${spaceMono.variable} antialiased flex h-screen w-screen bg-[#0c0c0e] text-foreground`}
            >
                <AuthProvider>
                    <GlobalSidebar />
                    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                        {children}
                    </div>
                </AuthProvider>
            </body>
        </html>
    );
}