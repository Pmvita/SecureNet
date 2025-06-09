import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: {},
      asPath: '',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };

// Custom matchers
export const expectToBeInTheDocument = (element: HTMLElement) => {
  expect(element).toBeInTheDocument();
};

export const expectToHaveClass = (element: HTMLElement, className: string) => {
  expect(element).toHaveClass(className);
};

export const expectToHaveAttribute = (
  element: HTMLElement,
  attribute: string,
  value?: string
) => {
  if (value) {
    expect(element).toHaveAttribute(attribute, value);
  } else {
    expect(element).toHaveAttribute(attribute);
  }
};

export const expectToHaveTextContent = (
  element: HTMLElement,
  text: string | RegExp
) => {
  expect(element).toHaveTextContent(text);
};

export const expectToBeVisible = (element: HTMLElement) => {
  expect(element).toBeVisible();
};

export const expectToBeDisabled = (element: HTMLElement) => {
  expect(element).toBeDisabled();
};

export const expectToBeEnabled = (element: HTMLElement) => {
  expect(element).toBeEnabled();
};

export const expectToBeRequired = (element: HTMLElement) => {
  expect(element).toBeRequired();
};

export const expectToBeInvalid = (element: HTMLElement) => {
  expect(element).toBeInvalid();
};

export const expectToBeValid = (element: HTMLElement) => {
  expect(element).toBeValid();
};

export const expectToHaveFocus = (element: HTMLElement) => {
  expect(element).toHaveFocus();
};

export const expectToHaveValue = (
  element: HTMLElement,
  value: string | string[] | number
) => {
  expect(element).toHaveValue(value);
};

export const expectToBeChecked = (element: HTMLElement) => {
  expect(element).toBeChecked();
};

export const expectToBePartiallyChecked = (element: HTMLElement) => {
  expect(element).toBePartiallyChecked();
};

export const expectToBeEmpty = (element: HTMLElement) => {
  expect(element).toBeEmpty();
};

export const expectToContainElement = (
  container: HTMLElement,
  element: HTMLElement
) => {
  expect(container).toContainElement(element);
};

export const expectToContainHTML = (
  container: HTMLElement,
  html: string
) => {
  expect(container).toContainHTML(html);
};

export const expectToHaveStyle = (
  element: HTMLElement,
  style: Record<string, any>
) => {
  expect(element).toHaveStyle(style);
};

export const expectToHaveAccessibleName = (
  element: HTMLElement,
  name: string
) => {
  expect(element).toHaveAccessibleName(name);
};

export const expectToHaveAccessibleDescription = (
  element: HTMLElement,
  description: string
) => {
  expect(element).toHaveAccessibleDescription(description);
};

export const expectToHaveRole = (
  element: HTMLElement,
  role: string,
  options?: Record<string, any>
) => {
  expect(element).toHaveRole(role, options);
}; 