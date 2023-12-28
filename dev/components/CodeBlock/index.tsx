import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import xml from 'highlight.js/lib/languages/xml'
import 'highlight.js/styles/github.css'
import type { Component } from 'solid-js'
import { Show, createComputed, createMemo, createSignal, mergeProps, untrack } from 'solid-js'
import copy from 'copy-to-clipboard'
import styles from './code-block.module.css'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('xml', xml)

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

interface Props {
  autodetect?: boolean
  language?: string
  class?: string
  ignoreIllegals?: false
  children: string
}

export const CodeBlock: Component<Props> = (props) => {
  const propsWithDefaults = mergeProps({
    language: '',
    autodetect: true,
    ignoreIllegals: true,
  }, props)

  const [language, setLanguage] = createSignal(propsWithDefaults.language || '')
  const [copying, setCopying] = createSignal(0)

  createComputed(() => {
    setLanguage(propsWithDefaults.language)
  })

  const autodetect = createMemo(() => props.autodetect || !language())
  const cannotDetectLanguage = createMemo(() => !autodetect() && !hljs.getLanguage(language()))

  const className = createMemo(() => {
    if (cannotDetectLanguage())
      return ''

    return `hljs ${language()} ${props.class}`
  })

  const highlightedCode = createMemo(() => {
    if (cannotDetectLanguage())
      return escapeHtml(props.children)

    if (autodetect()) {
      const result = hljs.highlightAuto(props.children)
      untrack(() => {
        setLanguage(result.language ?? '')
      })
      return result.value
    }

    const result = hljs.highlight(props.children, {
      language: language(),
      ignoreIllegals: props.ignoreIllegals,
    })
    return result.value
  })

  const onCopy = () => {
    copy(props.children)
    setCopying(c => c + 1)
    setTimeout(() => {
      setCopying(c => c - 1)
    }, 2000)
  }

  return (
    <div class={styles.outerWrapper}>
      <button class={styles.copyButton} onClick={onCopy} aria-label="Copy code">
        <Show
          when={copying()}
          fallback={
            <div>
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
                shape-rendering="geometricPrecision"
              >
                <path d="M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z" />
              </svg>
            </div>
          }
          >
          <div>
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
              shape-rendering="geometricPrecision"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </Show>
      </button>

      <pre class={styles.wrapper}>
        <div class={`${className()} ${styles.root}`}>
          <div />
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <code innerHTML={highlightedCode()} />
        </div>
      </pre>
    </div>
  )
}
