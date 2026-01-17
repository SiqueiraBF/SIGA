import { render, screen } from '@testing-library/react';
import { Loading } from '../components/Loading';
import { describe, it, expect } from 'vitest';

describe('Loading Component', () => {
  it('renders default message correctly', () => {
    render(<Loading />);
    const messageElement = screen.getByText(/carregando.../i);
    expect(messageElement).toBeInTheDocument();
  });

  it('renders custom message correctly', () => {
    const customMessage = 'Aguarde um momento';
    render(<Loading message={customMessage} />);
    const messageElement = screen.getByText(customMessage);
    expect(messageElement).toBeInTheDocument();
  });

  it('has animation classes', () => {
    const { container } = render(<Loading />);
    // Query by specific selector if needed, or check classes roughly
    // The spinner usually has 'animate-spin'
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
