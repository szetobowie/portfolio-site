import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'bowie szeto',
  description: 'Portfolio of Bowie Szeto — strategy, analytics, editorial.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Sans:wght@300;400&family=Noto+Serif+SC:wght@300;400&family=ZCOOL+XiaoWei&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
