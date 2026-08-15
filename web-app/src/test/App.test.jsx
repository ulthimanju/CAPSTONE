import { describe, it, expect } from 'vitest';
import React from 'react';
import App from '../App';
import { renderWithProviders } from './utils';

describe('App Root', () => {
  it('renders app routes without crashing', () => {
    const { container } = renderWithProviders(<App />);
    expect(container).toBeDefined();
  });
});
