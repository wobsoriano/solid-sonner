import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github.css';
import type { Component } from 'solid-js';
import { Show, createEffect, createMemo, createSignal, merge } from 'solid-js';
import copy from 'copy-to-clipboard';
import styles from './code-block.module.css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('xml', xml);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

interface Props {
  autodetect?: boolean;
  language?: string;
  class?: string;
  ignoreIllegals?: false;
  children: string;
}

export const CodeBlock: Component<Props> = (props) => {
  /* eslint-disable solid/reactivity */
  const propsWithDefaults = merge(
    {
      language: '',
      autodetect: true,
      ignoreIllegals: true,
    },
    props,
  );

  const [language, setLanguage] = createSignal(propsWithDefaults.language || '');
  const [copying, setCopying] = createSignal(0);

  createEffect(
    () => propsWithDefaults.language,
    (value) => {
      setLanguage(value);
    },
  );

  const autodetect = createMemo(() => props.autodetect || !language());
  const cannotDetectLanguage = createMemo(() => !autodetect() && !hljs.getLanguage(language()));

  const className = createMemo(() => {
    if (cannotDetectLanguage()) return '';

    return `hljs ${language()} ${props.class}`;
  });

  // Solid 2 rejects writes inside an owned computation, even under untrack, so
  // the detected language is published from an effect rather than the memo.
  const highlighted = createMemo(() => {
    if (cannotDetectLanguage())
      return { value: escapeHtml(props.children), language: undefined as string | undefined };

    if (autodetect()) return hljs.highlightAuto(props.children);

    return hljs.highlight(props.children, {
      language: language(),
      ignoreIllegals: props.ignoreIllegals,
    });
  });

  createEffect(
    () => highlighted().language,
    (detected) => {
      if (detected !== undefined) setLanguage(detected);
    },
  );

  const highlightedCode = () => highlighted().value;

  const onCopy = () => {
    copy(props.children).then(
      (copied) => {
        if (!copied) return;

        setCopying((c) => c + 1);
        setTimeout(() => {
          setCopying((c) => c - 1);
        }, 2000);
      },
      (error) => {
        console.error(error);
      },
    );
  };

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
  );
};
