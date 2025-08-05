import { ReactNode } from 'react'

export default function App({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {children}
    </div>
  )
}
