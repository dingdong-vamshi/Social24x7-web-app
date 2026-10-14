import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AvailableMedia, SocialAvatar } from '../features/social/AvailableMedia';

describe('unavailable legacy media', () => {
  it('replaces broken images without inventing replacement content', () => {
    const view = render(<AvailableMedia src="/missing.jpg" alt="Post attachment" />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('status')).toHaveTextContent('currently unavailable');
    expect(screen.queryByRole('img')).toBeNull();
    view.rerender(<AvailableMedia src="/restored.jpg" alt="Post attachment" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/restored.jpg');
  });
  it('handles video download/playback failures and retains native controls', () => {
    render(<AvailableMedia src="/clip.mp4" alt="Post video" video />);
    const video = screen.getByLabelText('Post video');
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('playsinline');
    fireEvent.error(video);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  it('does not render empty media sources', () => {
    render(<AvailableMedia src="" alt="Story" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  it('uses a named initial when an avatar URL expires or fails', () => {
    render(<SocialAvatar src="/expired.jpg" name="QA Member" />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByLabelText('QA Member')).toHaveTextContent('Q');
    expect(screen.queryByRole('img')).toBeNull();
  });
});
