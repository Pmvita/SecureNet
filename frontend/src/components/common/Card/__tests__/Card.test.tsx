import { render, screen, fireEvent } from '@/test-utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardImage,
} from '../';

describe('Card', () => {
  it('renders with default props', () => {
    render(
      <Card data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-card', 'text-card-foreground');
    expect(card).toHaveClass('p-6'); // default padding
    expect(card).toHaveClass('rounded-md'); // default radius
    expect(card).toHaveClass('shadow-md'); // default shadow
    expect(card).toHaveClass('border', 'border-border'); // default border
  });

  it('renders with custom variant', () => {
    render(
      <Card variant="primary" data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('renders with custom padding', () => {
    render(
      <Card padding="lg" data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('p-8');
  });

  it('renders with custom radius', () => {
    render(
      <Card radius="xl" data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('rounded-xl');
  });

  it('renders with custom shadow', () => {
    render(
      <Card shadow="lg" data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('shadow-lg');
  });

  it('renders with custom border', () => {
    render(
      <Card border="lg" data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('border-2', 'border-border');
  });

  it('renders as interactive', () => {
    const handleClick = jest.fn();
    render(
      <Card interactive onClick={handleClick} data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('cursor-pointer');
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabIndex', '0');

    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as disabled', () => {
    render(
      <Card disabled data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
    expect(card).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders as loading', () => {
    render(
      <Card loading data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('animate-pulse');
    expect(card).toHaveAttribute('aria-busy', 'true');
  });

  it('renders as selected', () => {
    render(
      <Card selected data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('ring-2', 'ring-primary', 'ring-offset-2');
    expect(card).toHaveAttribute('aria-selected', 'true');
  });

  it('renders as full width', () => {
    render(
      <Card fullWidth data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('w-full');
  });

  describe('CardHeader', () => {
    it('renders with border by default', () => {
      render(
        <Card>
          <CardHeader data-testid="header">
            <CardTitle>Title</CardTitle>
          </CardHeader>
        </Card>
      );

      const header = screen.getByTestId('header');
      expect(header).toHaveClass('border-b', 'border-border', 'pb-4');
    });

    it('renders without border when specified', () => {
      render(
        <Card>
          <CardHeader withBorder={false} data-testid="header">
            <CardTitle>Title</CardTitle>
          </CardHeader>
        </Card>
      );

      const header = screen.getByTestId('header');
      expect(header).not.toHaveClass('border-b', 'border-border', 'pb-4');
    });
  });

  describe('CardTitle', () => {
    it('renders as h3 by default', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle data-testid="title">Title</CardTitle>
          </CardHeader>
        </Card>
      );

      const title = screen.getByTestId('title');
      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass('text-lg', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    it('renders as custom element when specified', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle as="h1" data-testid="title">Title</CardTitle>
          </CardHeader>
        </Card>
      );

      const title = screen.getByTestId('title');
      expect(title.tagName).toBe('H1');
    });
  });

  describe('CardDescription', () => {
    it('renders with correct styles', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription data-testid="description">Description</CardDescription>
          </CardHeader>
        </Card>
      );

      const description = screen.getByTestId('description');
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });
  });

  describe('CardContent', () => {
    it('renders with padding by default', () => {
      render(
        <Card>
          <CardContent data-testid="content">Content</CardContent>
        </Card>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('pt-6');
    });

    it('renders without padding when specified', () => {
      render(
        <Card>
          <CardContent withPadding={false} data-testid="content">Content</CardContent>
        </Card>
      );

      const content = screen.getByTestId('content');
      expect(content).not.toHaveClass('pt-6');
    });
  });

  describe('CardFooter', () => {
    it('renders with border by default', () => {
      render(
        <Card>
          <CardFooter data-testid="footer">Footer</CardFooter>
        </Card>
      );

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('border-t', 'border-border', 'pt-4');
    });

    it('renders without border when specified', () => {
      render(
        <Card>
          <CardFooter withBorder={false} data-testid="footer">Footer</CardFooter>
        </Card>
      );

      const footer = screen.getByTestId('footer');
      expect(footer).not.toHaveClass('border-t', 'border-border', 'pt-4');
    });
  });

  describe('CardImage', () => {
    it('renders with default aspect ratio and object fit', () => {
      render(
        <Card>
          <CardImage
            src="/test.jpg"
            alt="Test image"
            data-testid="image"
          />
        </Card>
      );

      const image = screen.getByTestId('image');
      const container = image.parentElement;
      expect(container).toHaveClass('aspect-video'); // default aspect ratio
      expect(image).toHaveClass('object-cover'); // default object fit
    });

    it('renders with custom aspect ratio and object fit', () => {
      render(
        <Card>
          <CardImage
            src="/test.jpg"
            alt="Test image"
            aspectRatio="1/1"
            objectFit="contain"
            data-testid="image"
          />
        </Card>
      );

      const image = screen.getByTestId('image');
      const container = image.parentElement;
      expect(container).toHaveClass('aspect-square');
      expect(image).toHaveClass('object-contain');
    });
  });
}); 