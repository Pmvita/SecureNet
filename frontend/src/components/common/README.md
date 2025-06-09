# Common Components

This directory contains reusable UI components used throughout the SecureNet application. Each component is:
- Fully typed with TypeScript
- Documented with Storybook
- Tested with Jest and React Testing Library
- Styled with CSS-in-JS
- Accessible (WCAG 2.1 compliant)

## Component Structure

Each component follows this structure:
```
ComponentName/
├── ComponentName.tsx        # Main component
├── ComponentName.test.tsx   # Unit tests
├── ComponentName.stories.tsx # Storybook stories
├── ComponentName.types.ts   # Type definitions
└── index.ts                # Exports
```

## Available Components

### Form Components
- `Input` - Text input field with validation
- `Select` - Dropdown select with search and multi-select
- `Switch` - Toggle switch component
- `Checkbox` - Checkbox input
- `Radio` - Radio button group
- `Form` - Form wrapper with validation

### Feedback Components
- `Alert` - Alert messages with variants
- `Toast` - Toast notifications
- `Progress` - Progress bar
- `LoadingSpinner` - Loading indicator
- `Badge` - Status badges

### Layout Components
- `Card` - Card container
- `Modal` - Modal dialog
- `Dropdown` - Dropdown menu
- `Tabs` - Tabbed interface
- `Table` - Data table
- `Tooltip` - Tooltip component

### Navigation Components
- `Button` - Button component
- `Link` - Navigation link
- `Breadcrumbs` - Breadcrumb navigation
- `Pagination` - Pagination controls

## Usage

Import components using the `@` alias:

```typescript
import { Button, Card, Input } from '@/components/common';
```

## Development

### Adding a New Component

1. Create a new directory in `components/common/`
2. Follow the component structure above
3. Add types in `ComponentName.types.ts`
4. Add tests in `ComponentName.test.tsx`
5. Add stories in `ComponentName.stories.tsx`
6. Export in `index.ts`

### Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

### Storybook

Run Storybook:
```bash
npm run storybook
```

Build Storybook:
```bash
npm run build-storybook
```

## Best Practices

1. **TypeScript**
   - Use proper types for all props
   - Export types for component consumers
   - Use discriminated unions for variants

2. **Accessibility**
   - Include proper ARIA attributes
   - Support keyboard navigation
   - Follow WCAG 2.1 guidelines

3. **Styling**
   - Use CSS-in-JS for scoped styles
   - Support theming via CSS variables
   - Follow design system tokens

4. **Testing**
   - Test component rendering
   - Test user interactions
   - Test accessibility
   - Test edge cases

5. **Documentation**
   - Document all props
   - Include usage examples
   - Add accessibility notes
   - Document variants 