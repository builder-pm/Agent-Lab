import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { GlobalSidebar } from "@/components/GlobalSidebar";
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
            <body
                className={`${spaceGrotesk.variable} ${spaceMono.variable} antialiased flex h-screen w-screen bg-[#0c0c0e] text-foreground`}
            >
                <GlobalSidebar />
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {children}
                </div>
            </body>
        </html>
    );
}