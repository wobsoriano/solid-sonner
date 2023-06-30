import { Toaster } from 'solid-sonner'

import { createSignal } from 'solid-js'
import { Hero } from './components/Hero'
import { Types } from './components/Types'
import { ExpandModes } from './components/ExpandModes'
import { Footer } from './components/Footer'
import { Position } from './components/Position'

export default function Home() {
  const [expand, setExpand] = createSignal(false)
  const [position, setPosition] = createSignal<any>('bottom-right')
  const [richColors, setRichColors] = createSignal(false)
  const [closeButton, setCloseButton] = createSignal(false)

  return (
    <>
      <Toaster richColors={richColors()} closeButton={closeButton()} expand={expand()} position={position()} />
      <main class="container">
        <Hero />
        <div class="content">
          <Types />
          <Position position={position()} setPosition={setPosition} />
          <ExpandModes expand={expand()} setExpand={setExpand} />
        </div>
      </main>
      <Footer />
    </>
  )
}
