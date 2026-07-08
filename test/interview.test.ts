import { describe, it, expect } from 'vitest';
import {
  parseAnswers,
  nextQuestion,
  progress,
  buildProfile,
} from '../src/interview/engine';
import { QUESTIONS } from '../src/interview/questions';

// The engine's progression is deterministic and pure, so we can exercise the
// whole adaptive flow without a network or D1.

describe('nextQuestion', () => {
  it('asks business_name first on an empty interview', () => {
    expect(nextQuestion({})?.id).toBe('business_name');
  });

  it('advances past answered required questions', () => {
    const a = { business_name: 'Acme' };
    expect(nextQuestion(a)?.id).toBe('industry');
  });

  it('returns null only once every visible question is answered', () => {
    // Answer every non-skipped question with a plausible value.
    const a: Record<string, unknown> = {
      business_name: 'Acme',
      industry: 'Nonprofit',
      story: 'A real story that is long enough.',
      goals: ['Collect donations'],
      pages: ['Home', 'Contact'],
      has_logo: true,
      contact_email: 'a@b.co',
      tone: 'Warm',
      content_ownership: 'Write it all for me from what I told you',
      donation_url: 'https://give.example.org',
      // optional/free-text left empty is fine
      tagline: '', brand_colors: '', fonts: '',
      current_website: '', facebook_url: '', instagram_url: '', google_business: '',
      contact_phone: '', address: '', hours: '',
    };
    expect(nextQuestion(a)).toBeNull();
  });
});

describe('adaptive skip logic', () => {
  it('skips donation + booking questions until those goals are chosen', () => {
    const base = { goals: ['Share information & build trust'] };
    const withGoals = progress(base).total;
    const withDonation = progress({ goals: ['Collect donations'] }).total;
    expect(withDonation).toBe(withGoals + 1); // donation_url becomes visible
  });

  it('surfaces booking_url once bookings is a goal', () => {
    const a = {
      business_name: 'Acme', industry: 'Health & wellness',
      story: 'Long enough story here.', goals: ['Take bookings or appointments'],
      pages: ['Home', 'Contact'], has_logo: false,
      contact_email: 'a@b.co', tone: 'Professional',
      content_ownership: 'I have most of my copy ready',
      tagline: '', brand_colors: '', fonts: '',
      current_website: '', facebook_url: '', instagram_url: '', google_business: '',
      contact_phone: '', address: '', hours: '',
    };
    expect(nextQuestion(a)?.id).toBe('booking_url');
  });
});

describe('buildProfile', () => {
  it('derives generatePalette from a "generate for me" answer', () => {
    expect(buildProfile({ brand_colors: 'generate a palette for me' }).brand.generatePalette).toBe(true);
    expect(buildProfile({ brand_colors: '#47704C, gold' }).brand.generatePalette).toBe(false);
    expect(buildProfile({}).brand.generatePalette).toBe(true); // empty => generate
  });

  it('falls back to industry default pages when none chosen', () => {
    const p = buildProfile({ industry: 'Restaurant / Cafe' });
    expect(p.pages).toContain('Menu');
  });
});

describe('parseAnswers', () => {
  it('JSON-decodes stored answer rows', () => {
    const a = parseAnswers([
      { question_id: 'goals', value_json: '["a","b"]' },
      { question_id: 'business_name', value_json: '"Acme"' },
    ]);
    expect(a.goals).toEqual(['a', 'b']);
    expect(a.business_name).toBe('Acme');
  });
});

describe('question bank integrity', () => {
  it('has unique question ids', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
