# Card Component

A flexible and customizable card component for displaying content in a structured and visually appealing way.

## Features

- Multiple variants (default, primary, secondary, success, danger, warning, info, ghost, glass, outline, subtle, transparent)
- Customizable padding, border radius, shadow, and border styles
- Interactive states (hover, active, disabled, loading, selected)
- Responsive design
- Accessible (ARIA attributes, keyboard navigation)
- Composable subcomponents (Header, Title, Description, Content, Footer, Image)
- TypeScript support
- Data attributes for testing

## Usage

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardImage,
} from '@/components/common/Card';

// Basic usage
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <button>Action</button>
  </CardFooter>
</Card>

// With image
<Card>
  <CardImage
    src="/path/to/image.jpg"
    alt="Card image"
    aspectRatio="16/9"
    objectFit="cover"
  />
  <CardContent>
    <p>Content below image</p>
  </CardContent>
</Card>

// Interactive card
<Card
  variant="primary"
  interactive
  onClick={() => console.log('Card clicked')}
>
  <CardContent>
    <p>Clickable card</p>
  </CardContent>
</Card>

// Loading state
<Card loading>
  <CardContent>
    <p>Loading content...</p>
  </CardContent>
</Card>

// Disabled state
<Card disabled>
  <CardContent>
    <p>Disabled card</p>
  </CardContent>
</Card>

// Selected state
<Card selected>
  <CardContent>
    <p>Selected card</p>
  </CardContent>
</Card>
```

## Props

### Card

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `'default' \| 'primary' \| 'secondary' \| 'success' \| 'danger' \| 'warning' \| 'info' \| 'ghost' \| 'glass' \| 'outline' \| 'subtle' \| 'transparent'` | `'default'` | The visual style of the card |
| padding | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | The padding size of the card |
| radius | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'` | `'md'` | The border radius of the card |
| shadow | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| 'inner'` | `'md'` | The shadow style of the card |
| border | `'none' \| 'default' \| 'sm' \| 'lg' \| 'xl'` | `'default'` | The border style of the card |
| interactive | `boolean` | `false` | Whether the card is interactive (hoverable) |
| disabled | `boolean` | `false` | Whether the card is disabled |
| loading | `boolean` | `false` | Whether the card is in a loading state |
| selected | `boolean` | `false` | Whether the card is selected |
| fullWidth | `boolean` | `false` | Whether the card should take up the full width of its container |
| className | `string` | `undefined` | Additional CSS classes to apply to the card |
| children | `ReactNode` | Required | The content of the card |

### CardHeader

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| withBorder | `boolean` | `true` | Whether to show a border at the bottom |
| className | `string` | `undefined` | Additional CSS classes to apply to the header |
| children | `ReactNode` | Required | The content of the header |

### CardTitle

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| as | `ElementType` | `'h3'` | The element type to render |
| className | `string` | `undefined` | Additional CSS classes to apply to the title |
| children | `ReactNode` | Required | The content of the title |

### CardDescription

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | `string` | `undefined` | Additional CSS classes to apply to the description |
| children | `ReactNode` | Required | The content of the description |

### CardContent

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| withPadding | `boolean` | `true` | Whether to add padding at the top |
| className | `string` | `undefined` | Additional CSS classes to apply to the content |
| children | `ReactNode` | Required | The content of the card |

### CardFooter

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| withBorder | `boolean` | `true` | Whether to show a border at the top |
| className | `string` | `undefined` | Additional CSS classes to apply to the footer |
| children | `ReactNode` | Required | The content of the footer |

### CardImage

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | `string` | Required | The source URL of the image |
| alt | `string` | Required | The alt text for the image |
| aspectRatio | `'auto' \| '1/1' \| '4/3' \| '16/9' \| '21/9'` | `'16/9'` | The aspect ratio of the image container |
| objectFit | `'cover' \| 'contain' \| 'fill' \| 'none' \| 'scale-down'` | `'cover'` | How the image should fit within its container |
| className | `string` | `undefined` | Additional CSS classes to apply to the image |

## Accessibility

The Card component is built with accessibility in mind:

- Interactive cards are keyboard focusable and can be activated with Enter or Space
- ARIA attributes are automatically applied based on the card's state (disabled, loading, selected)
- Semantic HTML structure with appropriate heading levels
- Proper alt text support for images
- Color contrast meets WCAG guidelines

## Testing

The component includes data attributes for testing:

- `data-testid`: For general testing
- `data-cy`: For Cypress testing
- `data-role`: For role-based testing
- State-specific attributes: `data-variant`, `data-padding`, `data-radius`, `data-shadow`, `data-border`, `data-interactive`, `data-disabled`, `data-loading`, `data-selected`, `data-full-width`

## Styling

The component uses Tailwind CSS for styling and can be customized through:

1. Variant props (variant, padding, radius, shadow, border)
2. className prop for additional custom styles
3. CSS variables for theme customization

## Best Practices

1. Use appropriate heading levels in CardTitle (h1-h6)
2. Always provide alt text for CardImage
3. Use interactive cards for clickable content
4. Consider loading states for async content
5. Use disabled state for unavailable actions
6. Maintain proper contrast ratios for text
7. Keep card content focused and concise
8. Use appropriate padding and spacing
9. Consider mobile responsiveness
10. Test keyboard navigation and screen readers 