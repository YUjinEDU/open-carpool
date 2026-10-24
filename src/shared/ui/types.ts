import type { ChangeEvent, CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, ReactNode } from 'react';

/**
 * Attributes the kit forwards to its root element.
 * Declared explicitly (instead of extending React's HTMLAttributes) so the kit type-checks both
 * with and without @types/react installed; the project currently resolves 'react' from its JS build.
 */
export interface DataAriaProps {
  [key: `data-${string}`]: string | number | boolean | undefined;
  [key: `aria-${string}`]: string | number | boolean | undefined;
}

export interface RootProps extends DataAriaProps {
  /** Listed so list rendering type-checks without React's JSX intrinsic attributes. */
  key?: string | number;
  id?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
  role?: string;
  hidden?: boolean;
  tabIndex?: number;
  lang?: string;
}

export interface PressableProps extends RootProps {
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onFocus?: (event: FocusEvent<HTMLButtonElement>) => void;
  onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  name?: string;
  value?: string;
  form?: string;
  autoFocus?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

/** Native attributes shared by Input, TextArea and Select. */
export interface NativeFieldProps<E extends HTMLElement> extends RootProps {
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: ChangeEvent<E>) => void;
  onBlur?: (event: FocusEvent<E>) => void;
  onFocus?: (event: FocusEvent<E>) => void;
  onKeyDown?: (event: KeyboardEvent<E>) => void;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  form?: string;
}

export interface NativeInputProps extends NativeFieldProps<HTMLInputElement> {
  type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'password' | 'search' | 'time' | 'date';
  placeholder?: string;
  /** Match the data: numeric for codes, email for addresses, tel for phones. */
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  autoCapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
  spellCheck?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  list?: string;
}

export interface NativeTextAreaProps extends NativeFieldProps<HTMLTextAreaElement> {
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  minLength?: number;
  spellCheck?: boolean;
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
}

export interface NativeSelectProps extends NativeFieldProps<HTMLSelectElement> {
  multiple?: boolean;
}

export interface NativeCheckboxProps extends RootProps {
  name?: string;
  value?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  form?: string;
}

export type { ReactNode };
