

import React from "react";
import Link from "next/link";
import "./globals.css";

export const metadata = {
    title: "Invox",
    description: "Invoice management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head />
            <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", margin: 0, background: "#ffffff", color: "#0f172a" }}>
                <div style={{ margin: "0 auto", padding: 20 }}>

                    <main style={{ background: "#fff" }}>
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}