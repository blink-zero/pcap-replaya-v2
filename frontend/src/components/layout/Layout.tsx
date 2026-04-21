import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

export function Layout({ children, topBar }: { children: ReactNode; topBar?: ReactNode }) {
  return (
    <div className="min-h-screen bg-base">
      <Sidebar />
      <div className="lg:pl-60 min-h-screen flex flex-col">
        {topBar}
        <main className="flex-1">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
