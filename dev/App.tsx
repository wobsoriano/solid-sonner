import { createSignal } from 'solid-js'
import { Toaster } from 'src/'

import { Hero } from './components/Hero'
import { Types } from './components/Types'
import { ExpandModes } from './components/ExpandModes'
import { Footer } from './components/Footer'
import { Position } from './components/Position'
import { Installation } from './components/Installation'
import { Usage } from './components/Usage'
import { Other } from './components/Other'

export default function Home() {
  const [expand, setExpand] = createSignal(false)
  const [position, setPosition] = createSignal<'bottom-right' | 'top-left' | 'top-right' | 'bottom-left' | 'top-center' | 'bottom-center'>('bottom-right')
  const [richColors, setRichColors] = createSignal(false)
  const [closeButton, setCloseButton] = createSignal(false)

  return (
    <>
      <Toaster
        offset={32}
        richColors={richColors()}
        closeButton={closeButton()}
        expand={expand()}
        position={position()}
      />

      <main class="container">
        <Hero />
        <div class="content">
          <Installation />
          <Usage />
          <Types />
          <Position position={position()} setPosition={setPosition} />
          <ExpandModes expand={expand()} setExpand={setExpand} />
          <Other setCloseButton={setCloseButton} setRichColors={setRichColors} />
        </div>
      </main>
      <Footer />
    </>
  )
}
