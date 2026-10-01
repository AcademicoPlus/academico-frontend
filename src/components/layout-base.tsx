import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './header'
import MenuLateral from './menu-lateral'

export default function LayoutBase() {
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="h-dvh bg-[#F8F9FA] dark:bg-slate-950 flex flex-col font-sans overflow-hidden">
      <Header onToggleMenu={() => setMenuAberto(!menuAberto)} />

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <MenuLateral isOpen={menuAberto} onClose={() => setMenuAberto(false)} />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}